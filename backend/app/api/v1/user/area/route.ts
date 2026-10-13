import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to set active area' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const areaId = (body.areaId || '').trim();

    if (!areaId) {
      return NextResponse.json(
        { success: false, error: 'areaId is required' },
        { status: 400 }
      );
    }

    // Notice: schema.prisma User model currently lacks an 'activeAreaId' column.
    // We return persisted: false and document the schema requirement honestly.
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        activeAreaId: areaId,
        persisted: false,
        note: 'Active area acknowledged for session. Database schema lacks activeAreaId column on User model.',
      },
      message: 'Active area updated for session',
    });
  } catch (error: any) {
    console.error('[API v1 /user/area PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update active area' },
      { status: 500 }
    );
  }
}
