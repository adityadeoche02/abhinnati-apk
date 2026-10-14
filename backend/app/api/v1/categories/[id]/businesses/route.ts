import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryIdOrSlug } = await params;
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('area_id');

    // 1. Resolve category by ID or slug
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: categoryIdOrSlug }, { slug: categoryIdOrSlug }],
        isActive: true,
        deletedAt: null,
      },
      include: {
        subCategories: { where: { isActive: true, deletedAt: null } },
      },
    });

    // 2. Fetch approved vendors
    const vendorsDb = await prisma.vendor.findMany({
      where: {
        kycStatus: 'approved',
        deletedAt: null,
      },
      include: {
        business: {
          include: {
            services: { where: { isActive: true, deletedAt: null } },
            reviews: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
            locations: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let mapped = vendorsDb.map((v) => {
      const b = v.business;
      const loc = b?.locations?.[0];

      return {
        id: v.id,
        userId: v.userId,
        businessNameMr: b?.nameMr || 'नवीन व्यवसाय',
        businessNameEn: b?.nameEn || 'New Business',
        categorySlug: category?.slug || categoryIdOrSlug,
        categoryNameMr: category?.nameMr || 'स्थानिक सेवा',
        categoryNameEn: category?.nameEn || 'Local Service',
        descriptionMr: b?.descriptionMr || '',
        descriptionEn: b?.descriptionEn || '',
        latitude: loc?.latitude || 19.0596,
        longitude: loc?.longitude || 72.8295,
        areaId: loc?.area || 'area-bandra',
        kycStatus: v.kycStatus,
        kycDocsUrl: v.kycDocsUrl,
        isFullyBooked: b?.vacationMode || v.vacationMode || false,
        ratingAvg: b?.ratingAvg || v.ratingAvg || 4.5,
        reviewsCount: b?.reviewsCount || v.reviewsCount || 0,
        distance: '१.२ किमी',
        services:
          b?.services?.map((s) => ({
            id: s.id,
            name_mr: s.nameMr,
            name_en: s.nameEn,
            price: s.price,
            duration_mins: s.durationMins,
            description_mr: s.descriptionMr,
            description_en: s.descriptionEn,
          })) || [],
        reviews:
          b?.reviews?.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment || '',
            createdAt: r.createdAt.toISOString(),
          })) || [],
      };
    });

    // 3. Filter by area if provided
    if (areaId) {
      mapped = mapped.filter((v) => v.areaId === areaId);
    }

    return NextResponse.json({
      success: true,
      category: category || null,
      data: mapped,
      total: mapped.length,
    });
  } catch (error: any) {
    console.error('[API v1 /categories/:id/businesses] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category businesses' },
      { status: 500 }
    );
  }
}
