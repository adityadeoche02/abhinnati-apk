import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const category = searchParams.get('category');
    const locality = searchParams.get('locality');
    const minRating = parseFloat(searchParams.get('rating') || '0');

    // Fetch approved vendors with their business, services, reviews, and locations
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

    let mappedVendors = vendorsDb.map((v) => {
      const b = v.business;
      const loc = b?.locations?.[0];

      return {
        id: v.id,
        userId: v.userId,
        businessNameMr: b?.nameMr || 'नवीन व्यवसाय',
        businessNameEn: b?.nameEn || 'New Business',
        categorySlug: category || 'general',
        categoryNameMr: 'स्थानिक सेवा',
        categoryNameEn: 'Local Service',
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

    // 1. Text Query Filter (matches business name, description, or service name)
    if (query) {
      mappedVendors = mappedVendors.filter((v) => {
        const matchesNameEn = v.businessNameEn.toLowerCase().includes(query);
        const matchesNameMr = v.businessNameMr.toLowerCase().includes(query);
        const matchesDescEn = v.descriptionEn.toLowerCase().includes(query);
        const matchesDescMr = v.descriptionMr.toLowerCase().includes(query);
        const matchesServices = v.services.some(
          (s) =>
            s.name_en.toLowerCase().includes(query) ||
            s.name_mr.toLowerCase().includes(query)
        );
        return (
          matchesNameEn ||
          matchesNameMr ||
          matchesDescEn ||
          matchesDescMr ||
          matchesServices
        );
      });
    }

    // 2. Locality Filter
    if (locality) {
      mappedVendors = mappedVendors.filter(
        (v) =>
          v.areaId.toLowerCase() === locality.toLowerCase() ||
          v.areaId.toLowerCase().includes(locality.toLowerCase())
      );
    }

    // 3. Minimum Rating Filter
    if (minRating > 0) {
      mappedVendors = mappedVendors.filter((v) => v.ratingAvg >= minRating);
    }

    return NextResponse.json({
      success: true,
      data: mappedVendors,
      total: mappedVendors.length,
    });
  } catch (error: any) {
    console.error('[API v1 /search] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search vendors' },
      { status: 500 }
    );
  }
}
