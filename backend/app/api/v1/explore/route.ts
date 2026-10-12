import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });

    const businesses = await prisma.business.findMany({
      where: { deletedAt: null },
      include: { vendor: true },
      orderBy: { ratingAvg: 'desc' },
      take: 10,
    });

    const popularBusinesses = businesses.map((business) => ({
      id: business.vendorId,
      businessNameMr: business.nameMr,
      businessNameEn: business.nameEn,
      categoryNameMr: '',
      categoryNameEn: '',
      distanceVal: 0,
      ratingAvg: business.ratingAvg ?? business.vendor.ratingAvg ?? 0,
      reviewsCount: business.reviewsCount ?? business.vendor.reviewsCount ?? 0,
      verified: ['approved', 'APPROVED'].includes(business.vendor.kycStatus),
    }));

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name_mr: category.nameMr,
          name_en: category.nameEn,
          iconName: category.iconName,
        })),
        popularBusinesses,
      },
    });
  } catch (error) {
    console.error('GET /explore failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch explore' }, { status: 500 });
  }
}
