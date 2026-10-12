import { storageService } from '../../../lib/storage';
import { BadRequestError } from '../../presentation/utils/response';

export class StorageUploadService {
  private static readonly ALLOWED_MIME_TYPES = [
    // Images (Profile photos, banners, receipts, etc.)
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    // Documents (PDFs, KYC certificates, etc.)
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    // Media
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
  ];
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  /**
   * Validates, processes/compresses, and uploads a file to Supabase storage.
   * 
   * @param bucket - Storage bucket name
   * @param folder - Destination subfolder within the bucket (e.g., 'logos', 'documents')
   * @param filename - Target filename
   * @param base64Data - Raw base64 data or Data URI string
   * @returns The public URL of the uploaded file
   */
  static async validateAndUpload(
    bucket: string,
    folder: string,
    filename: string,
    base64Data: string
  ): Promise<string> {
    // If it's already an HTTP URL, skip validation/upload and return as is
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return base64Data;
    }

    let mimeType = 'application/octet-stream';
    let base64String = base64Data;

    // 1. Parse Data URI if present
    const match = base64Data.match(/^data:([a-zA-Z+.-]+\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64String = match[2];
    }

    // 2. MIME Validation
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestError(
        `Invalid file type: ${mimeType}. Allowed formats are JPEG, PNG, WEBP, and PDF.`
      );
    }

    // 3. Size Validation
    const buffer = Buffer.from(base64String, 'base64');
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestError(
        `File is too large (${(buffer.length / (1024 * 1024)).toFixed(2)} MB). Maximum size allowed is 5 MB.`
      );
    }

    // 4. Destination path formatting
    const destinationPath = `${folder.replace(/\/$/, '')}/${filename}`;

    return storageService.uploadFile(bucket, destinationPath, base64String, mimeType);
  }
}
