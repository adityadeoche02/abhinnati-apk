import { Buffer } from 'buffer';
import { logger } from './logger';
import { config } from './config';
import { CloudinaryService, isCloudinaryConfigured } from './cloudinary';

export interface IStorageService {
  /**
   * Uploads a file (provided as base64 string or data URI) to storage.
   * 
   * @param bucket - The storage folder/bucket name (e.g., 'profile-images', 'kyc-docs').
   * @param filename - The unique name of the target file.
   * @param base64Data - Base64 encoded file data.
   * @param mimeType - Optional file MIME type.
   * @returns The public URL of the uploaded resource.
   */
  uploadFile(bucket: string, filename: string, base64Data: string, mimeType?: string): Promise<string>;
}

class CloudinaryStorageService implements IStorageService {
  async uploadFile(
    bucket: string,
    filename: string,
    base64Data: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<string> {
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      logger.info(`[Storage] Input is already a public URL: ${base64Data}`);
      return base64Data;
    }

    let resolvedMimeType = mimeType;
    let base64String = base64Data;

    const dataUriMatch = base64Data.match(/^data:([a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      resolvedMimeType = dataUriMatch[1];
      base64String = dataUriMatch[2];
    }

    // Determine resource type
    let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto';
    if (resolvedMimeType.startsWith('image/')) {
      resourceType = 'image';
    } else if (resolvedMimeType.startsWith('video/')) {
      resourceType = 'video';
    } else if (resolvedMimeType === 'application/pdf' || resolvedMimeType.includes('pdf')) {
      resourceType = 'raw';
    }

    // Determine folder
    const folder = `abhinnati/${bucket.replace(/^\/+|\/+$/g, '')}`;
    const cleanPublicId = filename.replace(/\.[^/.]+$/, ''); // Strip extension if present

    const uploadPayload = dataUriMatch ? base64Data : `data:${resolvedMimeType};base64,${base64String}`;

    const result = await CloudinaryService.upload(uploadPayload, {
      folder,
      publicId: cleanPublicId,
      resourceType,
    });

    return result.secureUrl || result.url;
  }
}

class SupabaseStorageService implements IStorageService {
  async uploadFile(
    bucket: string,
    filename: string,
    base64Data: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<string> {
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      logger.info(`[Storage] Input is already a public URL, skipping upload: ${base64Data}`);
      return base64Data;
    }

    let resolvedMimeType = mimeType;
    let base64String = base64Data;

    const dataUriMatch = base64Data.match(/^data:([a-zA-Z+.-]+\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      resolvedMimeType = dataUriMatch[1];
      base64String = dataUriMatch[2];
    }

    const SUPABASE_PROJECT_REF = 'ocsokyjpiclytbxyuiaq';
    const storageApiBase = config.SUPABASE_URL 
      ? config.SUPABASE_URL.replace(/\/$/, '')
      : `https://${SUPABASE_PROJECT_REF}.supabase.co`;

    const publicUrl = `${storageApiBase}/storage/v1/object/public/${bucket}/${filename}`;

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      logger.warn(`[Storage] Supabase environment variables not set. Generating mock upload URL: ${publicUrl}`);
      return publicUrl;
    }

    try {
      const buffer = Buffer.from(base64String, 'base64');
      const uploadUrl = `${storageApiBase}/storage/v1/object/${bucket}/${filename}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
          'Content-Type': resolvedMimeType,
        },
        body: buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }

      logger.info(`[Storage] Uploaded successfully: ${filename} to bucket ${bucket}`);
      return publicUrl;
    } catch (error) {
      logger.error(`[Storage] Upload error for ${filename} to bucket ${bucket}:`, error);
      return publicUrl;
    }
  }
}

/**
 * Unified storage service:
 * Uses Cloudinary by default or falls back to Supabase if configured.
 */
class UnifiedStorageService implements IStorageService {
  private cloudinary = new CloudinaryStorageService();
  private supabase = new SupabaseStorageService();

  async uploadFile(bucket: string, filename: string, base64Data: string, mimeType?: string): Promise<string> {
    if (isCloudinaryConfigured()) {
      return this.cloudinary.uploadFile(bucket, filename, base64Data, mimeType);
    }

    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
      return this.supabase.uploadFile(bucket, filename, base64Data, mimeType);
    }

    // Default to Cloudinary handler (which has smart dev fallback)
    return this.cloudinary.uploadFile(bucket, filename, base64Data, mimeType);
  }
}

export const storageService = new UnifiedStorageService();
export const cloudinaryStorageService = new CloudinaryStorageService();
