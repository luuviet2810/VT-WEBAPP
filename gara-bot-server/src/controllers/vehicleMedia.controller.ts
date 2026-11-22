import { Request, Response } from 'express';
import { query } from '../database/index.js';
import {
  generatePresignedDownloadUrl,
  deleteObject,
  isR2Configured,
} from '../storage/r2.service.js';

export function mapImageRow(r: any) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicle_id: r.vehicle_id,
    path: r.path,
    bucket: r.bucket,
    url: r.url,
    thumbnail: r.thumbnail ?? null,
    category: r.category ?? 'vehicle',
    subtype: r.subtype ?? null,
    resolved: Boolean(r.resolved),
    songNungExpiryDate: r.song_nung_expiry_date ?? null,
    song_nung_expiry_date: r.song_nung_expiry_date ?? null,
    sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
    size_bytes: r.size_bytes ? Number(r.size_bytes) : null,
    mimeType: r.mime_type ?? null,
    mime_type: r.mime_type ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    sort_order: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
    created_at: r.created_at,
  };
}

export function mapDocRow(r: any) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicle_id: r.vehicle_id,
    label: r.label ?? null,
    path: r.path,
    bucket: r.bucket,
    url: r.url,
    sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
    size_bytes: r.size_bytes ? Number(r.size_bytes) : null,
    mimeType: r.mime_type ?? null,
    mime_type: r.mime_type ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    sort_order: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
    created_at: r.created_at,
  };
}

export async function getVehicleImages(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order ASC`,
      [id]
    );

    const data = await Promise.all(
      result.rows.map(async (row) => {
        const mapped = mapImageRow(row);
        let downloadUrl = mapped.url;
        const isLegacySupabase = typeof mapped.url === 'string' && mapped.url.includes('.supabase.co');
        if (isR2Configured() && mapped.path && !isLegacySupabase) {
          try {
            const presigned = await generatePresignedDownloadUrl('images', mapped.path);
            downloadUrl = presigned.url;
          } catch {}
        }
        return {
          ...mapped,
          downloadUrl,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] getVehicleImages error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách hình ảnh của xe',
    });
  }
}

export async function addVehicleImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      path,
      bucket = 'vehicle-images',
      url,
      thumbnail = null,
      category = 'vehicle',
      songNungExpiryDate = null,
      sizeBytes = null,
      mimeType = null,
      sortOrder = 0,
    } = req.body;

    if (!path || !url) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Thiếu đường dẫn (path) hoặc URL của ảnh',
      });
    }

    const result = await query(
      `INSERT INTO vehicle_images (
        vehicle_id, path, bucket, url, thumbnail, category,
        song_nung_expiry_date, size_bytes, mime_type, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        path,
        bucket,
        url,
        thumbnail,
        category,
        songNungExpiryDate,
        sizeBytes,
        mimeType,
        sortOrder,
      ]
    );

    return res.status(201).json({
      ok: true,
      data: mapImageRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] addVehicleImage error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể lưu thông tin ảnh vào cơ sở dữ liệu',
    });
  }
}

export async function deleteVehicleImage(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const imgCheck = await query(`SELECT id, path, bucket FROM vehicle_images WHERE id = $1`, [id]);
    if (imgCheck.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy hình ảnh để xóa',
      });
    }

    const img = imgCheck.rows[0];

    // 1. Delete database record first (ensures DB consistency)
    await query(`DELETE FROM vehicle_images WHERE id = $1`, [id]);

    // 2. Clean up object from Cloudflare R2 if configured
    if (isR2Configured() && img.path) {
      try {
        await deleteObject('images', img.path);
      } catch (r2Err: any) {
        console.warn(`[VehicleMedia] Warning: could not delete ${img.path} from R2:`, r2Err.message);
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa bản ghi ảnh và dọn dẹp file lưu trữ thành công',
      data: { id, path: img.path },
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] deleteVehicleImage error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa ảnh',
    });
  }
}

export async function updateVehicleImageOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sortOrder } = req.body;

    const result = await query(
      `UPDATE vehicle_images SET sort_order = $1 WHERE id = $2 RETURNING *`,
      [Number(sortOrder ?? 0), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy ảnh',
      });
    }

    return res.status(200).json({
      ok: true,
      data: mapImageRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] updateVehicleImageOrder error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật thứ tự ảnh',
    });
  }
}

export async function updateVehicleImageCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { category, sortOrder } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (category !== undefined) {
      values.push(category);
      fields.push(`category = $${values.length}`);
    }
    if (sortOrder !== undefined) {
      values.push(Number(sortOrder));
      fields.push(`sort_order = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có dữ liệu phân loại cập nhật',
      });
    }

    values.push(id);
    const result = await query(
      `UPDATE vehicle_images SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy ảnh',
      });
    }

    return res.status(200).json({
      ok: true,
      data: mapImageRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] updateVehicleImageCategory error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật danh mục ảnh',
    });
  }
}

