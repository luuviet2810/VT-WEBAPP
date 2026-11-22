import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  isR2Configured,
  R2BucketType,
} from '../storage/r2.service.js';

export const presignedUploadSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  key: z.string().min(3).max(500),
  contentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

export const presignedDownloadSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  key: z.string().min(3).max(500),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

export async function createPresignedUpload(req: Request, res: Response) {
  if (!isR2Configured()) {
    return res.status(503).json({
      ok: false,
      error: 'storage_not_configured',
      message: 'Cloudflare R2 storage credentials are not yet configured on this server',
    });
  }

  const { bucketType, key, contentType, metadata, expiresInSeconds } = req.body;

  try {
    const result = await generatePresignedUploadUrl(
      bucketType as R2BucketType,
      key,
      contentType,
      metadata,
      expiresInSeconds
    );

    res.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Storage Controller] Error generating presigned upload URL:', err.message);
    res.status(500).json({
      ok: false,
      error: 'presigned_url_generation_failed',
      message: 'Failed to generate presigned upload URL',
    });
  }
}

export async function createPresignedDownload(req: Request, res: Response) {
  if (!isR2Configured()) {
    return res.status(503).json({
      ok: false,
      error: 'storage_not_configured',
      message: 'Cloudflare R2 storage credentials are not yet configured on this server',
    });
  }

  const { bucketType, key, expiresInSeconds } = req.body;

  try {
    const result = await generatePresignedDownloadUrl(
      bucketType as R2BucketType,
      key,
      expiresInSeconds
    );

    res.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Storage Controller] Error generating presigned download URL:', err.message);
    res.status(500).json({
      ok: false,
      error: 'presigned_url_generation_failed',
      message: 'Failed to generate presigned download URL',
    });
  }
}
