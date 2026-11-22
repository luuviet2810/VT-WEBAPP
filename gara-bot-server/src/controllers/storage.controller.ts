import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  isR2Configured,
  validateFileConstraints,
  generateSafeObjectKey,
  headObject,
  deleteObject,
  resolveBucketName,
  R2BucketType,
} from '../storage/r2.service.js';
import { query } from '../database/index.js';
import { mapImageRow, mapDocRow } from './vehicleMedia.controller.js';

export const presignedUploadSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(3).max(100),
  vehicleId: z.string().uuid().optional().nullable(),
  checksheetId: z.string().uuid().optional().nullable(),
  spotKey: z.string().max(100).optional().nullable(),
  expiresInSeconds: z.number().int().min(60).max(3600).optional().nullable(),
});

export const confirmUploadSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  key: z.string().min(3).max(500),
  vehicleId: z.string().uuid().optional().nullable(),
  checksheetId: z.string().uuid().optional().nullable(),
  category: z.enum(['website', 'documents', 'error', 'song_nung', 'vehicle'] as const).optional().nullable(),
  label: z.string().max(255).optional().nullable(),
  spotKey: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
  songNungExpiryDate: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  fileSize: z.number().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
});

export const presignedDownloadSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  key: z.string().min(3).max(500),
  expiresInSeconds: z.number().int().min(60).max(86400).optional().nullable(),
});

export const deleteFileSchema = z.object({
  bucketType: z.enum(['images', 'documents', 'photos'] as const),
  key: z.string().min(3).max(500),
  id: z.string().uuid().optional().nullable(),
});

/**
 * Generates a presigned PUT URL with safety validations and unique key generation.
 */
export async function createPresignedUpload(req: Request, res: Response) {
  if (!isR2Configured()) {
    return res.status(503).json({
      ok: false,
      error: 'storage_not_configured',
      message: 'Cloudflare R2 storage credentials are not yet configured on this server',
    });
  }

  const {
    bucketType,
    fileName,
    fileSize,
    mimeType,
    vehicleId,
    checksheetId,
    spotKey,
    expiresInSeconds,
  } = req.body;

  // 1. Strict validation of file constraints (MIME type, size, path traversal, extension)
  const validation = validateFileConstraints(
    bucketType as R2BucketType,
    fileName,
    Number(fileSize),
    mimeType
  );

  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_file_constraints',
      message: validation.error,
    });
  }

  try {
    // 2. Generate randomized unique object key
    const contextId = checksheetId || vehicleId || (req as any).user?.id || 'general';
    const key = generateSafeObjectKey(
      bucketType as R2BucketType,
      fileName,
      contextId,
      spotKey
    );

    // 3. Generate presigned PUT URL
    const result = await generatePresignedUploadUrl(
      bucketType as R2BucketType,
      key,
      mimeType,
      {
        originalname: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
        uploadedby: (req as any).user?.id || 'anonymous',
      },
      expiresInSeconds
    );

    return res.status(200).json({
      ok: true,
      data: {
        ...result,
        originalName: fileName,
        mimeType,
        fileSize,
      },
    });
  } catch (err: any) {
    console.error('[Storage Controller] Error generating presigned upload URL:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'presigned_url_generation_failed',
      message: err.message || 'Không thể tạo presigned URL tải lên R2',
    });
  }
}

/**
 * Confirms upload by checking object in R2 and saving metadata to Neon.
 */
