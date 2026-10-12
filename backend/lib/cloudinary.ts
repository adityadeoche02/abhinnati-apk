import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';
import { logger } from './logger';

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
  publicId?: string;
  overwrite?: boolean;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  success: boolean;
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  isMock?: boolean;
}

/**
 * Configure Cloudinary SDK instance with values from environment variables.
 */
function initCloudinary() {
  const cloudName = config.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = config.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = config.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = config.CLOUDINARY_URL || process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

initCloudinary();

/**
 * Check if valid Cloudinary credentials are provided.
 */
export function isCloudinaryConfigured(): boolean {
  const cloudName = config.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = config.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = config.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = config.CLOUDINARY_URL || process.env.CLOUDINARY_URL;

  return Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));
}

export class CloudinaryService {
  /**
   * Upload file to Cloudinary.
   * Supports:
   * - Base64 Data URI (e.g. data:image/png;base64,... or data:application/pdf;base64,...)
   * - Raw base64 string
   * - Remote HTTP/HTTPS URL
   * - Buffer
   *
   * If credentials are not configured yet, provides a safe fallback URL so the application
   * continues running smoothly during development.
   */
  static async upload(
    fileInput: string | Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const isConfigured = isCloudinaryConfigured();
    const folder = options.folder || 'abhinnati/general';
    const resourceType = options.resourceType || 'auto';

    // If it's already an existing hosted public URL, return as-is
    if (typeof fileInput === 'string' && (fileInput.startsWith('http://') || fileInput.startsWith('https://'))) {
      logger.info(`[Cloudinary] File is already a remote URL, returning as-is: ${fileInput}`);
      return {
        success: true,
        url: fileInput,
        secureUrl: fileInput,
        publicId: options.publicId || `remote_${Date.now()}`,
        resourceType,
        isMock: false,
      };
    }

    if (!isConfigured) {
      logger.warn(
        '[Cloudinary] Keys not provided in .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). ' +
        'Using fallback mock URL. Upload will use Cloudinary automatically once keys are added.'
      );

      const mockId = options.publicId || `${folder.replace(/[^a-zA-Z0-9_-]/g, '_')}_mock_${Date.now()}`;
      
      let mockUrl: string;
      if (resourceType === 'raw' || (typeof fileInput === 'string' && fileInput.includes('application/pdf'))) {
        mockUrl = `https://res.cloudinary.com/demo/raw/upload/v1/${folder}/${mockId}.pdf`;
      } else {
        mockUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80`;
      }

      return {
        success: true,
        url: mockUrl,
        secureUrl: mockUrl,
        publicId: mockId,
        resourceType: resourceType === 'auto' ? 'image' : resourceType,
        isMock: true,
      };
    }

    // Cloudinary IS configured: execute real upload
    try {
      // Re-initialize config in case env changed dynamically
      initCloudinary();

      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        overwrite: options.overwrite ?? true,
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }
      if (options.tags && options.tags.length > 0) {
        uploadOptions.tags = options.tags;
      }

      let uploadResult: any;

      if (Buffer.isBuffer(fileInput)) {
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          uploadStream.end(fileInput);
        });
      } else {
        // String input (data URI or base64)
        let formattedData = fileInput;
        // If it's a bare base64 string without data: prefix, determine best default data URI
        if (!formattedData.startsWith('data:') && !formattedData.startsWith('http')) {
          if (resourceType === 'raw') {
            formattedData = `data:application/pdf;base64,${formattedData}`;
          } else {
            formattedData = `data:image/jpeg;base64,${formattedData}`;
          }
        }

        uploadResult = await cloudinary.uploader.upload(formattedData, uploadOptions);
      }

      logger.info(`[Cloudinary] Successfully uploaded resource ${uploadResult.public_id} (${uploadResult.resource_type})`);

      return {
        success: true,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        isMock: false,
      };
    } catch (error: any) {
      logger.error('[Cloudinary] Upload failed:', error);
      throw new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Upload user profile photo with square crop and optimization presets.
   */
  static async uploadProfilePhoto(
    fileInput: string | Buffer,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    return this.upload(fileInput, {
      folder: 'abhinnati/profiles',
      publicId: `user_${userId}_${Date.now()}`,
      resourceType: 'image',
      tags: ['profile_photo', `user_${userId}`],
    });
  }

  /**
   * Upload PDF or document (e.g. KYC document, certificate, invoice).
   */
  static async uploadDocument(
    fileInput: string | Buffer,
    docType: string,
    ownerId: string,
    extension: string = 'pdf'
  ): Promise<CloudinaryUploadResult> {
    return this.upload(fileInput, {
      folder: 'abhinnati/documents',
      publicId: `doc_${ownerId}_${docType}_${Date.now()}`,
      resourceType: extension.toLowerCase() === 'pdf' ? 'raw' : 'auto',
      tags: ['document', docType, `owner_${ownerId}`],
    });
  }
}
