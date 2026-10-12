import { api } from '../api/client';

export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'failed';

export interface KYCFile {
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadProgress: number;
  uploadStatus: UploadStatus;
  uploadedAt?: string;
  previewUri?: string;
  fileData?: string;
  cloudinaryUrl?: string;
  publicId?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const fileUploadService = {
  /**
   * Validates file size and file formats
   */
  validateFile: (fileName: string, mimeType: string, fileSize: number): { valid: boolean; error?: string } => {
    // Format check
    if (!SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return {
        valid: false,
        error: 'Unsupported File Format. Please upload a PDF, JPG, JPEG, PNG or document file.'
      };
    }

    // Size check
    if (fileSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File Too Large. Maximum allowed size is 25 MB.'
      };
    }

    return { valid: true };
  },

  /**
   * Simulated image compression
   */
  compressImage: async (file: KYCFile): Promise<KYCFile> => {
    if (file.mimeType.startsWith('image/')) {
      // Simulate size reduction on images
      const compressedSize = Math.round(file.fileSize * 0.6);
      return {
        ...file,
        fileSize: compressedSize,
        fileName: file.fileName.replace(/(\.[\w\d]+)$/i, '_compressed$1'),
      };
    }
    // PDF files should not be compressed
    return file;
  },

  /**
   * Mock permission request simulator
   */
  requestPermission: async (type: 'camera' | 'gallery'): Promise<'granted' | 'denied'> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('granted');
      }, 300);
    });
  },

  /**
   * Cloudinary upload with progress simulation & network dispatch
   */
  startUpload: (
    file: KYCFile,
    onProgress: (progress: number) => void,
    onComplete: (updatedFile: KYCFile) => void,
    onFail: (error: string) => void
  ) => {
    let progress = 10;
    let isCancelled = false;
    onProgress(progress);

    const interval = setInterval(() => {
      if (isCancelled) return;
      if (progress < 85) {
        progress += Math.floor(Math.random() * 15) + 10;
        if (progress > 85) progress = 85;
        onProgress(progress);
      }
    }, 150);

    // Perform the actual upload if fileData exists
    (async () => {
      try {
        const isPdf = file.mimeType === 'application/pdf';
        const uploadType = isPdf ? 'document' : 'kyc';
        const resourceType = isPdf ? 'raw' : 'image';

        let uploadResult = {
          url: file.previewUri || '',
          secure_url: file.previewUri || '',
          public_id: `upload_${Date.now()}`,
        };

        if (file.fileData) {
          const res = await api.uploadFile(file.fileData, uploadType, resourceType);
          if (res && res.secure_url) {
            uploadResult = res;
          }
        }

        if (isCancelled) return;
        clearInterval(interval);
        onProgress(100);

        onComplete({
          ...file,
          uploadProgress: 100,
          uploadStatus: 'uploaded',
          uploadedAt: new Date().toISOString(),
          cloudinaryUrl: uploadResult.secure_url || uploadResult.url,
          previewUri: uploadResult.secure_url || uploadResult.url || file.previewUri,
          publicId: uploadResult.public_id,
        });
      } catch (err: any) {
        if (isCancelled) return;
        clearInterval(interval);
        console.error('[fileUploadService] upload failed:', err);
        onFail(err.message || 'Upload failed');
      }
    })();

    return {
      cancel: () => {
        isCancelled = true;
        clearInterval(interval);
      }
    };
  }
};
