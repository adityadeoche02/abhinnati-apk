import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthMiddleware } from '../../../../../src/presentation/middleware/auth.middleware';
import { CloudinaryService } from '../../../../../lib/cloudinary';

export async function POST(req: Request) {
  try {
    const userPayload = await AuthMiddleware.authenticate(req as any);
    const body = await req.json();
    
    // The frontend sends fullName and profileImage
    const name = body.fullName || body.name || '';
    let profileImage = body.profileImage || null;

    if (profileImage && (profileImage.startsWith('data:') || !profileImage.startsWith('http'))) {
      const uploadRes = await CloudinaryService.uploadProfilePhoto(profileImage, userPayload.userId);
      profileImage = uploadRes.secureUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userPayload.userId },
      data: {
        name,
        profileImage,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /user/profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userPayload = await AuthMiddleware.authenticate(req as any);
    const body = await req.json();
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.fullName !== undefined) updateData.name = body.fullName;
    if (body.profileImage !== undefined) {
      let profileImg = body.profileImage;
      if (profileImg && (profileImg.startsWith('data:') || !profileImg.startsWith('http'))) {
        const uploadRes = await CloudinaryService.uploadProfilePhoto(profileImg, userPayload.userId);
        profileImg = uploadRes.secureUrl;
      }
      updateData.profileImage = profileImg;
    }
    if (body.language !== undefined) updateData.language = body.language;

    const updatedUser = await prisma.user.update({
      where: { id: userPayload.userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error in PATCH /user/profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 400 }
    );
  }
}
