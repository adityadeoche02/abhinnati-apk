import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const areaId = searchParams.get('areaId');
  const categorySlug = searchParams.get('categorySlug');

  try {
    // Fetch all vendors with their business, services, and locations
    const vendorsDb = await prisma.vendor.findMany({
      include: {
        user: true,
        business: {
          include: {
            services: true,
            locations: true,
            reviews: true
          }
        }
      }
    });

    // Map Prisma models to the exact shape expected by the frontend MockData
    let mappedVendors = vendorsDb.map(v => {
      const b = v.business;
      const loc = b?.locations?.[0]; // Use first location for primary area
      
      return {
        id: v.id,
        userId: v.userId,
        businessNameMr: b?.nameMr || 'नवीन व्यवसाय',
        businessNameEn: b?.nameEn || 'New Business',
        
        // Since category association is missing in the current DB schema, we default to a generic one
        // In Phase 3, we will update the Prisma schema to link Business -> Category
        categorySlug: 'plumbing', 
        categoryNameMr: 'प्लंबर आणि गवंडी',
        categoryNameEn: 'Plumbing & Masonry',
        
        descriptionMr: b?.descriptionMr || '',
        descriptionEn: b?.descriptionEn || '',
        latitude: loc?.latitude || 18.5204,
        longitude: loc?.longitude || 73.8567,
        areaId: loc?.area || 'area-kothrud',
        kycStatus: v.kycStatus,
        kycDocsUrl: v.kycDocsUrl,
        isFullyBooked: b?.vacationMode || false,
        ratingAvg: b?.ratingAvg || 4.5,
        reviewsCount: b?.reviewsCount || 0,
        distance: '१.५ किमी', // Hardcoded distance placeholder
        
        services: b?.services?.map(s => ({
          id: s.id,
          name_mr: s.nameMr,
          name_en: s.nameEn,
          price: s.price,
          duration_mins: s.durationMins,
          description_mr: s.descriptionMr,
          description_en: s.descriptionEn
        })) || [],
        
        reviews: b?.reviews?.map(r => ({
          id: r.id,
          userName: 'Customer', // Would fetch actual user name in production
          rating: r.rating,
          text: r.comment || '',
          date: r.createdAt.toISOString().split('T')[0]
        })) || []
      };
    });

    const userId = searchParams.get('userId');
    if (userId) {
      const single = mappedVendors.find(v => v.userId === userId || v.id === userId);
      return NextResponse.json({ success: true, data: single || null });
    }

    // Filter by area and category if requested
    if (areaId) {
       mappedVendors = mappedVendors.filter(v => v.areaId === areaId);
    }
    if (categorySlug) {
       mappedVendors = mappedVendors.filter(v => v.categorySlug === categorySlug);
    }

    return NextResponse.json({ success: true, data: mappedVendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 });
  }
}
