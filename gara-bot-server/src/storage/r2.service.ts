import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { config } from '../config/index.js';

export type R2BucketType = 'images' | 'documents' | 'photos';

export interface R2HealthResult {
  ok: boolean;
  configured: boolean;
  buckets: Record<string, boolean>;
  error?: string;
}

export interface PresignedUrlResult {
  url: string;
  key: string;
  bucket: string;
  bucketType: R2BucketType;
  expiresInSeconds: number;
}

// ----------------------------------------------------
// Constants for file validation & security
// ----------------------------------------------------
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const ALLOWED_DOC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for images
export const MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024;   // 25 MB limit for documents

export const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/heic': ['heic'],
  'image/heif': ['heif'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'php', 'phtml', 'pl', 'cgi',
  'js', 'mjs', 'cjs', 'ts', 'html', 'htm', 'xhtml', 'vbs', 'jar',
  'msi', 'com', 'scr', 'ps1', 'apk'
]);

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    if (!config.r2.accessKeyId || !config.r2.secretAccessKey) {
      throw new Error('[R2 Storage] R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not configured');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export function isR2Configured(): boolean {
  return Boolean(config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.endpoint);
}

export function resolveBucketName(bucketType: R2BucketType): string {
  switch (bucketType) {
    case 'images':
      return config.r2.buckets.images;
    case 'documents':
      return config.r2.buckets.documents;
    case 'photos':
      return config.r2.buckets.photos;
    default:
      throw new Error(`[R2 Storage] Unknown bucket type: ${bucketType}`);
  }
}

/**
 * Validates file constraints (MIME type, file size, path traversal, extension check).
 */
export function validateFileConstraints(
  bucketType: R2BucketType,
  fileName: string,
  fileSize: number,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'Tên file không hợp lệ' };
  }

  // Prevent path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Tên file chứa ký tự điều hướng thư mục không an toàn' };
  }

  // Extract and sanitize extension
  const cleanBase = path.basename(fileName);
  const parts = cleanBase.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'File phải có phần mở rộng hợp lệ' };
  }
  const ext = parts.pop()!.toLowerCase();

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Phần mở rộng file (.${ext}) bị cấm vì lý do bảo mật` };
  }

  // Validate per bucket type
  if (bucketType === 'images' || bucketType === 'photos') {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any)) {
      return {
        valid: false,
        error: `MIME type "${mimeType}" không được hỗ trợ cho ảnh. Định dạng cho phép: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      };
    }
    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Dung lượng ảnh (${(fileSize / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn tối đa 10 MB`,
      };
    }
  } else if (bucketType === 'documents') {
    if (!ALLOWED_DOC_MIME_TYPES.includes(mimeType as any)) {
      return {
        valid: false,
        error: `MIME type "${mimeType}" không được hỗ trợ cho tài liệu. Định dạng cho phép: ${ALLOWED_DOC_MIME_TYPES.join(', ')}`,
      };
    }
    if (fileSize > MAX_DOC_SIZE_BYTES) {
      return {
        valid: false,
        error: `Dung lượng tài liệu (${(fileSize / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn tối đa 25 MB`,
      };
    }
  }

  // Check extension matches MIME type
  const allowedExtensions = MIME_EXTENSION_MAP[mimeType];
  if (allowedExtensions && !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Phần mở rộng (.${ext}) không khớp với MIME type "${mimeType}" (chấp nhận: .${allowedExtensions.join(', .')})`,
    };
  }

  return { valid: true };
}

/**
 * Generates an unpredictable, randomized, unique object key.
 * Avoids path traversal and prevents collisions.
 */
export function generateSafeObjectKey(
  bucketType: R2BucketType,
  originalFileName: string,
  contextId?: string,
  subPath?: string
): string {
  const cleanOriginal = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = cleanOriginal.includes('.') ? cleanOriginal.split('.').pop()!.toLowerCase() : 'bin';

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(`Định dạng tệp không an toàn (.${ext})`);
  }

  const uniqueSegment = `${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const sanitizedBase = cleanOriginal.replace(/\.[^.]+$/, '').slice(0, 30);
  const finalFilename = `${uniqueSegment}_${sanitizedBase}.${ext}`;

  const cleanContextId = contextId ? contextId.replace(/[^a-zA-Z0-9-]/g, '') : 'general';
  const cleanSubPath = subPath ? subPath.replace(/[^a-zA-Z0-9_-]/g, '') : '';

  switch (bucketType) {
    case 'images':
      return `vehicles/${cleanContextId}/${finalFilename}`;
    case 'documents':
      return `documents/${cleanContextId}/${finalFilename}`;
    case 'photos':
      return cleanSubPath
        ? `checksheets/${cleanContextId}/${cleanSubPath}/${finalFilename}`
        : `checksheets/${cleanContextId}/${finalFilename}`;
    default:
      return `uploads/${cleanContextId}/${finalFilename}`;
  }
}

export async function checkR2Health(): Promise<R2HealthResult> {
  if (!isR2Configured()) {
    return {
      ok: false,
      configured: false,
      buckets: {
        [config.r2.buckets.images]: false,
        [config.r2.buckets.documents]: false,
        [config.r2.buckets.photos]: false,
      },
      error: 'R2 credentials not configured in environment',
    };
  }

  const client = getR2Client();
  const bucketNames = [
    config.r2.buckets.images,
    config.r2.buckets.documents,
    config.r2.buckets.photos,
  ];

  const bucketStatus: Record<string, boolean> = {};
  let allOk = true;
  let lastError: string | undefined;

  for (const bucket of bucketNames) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      bucketStatus[bucket] = true;
    } catch (err: any) {
      allOk = false;
      bucketStatus[bucket] = false;
      lastError = err.message || `Bucket ${bucket} unreachable`;
    }
  }

  return {
    ok: allOk,
    configured: true,
    buckets: bucketStatus,
    error: allOk ? undefined : lastError,
  };
}

export async function generatePresignedUploadUrl(
  bucketType: R2BucketType,
  key: string,
  contentType?: string,
  customMetadata?: Record<string, string>,
  expiresInSeconds?: number
): Promise<PresignedUrlResult> {
  const client = getR2Client();
  const bucket = resolveBucketName(bucketType);
  const expiresIn = expiresInSeconds || config.r2.presignedUrlExpiresIn;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    Metadata: customMetadata,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return {
    url,
    key,
    bucket,
    bucketType,
    expiresInSeconds: expiresIn,
  };
}

export async function generatePresignedDownloadUrl(
  bucketType: R2BucketType,
  key: string,
  expiresInSeconds?: number
): Promise<PresignedUrlResult> {
  const client = getR2Client();
  const bucket = resolveBucketName(bucketType);
  const expiresIn = expiresInSeconds || config.r2.presignedUrlExpiresIn;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return {
    url,
    key,
    bucket,
    bucketType,
    expiresInSeconds: expiresIn,
  };
}

export async function headObject(bucketType: R2BucketType, key: string) {
  const client = getR2Client();
  const bucket = resolveBucketName(bucketType);

  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      exists: true,
      contentLength: res.ContentLength ?? null,
      contentType: res.ContentType ?? null,
      etag: res.ETag ?? null,
      lastModified: res.LastModified ?? null,
      metadata: res.Metadata ?? {},
    };
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

export async function deleteObject(bucketType: R2BucketType, key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = resolveBucketName(bucketType);

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    console.error(`[R2 Storage] deleteObject error for ${bucket}/${key}:`, err.message);
    throw err;
  }
}
