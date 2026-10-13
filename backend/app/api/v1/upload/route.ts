import { NextRequest, NextResponse } from 'next/server';
import { CloudinaryService, isCloudinaryConfigured } from '../../../../lib/cloudinary';
import { verifyAuth } from '../../../../lib/auth';
import { AuthMiddleware } from '../../../../src/presentation/middleware/auth.middleware';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const DISALLOWED_EXTENSIONS = new Set([
  'exe', 'sh', 'bat', 'cmd', 'php', 'js', 'ts', 'jsx', 'tsx', 'html', 'htm', 'py', 'rb', 'pl', 'jar'
]);

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
    // 1. Enforce Authentication
    let authUser = await verifyAuth(req);
    let authUserId: string | null = authUser?.id || null;

    if (!authUser) {
      try {
        const userPayload = await AuthMiddleware.authenticate(req);
        if (userPayload?.userId) {
          authUserId = userPayload.userId;
        }
      } catch (_) {
        // Not authenticated
      }
    }

    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to upload files' },
        { status: 401 }
      );
    }

    let fileData: string | Buffer | null = null;
    let folder = 'abhinnati/general';
    let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto';
    let publicId: string | undefined;
    let fileSizeBytes = 0;
    let detectedMime = '';
    let originalName = 'upload';

    const contentType = req.headers.get('content-type') || '';

    // 2. Parse Multipart or JSON body
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

      originalName = file.name || 'file';
      detectedMime = file.type || '';
      fileSizeBytes = file.size;

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

      publicId = `${originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
    } else {
      // JSON body
      const body = await req.json().catch(() => ({}));
      fileData = body.file || body.fileData || body.base64 || body.image || body.document;
      const typeParam = body.type || body.folder;
      originalName = body.fileName || body.name || 'upload';

      if (!fileData) {
        return NextResponse.json(
          { success: false, error: 'Field "file" or "fileData" is required in JSON payload' },
          { status: 400 }
        );
      }

      if (typeof fileData === 'string') {
        // Detect MIME and size from Data URI
        if (fileData.startsWith('data:')) {
          const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            detectedMime = match[1];
            // Calculate size from base64 string
            const base64Data = match[2];
            fileSizeBytes = Math.round((base64Data.length * 3) / 4);
          } else {
            return NextResponse.json(
              { success: false, error: 'Invalid Data URI format' },
              { status: 400 }
            );
          }
        } else if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
          fileSizeBytes = 1024; // External URL reference
        } else {
          // Raw base64 string
          fileSizeBytes = Math.round((fileData.length * 3) / 4);
        }
      } else if (Buffer.isBuffer(fileData)) {
        fileSizeBytes = fileData.length;
      }

      if (typeParam === 'profile' || typeParam === 'avatar') {
        folder = 'abhinnati/profiles';
        resourceType = 'image';
      } else if (typeParam === 'kyc' || typeParam === 'document' || typeParam === 'pdf') {
        folder = 'abhinnati/documents';
        resourceType = (detectedMime === 'application/pdf' || originalName.endsWith('.pdf')) ? 'raw' : 'auto';
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

    // 3. Extension and Disallowed File Types Validation
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch ? extMatch[1].toLowerCase() : '';

    if (extension && DISALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { success: false, error: `Disallowed file type: .${extension}. Executables and scripts are prohibited.` },
        { status: 400 }
      );
    }

    // 4. MIME Type Validation
    const isDocFolder = folder.includes('documents') || folder.includes('kyc');
    if (detectedMime) {
      if (isDocFolder) {
        if (!ALLOWED_DOC_MIMES.has(detectedMime.toLowerCase())) {
          return NextResponse.json(
            { success: false, error: `Invalid document type (${detectedMime}). Allowed: PDF, JPG, PNG, WEBP.` },
            { status: 400 }
          );
        }
      } else {
        if (!ALLOWED_IMAGE_MIMES.has(detectedMime.toLowerCase())) {
          return NextResponse.json(
            { success: false, error: `Invalid image type (${detectedMime}). Allowed: JPG, PNG, WEBP, GIF.` },
            { status: 400 }
          );
        }
      }
    }

    // 5. File Size Limit Validation
    const maxSize = isDocFolder ? MAX_DOCUMENT_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (fileSizeBytes > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB (actual: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    // 6. Execute Upload via CloudinaryService
    const tags = ['abhinnati', `user_${authUserId}`];
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/v1/upload:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}
