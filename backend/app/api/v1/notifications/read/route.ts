import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to manage notifications' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    // Strict ownership: targetUserId is ALWAYS the authenticated user's ID
    const targetUserId = user.id;

    if (notificationId) {
      // Mark single notification read only if owned by authenticated user
      const updated = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: targetUserId,
        },
        data: {
          read: true,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { success: false, error: 'Notification not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    }

    // Mark all notifications for the authenticated user as read
    const updated = await prisma.notification.updateMany({
      where: {
        userId: targetUserId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: updated.count,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('[API v1 /notifications/read POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