export async function confirmUpload(req: Request, res: Response) {
  if (!isR2Configured()) {
    return res.status(503).json({
      ok: false,
      error: 'storage_not_configured',
      message: 'Cloudflare R2 storage credentials are not yet configured on this server',
    });
  }

  const {
    bucketType,
    key,
    vehicleId,
    checksheetId,
    category,
    label,
    spotKey,
    sortOrder,
    songNungExpiryDate,
    thumbnail,
  } = req.body;

  const safeCategory = (category && typeof category === 'string' && category.trim() !== '')
    ? category
    : 'vehicle';
  const safeSortOrder = (typeof sortOrder === 'number' && !isNaN(sortOrder))
    ? sortOrder
    : 0;
  const safeSongNungExpiry = (songNungExpiryDate && typeof songNungExpiryDate === 'string' && songNungExpiryDate.trim() !== '')
    ? songNungExpiryDate.trim()
    : null;
  const safeThumbnail = (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '')
    ? thumbnail.trim()
    : null;
  const safeLabel = (label && typeof label === 'string' && label.trim() !== '')
    ? label.trim()
    : null;

  try {
    const bucket = resolveBucketName(bucketType as R2BucketType);

    // 1. Verify object existence in R2
    const headInfo = await headObject(bucketType as R2BucketType, key);
    if (!headInfo.exists) {
      return res.status(404).json({
        ok: false,
        error: 'object_not_found_in_storage',
        message: `Không tìm thấy file "${key}" trên Cloudflare R2 bucket "${bucket}". Vui lòng hoàn tất upload trước khi xác nhận.`,
      });
    }

    // 2. Generate a fresh download URL for immediate client preview
    const downloadInfo = await generatePresignedDownloadUrl(bucketType as R2BucketType, key);

    // 3. Save metadata into Neon DB depending on bucketType
    if (bucketType === 'images') {
      if (!vehicleId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_vehicle_id',
          message: 'vehicleId là bắt buộc khi lưu ảnh xe',
        });
      }

      // Check vehicle exists
      const vCheck = await query('SELECT id FROM vehicles WHERE id = $1', [vehicleId]);
      if (vCheck.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'vehicle_not_found',
          message: 'Không tìm thấy xe với ID cung cấp',
        });
      }

      const insertRes = await query(
        `INSERT INTO vehicle_images (
          vehicle_id, path, bucket, url, thumbnail, size_bytes, mime_type,
          category, sort_order, song_nung_expiry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          vehicleId,
          key,
          bucket,
          key, // Store permanent key, NOT temporary expiring Presigned URL
          safeThumbnail,
          headInfo.contentLength,
          headInfo.contentType,
          safeCategory,
          safeSortOrder,
          safeSongNungExpiry,
        ]
      );

      const mapped = mapImageRow(insertRes.rows[0]);
      return res.status(201).json({
        ok: true,
        message: 'Lưu metadata ảnh vào cơ sở dữ liệu thành công',
        data: {
          ...mapped,
          downloadUrl: downloadInfo.url,
        },
      });
    } else if (bucketType === 'documents') {
      if (!vehicleId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_vehicle_id',
          message: 'vehicleId là bắt buộc khi lưu tài liệu xe',
        });
      }

      const vCheck = await query('SELECT id FROM vehicles WHERE id = $1', [vehicleId]);
      if (vCheck.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'vehicle_not_found',
          message: 'Không tìm thấy xe với ID cung cấp',
        });
      }

      const insertRes = await query(
        `INSERT INTO vehicle_documents (
          vehicle_id, label, path, bucket, url, size_bytes, mime_type, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          vehicleId,
          safeLabel,
          key,
          bucket,
          key, // Store permanent key, NOT temporary expiring Presigned URL
          headInfo.contentLength,
          headInfo.contentType,
          safeSortOrder,
        ]
      );

      const mapped = mapDocRow(insertRes.rows[0]);
      return res.status(201).json({
        ok: true,
        message: 'Lưu metadata tài liệu vào cơ sở dữ liệu thành công',
        data: {
          ...mapped,
          downloadUrl: downloadInfo.url,
        },
      });
    } else if (bucketType === 'photos') {
      if (!checksheetId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_checksheet_id',
          message: 'checksheetId là bắt buộc khi lưu ảnh checksheet',
        });
      }

      const csCheck = await query('SELECT id, exterior_photos FROM check_sheets WHERE id = $1', [checksheetId]);
      if (csCheck.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'checksheet_not_found',
          message: 'Không tìm thấy phiếu kiểm tra với ID cung cấp',
        });
      }

      const spot = spotKey || 'general';
      const existingPhotos = csCheck.rows[0].exterior_photos || {};
      const currentList: string[] = Array.isArray(existingPhotos[spot]) ? existingPhotos[spot] : [];

      if (!currentList.includes(key)) {
        currentList.push(key);
      }
      existingPhotos[spot] = currentList;

      await query(
        `UPDATE check_sheets SET exterior_photos = $1, updated_at = now() WHERE id = $2`,
        [JSON.stringify(existingPhotos), checksheetId]
      );

      return res.status(200).json({
        ok: true,
        message: 'Cập nhật ảnh vào phiếu kiểm tra thành công',
        data: {
          checksheetId,
          spotKey: spot,
          key,
          downloadUrl: downloadInfo.url,
          exteriorPhotos: existingPhotos,
        },
      });
    }
  } catch (err: any) {
    console.error('[Storage Controller] Error confirming upload:', err);
    return res.status(500).json({
      ok: false,
      error: 'confirm_upload_failed',
      message: err.message || 'Không thể xác nhận và lưu metadata upload',
    });
  }
}

