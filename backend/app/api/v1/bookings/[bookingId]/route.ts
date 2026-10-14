import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { BookingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vendor: { include: { business: true } },
        user: true,
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        userId: booking.userId || '',
        userName: booking.user?.name || 'Customer',
        userPhone: booking.user?.phone || '',
        vendorId: booking.vendorId,
        vendorName:
          booking.vendor?.business?.nameMr ||
          booking.vendor?.business?.nameEn ||
          'Vendor',
        serviceId: booking.serviceId || '',
        serviceName:
          booking.service?.nameMr ||
          booking.service?.nameEn ||
          'Service',
        price: booking.price,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        notes: booking.notes,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        transactionId: booking.transactionId,
        trackingStatus: booking.trackingStatus,
        cancelUntil: booking.cancelUntil?.toISOString(),
        createdAt: booking.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API v1 /bookings/:bookingId GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to update booking' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status, trackingStatus, paymentStatus } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vendor: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const isCustomer = booking.userId === user.id;
    const isVendorOwner = booking.vendor.userId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isCustomer && !isVendorOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to modify this booking' },
        { status: 403 }
      );
    }

    // Terminal statuses cannot be modified
    const terminalStatuses: BookingStatus[] = [
      BookingStatus.completed,
      BookingStatus.cancelled,
      BookingStatus.declined,
    ];

    if (terminalStatuses.includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot modify booking with terminal status: ${booking.status}` },
        { status: 400 }
      );
    }

    const updateData: any = {};

    // Validate and enforce valid status transitions
    if (status) {
      const validStatuses: BookingStatus[] = [
        BookingStatus.pending,
        BookingStatus.accepted,
        BookingStatus.completed,
        BookingStatus.cancelled,
        BookingStatus.declined,
      ];

      if (!validStatuses.includes(status as BookingStatus)) {
        return NextResponse.json(
          { success: false, error: `Invalid booking status: ${status}` },
          { status: 400 }
        );
      }

      // Customer permission rules: customers may only cancel
      if (isCustomer && !isVendorOwner && !isAdmin) {
        if (status !== BookingStatus.cancelled) {
          return NextResponse.json(
            { success: false, error: 'Customers can only cancel bookings, not accept or complete them' },
            { status: 403 }
          );
        }
      }

      // Vendor permission rules: vendor can accept, decline, complete, or cancel
      if (isVendorOwner && !isAdmin) {
        if (booking.status === BookingStatus.pending) {
          const allowed: BookingStatus[] = [BookingStatus.accepted, BookingStatus.declined, BookingStatus.cancelled];
          if (!allowed.includes(status as BookingStatus)) {
            return NextResponse.json(
              { success: false, error: 'Pending bookings can only be accepted, declined, or cancelled' },
              { status: 400 }
            );
          }
        } else if (booking.status === BookingStatus.accepted) {
          const allowed: BookingStatus[] = [BookingStatus.completed, BookingStatus.cancelled];
          if (!allowed.includes(status as BookingStatus)) {
            return NextResponse.json(
              { success: false, error: 'Accepted bookings can only be completed or cancelled' },
              { status: 400 }
            );
          }
        }
      }

      updateData.status = status as BookingStatus;
    }

    if (trackingStatus) {
      const validTracking = ['ordered', 'en_route', 'in_progress', 'completed'];
      if (!validTracking.includes(trackingStatus)) {
        return NextResponse.json(
          { success: false, error: `Invalid tracking status: ${trackingStatus}` },
          { status: 400 }
        );
      }
      updateData.trackingStatus = trackingStatus;
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Booking updated successfully',
    });
  } catch (error: any) {
    console.error('[API v1 /bookings/:bookingId PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
