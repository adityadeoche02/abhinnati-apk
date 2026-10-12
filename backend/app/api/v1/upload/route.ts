import { NextRequest, NextResponse } from 'next/server';
import { CloudinaryService, isCloudinaryConfigured } from '../../../../lib/cloudinary';
import { AuthMiddleware } from '../../../../src/presentation/middleware/auth.middleware';

export async function GET() {
  return NextResponse.json({
    success: true,
    provider: 'cloudinary',
    configured: isCloudinaryConfigured(),
    message: isCloudinaryConfigured()
      ? 'Cloudinary is configured and ready'
      : 'Cloudinary credentials not set yet; mock mode is active for development',
  });
}

export async function POST(req: NextRequest) {
  try {
    let fileData: string | Buffer | null = null;
    let folder = 'abhinnati/general';
    let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto';
    let publicId: string | undefined;

    // Optional user authentication (doesn't fail if guest/unauthenticated registration)
    let authUserId: string | null = null;
    try {
      const user = await AuthMiddleware.authenticate(req);
      if (user && user.userId) {
        authUserId = user.userId;
      }
    } catch {
      // Guest or pre-login upload is permissible
    }

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const typeParam = (formData.get('type') as string) || (formData.get('folder') as string) || '';
      const customResourceType = formData.get('resourceType') as any;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided in form data' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      fileData = Buffer.from(bytes);

      if (typeParam === 'profile' || typeParam === 'avatar') {
        folder = 'abhinnati/profiles';
        resourceType = 'image';
      } else if (typeParam === 'kyc' || typeParam === 'document' || typeParam === 'pdf') {
        folder = 'abhinnati/documents';
        resourceType = file.type === 'application/pdf' ? 'raw' : 'auto';
      } else if (typeParam === 'business') {
        folder = 'abhinnati/business';
      } else if (typeParam) {
        folder = `abhinnati/${typeParam.replace(/^\/+|\/+$/g, '')}`;
      }

      if (customResourceType) {
        resourceType = customResourceType;
      }

      publicId = `${file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    } else {
      // JSON body
      const body = await req.json();
      fileData = body.file || body.fileData || body.base64 || body.image || body.document;
      const typeParam = body.type || body.folder;

      if (!fileData) {
        return NextResponse.json(
          { success: false, error: 'Field "file" or "fileData" is required in JSON payload' },
          { status: 400 }
        );
      }

      if (typeParam === 'profile' || typeParam === 'avatar') {
        folder = 'abhinnati/profiles';
        resourceType = 'image';
      } else if (typeParam === 'kyc' || typeParam === 'document' || typeParam === 'pdf') {
        folder = 'abhinnati/documents';
        resourceType = typeof fileData === 'string' && fileData.includes('application/pdf') ? 'raw' : 'auto';
      } else if (typeParam === 'business') {
        folder = 'abhinnati/business';
      } else if (typeParam) {
        folder = `abhinnati/${typeParam.replace(/^\/+|\/+$/g, '')}`;
      }

      if (body.resourceType) {
        resourceType = body.resourceType;
      }
      if (body.publicId) {
        publicId = body.publicId;
      }
    }

    const tags = ['abhinnati'];
    if (authUserId) {
      tags.push(`user_${authUserId}`);
    }

    const result = await CloudinaryService.upload(fileData, {
      folder,
      resourceType,
      publicId,
      tags,
    });

    return NextResponse.json({
      success: true,
      url: result.secureUrl,
      secure_url: result.secureUrl,
      public_id: result.publicId,
      resource_type: result.resourceType,
      format: result.format,
      bytes: result.bytes,
      isMock: result.isMock,
    });
  } catch (error: any) {
    console.error('Error in POST /api/v1/upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file to Cloudinary' },
      { status: 500 }
    );
  }
}