/**
 * Generates a presigned download URL for private R2 objects.
 */
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

    return res.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Storage Controller] Error generating presigned download URL:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'presigned_url_generation_failed',
      message: 'Không thể tạo presigned download URL',
    });
  }
}

/**
 * Deletes a file from R2 and removes its metadata from Neon DB.
 */
export async function deleteStorageFile(req: Request, res: Response) {
  if (!isR2Configured()) {
    return res.status(503).json({
      ok: false,
      error: 'storage_not_configured',
      message: 'Cloudflare R2 storage credentials are not yet configured on this server',
    });
  }

  const { bucketType, key, id } = req.body;

  try {
    // 1. Delete object from R2
    let r2Deleted = false;
    try {
      r2Deleted = await deleteObject(bucketType as R2BucketType, key);
    } catch (r2Err: any) {
      console.warn(`[Storage Controller] Warning: Could not delete ${key} from R2:`, r2Err.message);
    }

    // 2. Clean up corresponding metadata in DB if exists
    let dbDeleted = false;
    if (bucketType === 'images') {
      const dbRes = id
        ? await query('DELETE FROM vehicle_images WHERE id = $1 RETURNING id', [id])
        : await query('DELETE FROM vehicle_images WHERE path = $1 RETURNING id', [key]);
      dbDeleted = dbRes.rows.length > 0;
    } else if (bucketType === 'documents') {
      const dbRes = id
        ? await query('DELETE FROM vehicle_documents WHERE id = $1 RETURNING id', [id])
        : await query('DELETE FROM vehicle_documents WHERE path = $1 RETURNING id', [key]);
      dbDeleted = dbRes.rows.length > 0;
    } else if (bucketType === 'photos') {
      // Find check_sheets containing this key in exterior_photos
      const sheets = await query(
        `SELECT id, exterior_photos FROM check_sheets WHERE exterior_photos::text LIKE $1`,
        [`%${key}%`]
      );
      for (const row of sheets.rows) {
        const photos = row.exterior_photos || {};
        let modified = false;
        for (const spot of Object.keys(photos)) {
          if (Array.isArray(photos[spot])) {
            const initialLen = photos[spot].length;
            photos[spot] = photos[spot].filter((k: string) => k !== key);
            if (photos[spot].length !== initialLen) {
              modified = true;
            }
          }
        }
        if (modified) {
          await query(
            `UPDATE check_sheets SET exterior_photos = $1, updated_at = now() WHERE id = $2`,
            [JSON.stringify(photos), row.id]
          );
          dbDeleted = true;
        }
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã xử lý xóa tệp lưu trữ và dọn dẹp metadata',
      data: {
        bucketType,
        key,
        r2Deleted,
        dbDeleted,
      },
    });
  } catch (err: any) {
    console.error('[Storage Controller] Error deleting file:', err);
    return res.status(500).json({
      ok: false,
      error: 'delete_file_failed',
      message: err.message || 'Không thể xóa tệp lưu trữ',
    });
  }
}
