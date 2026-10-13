import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function handleVacationUpdate(request: Request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const isVacation = Boolean(
      body.vacationMode ?? body.isFullyBooked ?? true
    );

    // Find vendor for this user
    let vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      include: { business: true },
    });

    if (!vendor) {
      // If vendor record does not exist yet, find or create
      return NextResponse.json(
        { success: false, error: 'Vendor profile not found for this user' },
        { status: 404 }
      );
    }

    // Update vendor and business
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        vacationMode: isVacation,
        vacationReason: body.vacationReason || vendor.vacationReason,
      },
    });

    if (vendor.business) {
      await prisma.business.update({
        where: { id: vendor.business.id },
        data: {
          vacationMode: isVacation,
          vacationReason: body.vacationReason || vendor.business.vacationReason,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        vendorId: vendor.id,
        vacationMode: updatedVendor.vacationMode,
        isFullyBooked: updatedVendor.vacationMode,
      },
      message: `Vacation mode ${isVacation ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error: any) {
    console.error('[API v1 /vendor/profile/vacation] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vacation mode' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return handleVacationUpdate(request);
}

export async function PUT(request: Request) {
  return handleVacationUpdate(request);
}
