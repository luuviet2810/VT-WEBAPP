import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
