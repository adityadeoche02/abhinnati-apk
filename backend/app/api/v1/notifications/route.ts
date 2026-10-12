import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { AuthMiddleware } from '../../../../src/presentation/middleware/auth.middleware';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthMiddleware.authenticate(req);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error('GET /notifications failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: error.statusCode || 500 },
    );
  }
}