export async function updateVehicleImageExpiry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { expiryDate } = req.body;

    const result = await query(
      `UPDATE vehicle_images SET song_nung_expiry_date = $1 WHERE id = $2 RETURNING *`,
      [expiryDate || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy ảnh',
      });
    }

    return res.status(200).json({
      ok: true,
      data: mapImageRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] updateVehicleImageExpiry error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật ngày hết hạn',
    });
  }
}

export async function getVehicleDocuments(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY sort_order ASC`,
      [id]
    );

    const data = await Promise.all(
      result.rows.map(async (row) => {
        const mapped = mapDocRow(row);
        let downloadUrl = mapped.url;
        const isLegacySupabase = typeof mapped.url === 'string' && mapped.url.includes('.supabase.co');
        if (isR2Configured() && mapped.path && !isLegacySupabase) {
          try {
            const presigned = await generatePresignedDownloadUrl('documents', mapped.path);
            downloadUrl = presigned.url;
          } catch {}
        }
        return {
          ...mapped,
          downloadUrl,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] getVehicleDocuments error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách tài liệu',
    });
  }
}

export async function addVehicleDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      path,
      bucket = 'vehicle-documents',
      url,
      label = null,
      sizeBytes = null,
      mimeType = null,
      sortOrder = 0,
    } = req.body;

    if (!path || !url) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Thiếu đường dẫn (path) hoặc URL của tài liệu',
      });
    }

    const result = await query(
      `INSERT INTO vehicle_documents (
        vehicle_id, path, bucket, url, label, size_bytes, mime_type, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [id, path, bucket, url, label, sizeBytes, mimeType, sortOrder]
    );

    return res.status(201).json({
      ok: true,
      data: mapDocRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] addVehicleDocument error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể lưu tài liệu vào cơ sở dữ liệu',
    });
  }
}

export async function deleteVehicleDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const docCheck = await query(`SELECT id, path, bucket FROM vehicle_documents WHERE id = $1`, [id]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy tài liệu để xóa',
      });
    }

    const doc = docCheck.rows[0];

    // 1. Delete database record first (ensures DB consistency)
    await query(`DELETE FROM vehicle_documents WHERE id = $1`, [id]);

    // 2. Clean up object from Cloudflare R2 if configured
    if (isR2Configured() && doc.path) {
      try {
        await deleteObject('documents', doc.path);
      } catch (r2Err: any) {
        console.warn(`[VehicleMedia] Warning: could not delete ${doc.path} from R2:`, r2Err.message);
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa tài liệu và dọn dẹp file lưu trữ thành công',
      data: { id, path: doc.path },
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] deleteVehicleDocument error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa tài liệu',
    });
  }
}

export async function deleteAllVehicleMedia(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [imagesRes, docsRes] = await Promise.all([
      query(`SELECT path FROM vehicle_images WHERE vehicle_id = $1`, [id]),
      query(`SELECT path FROM vehicle_documents WHERE vehicle_id = $1`, [id]),
    ]);

    if (isR2Configured()) {
      for (const img of imagesRes.rows) {
        if (img.path) {
          try {
            await deleteObject('images', img.path);
          } catch {}
        }
      }
      for (const doc of docsRes.rows) {
        if (doc.path) {
          try {
            await deleteObject('documents', doc.path);
          } catch {}
        }
      }
    }

    await Promise.all([
      query(`DELETE FROM vehicle_images WHERE vehicle_id = $1`, [id]),
      query(`DELETE FROM vehicle_documents WHERE vehicle_id = $1`, [id]),
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa toàn bộ media của xe thành công',
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] deleteAllVehicleMedia error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa media của xe',
    });
  }
}

export async function getWebsiteImages(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM vehicle_images WHERE category = 'website' ORDER BY sort_order ASC`
    );
    return res.status(200).json({
      ok: true,
      data: result.rows.map(mapImageRow),
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] getWebsiteImages error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách ảnh website',
    });
  }
}

export async function getMediaStats(req: Request, res: Response) {
  try {
    const [errorRes, catRes] = await Promise.all([
      query(
        `SELECT vehicle_id, COUNT(*)::int as count
         FROM vehicle_images
         WHERE category = 'error' AND resolved = false
         GROUP BY vehicle_id`
      ),
      query(
        `SELECT vehicle_id, category
         FROM vehicle_images`
      ),
    ]);

    const errorImages = errorRes.rows.map((r) => ({
      vehicleId: r.vehicle_id,
      count: Number(r.count),
    }));

    const categoryImages = catRes.rows.map((r) => ({
      vehicle_id: r.vehicle_id,
      vehicleId: r.vehicle_id,
      category: r.category,
    }));

    return res.status(200).json({
      ok: true,
      data: {
        errorImages,
        totalErrors: errorImages.reduce((sum, item) => sum + item.count, 0),
        categoryImages,
      },
    });
  } catch (err: any) {
    console.error('[VehicleMedia Controller] getMediaStats error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải thống kê media',
    });
  }
}
