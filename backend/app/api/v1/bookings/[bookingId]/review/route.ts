import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to submit a review' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
    const comment = (body.text || body.comment || '').trim();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vendor: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify customer ownership: only the customer who booked can review
    if (booking.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the client who booked can submit a review' },
        { status: 403 }
      );
    }

    // Enforce booking eligibility: booking must be completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Eligibility error: Only completed bookings can be reviewed' },
        { status: 400 }
      );
    }

    const business = booking.vendor?.business;
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Associated business not found for this booking' },
        { status: 404 }
      );
    }

    // Prevent duplicate reviews for the same booking using AuditLog check
    const existingReviewLog = await prisma.auditLog.findFirst({
      where: {
        action: 'CREATE_REVIEW',
        entityId: booking.id,
      },
    });

    if (existingReviewLog) {
      return NextResponse.json(
        { success: false, error: 'Duplicate review: A review has already been submitted for this booking' },
        { status: 400 }
      );
    }

    // Create review, recalculate ratings, and log audit record in an atomic transaction
    const [review] = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          businessId: business.id,
          rating,
          comment: comment || null,
        },
      });

      // Recalculate average rating
      const allReviews = await tx.review.findMany({
        where: { businessId: business.id, deletedAt: null },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const ratingAvg = Number((totalRating / (allReviews.length || 1)).toFixed(1));

      await tx.business.update({
        where: { id: business.id },
        data: {
          ratingAvg,
          reviewsCount: allReviews.length,
        },
      });

      await tx.vendor.update({
        where: { id: booking.vendorId },
        data: {
          ratingAvg,
          reviewsCount: allReviews.length,
        },
      });

      // Audit log to prevent duplicate reviews for this booking
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_REVIEW',
          entityName: 'BookingReview',
          entityId: booking.id,
          newValues: JSON.stringify({ reviewId: createdReview.id, rating }),
        },
      });

      return [createdReview];
    });

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'Review submitted successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API v1 /bookings/:bookingId/review POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
