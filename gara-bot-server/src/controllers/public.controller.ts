import { Request, Response } from 'express';
import { query } from '../database/index.js';
import { generatePresignedDownloadUrl, isR2Configured } from '../storage/r2.service.js';

function isThumbnailRow(r: any): boolean {
  const p = String(r.path || r.url || '');
  return p.includes('_thumb_') || p.includes('/thumb_') || p.startsWith('thumb_');
}

/**
 * GET /api/public/vehicles
 * Lấy danh sách xe hiển thị trên Public Web từ view an toàn `public_vehicles`.
 * Thứ tự: public_sort_order ASC NULLS LAST, updated_at DESC.
 */
export async function getPublicVehicles(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, model, brand, year, fuel_type, mileage, color, sell_price, options, public_sort_order, is_coming_soon, updated_at 
       FROM public_vehicles 
       ORDER BY public_sort_order ASC NULLS LAST, updated_at DESC`
    );

    const data = result.rows.map((r) => ({
      id: r.id,
      model: r.model || '',
      brand: r.brand ?? null,
      year: r.year ? Number(r.year) : null,
      fuelType: r.fuel_type ?? null,
      mileage: r.mileage ?? null,
      color: r.color ?? null,
      // BẢO MẬT: Xe Sắp về (is_coming_soon = true) TUYỆT ĐỐI không trả giá nội bộ
      sellPrice: r.is_coming_soon ? null : (r.sell_price != null ? Number(r.sell_price) : null),
      options: r.options ?? null,
      publicSortOrder: r.public_sort_order != null ? Number(r.public_sort_order) : null,
      isComingSoon: Boolean(r.is_coming_soon),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    }));

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Public Controller] getPublicVehicles error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách xe công khai',
    });
  }
}

/**
 * GET /api/public/vehicles/:id
 * Lấy thông tin 1 xe công khai theo UUID.
 */
export async function getPublicVehicleById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, model, brand, year, fuel_type, mileage, color, sell_price, options, public_sort_order, is_coming_soon, updated_at 
       FROM public_vehicles 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe công khai',
      });
    }

    const r = result.rows[0];
    const data = {
      id: r.id,
      model: r.model || '',
      brand: r.brand ?? null,
      year: r.year ? Number(r.year) : null,
      fuelType: r.fuel_type ?? null,
      mileage: r.mileage ?? null,
      color: r.color ?? null,
      // BẢO MẬT: Xe Sắp về (is_coming_soon = true) TUYỆT ĐỐI không trả giá nội bộ
      sellPrice: r.is_coming_soon ? null : (r.sell_price != null ? Number(r.sell_price) : null),
      options: r.options ?? null,
      publicSortOrder: r.public_sort_order != null ? Number(r.public_sort_order) : null,
      isComingSoon: Boolean(r.is_coming_soon),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    };

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Public Controller] getPublicVehicleById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải thông tin xe',
    });
  }
}

async function signPublicImage(r: any) {
  let downloadUrl = r.url;
  const isLegacySupabase = typeof r.url === 'string' && r.url.includes('.supabase.co');
  const isHttpUrl = typeof r.url === 'string' && (r.url.startsWith('http://') || r.url.startsWith('https://'));

  // Nếu là ảnh R2 (dạng Object Key vehicles/...), tạo Presigned GET URL
  if (isR2Configured() && !isLegacySupabase && !isHttpUrl && r.url) {
    try {
      const presigned = await generatePresignedDownloadUrl('images', r.url);
      downloadUrl = presigned.url;
    } catch (err: any) {
      console.warn('[Public Controller] Failed to sign downloadUrl:', err.message);
    }
  }

  // Xử lý Thumbnail
  let thumbnailUrl = r.thumbnail;
  if (thumbnailUrl && isR2Configured()) {
    const isThumbHttp = thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://');
    if (!isThumbHttp) {
      try {
        const presignedThumb = await generatePresignedDownloadUrl('images', thumbnailUrl);
        thumbnailUrl = presignedThumb.url;
      } catch (err: any) {
        console.warn('[Public Controller] Failed to sign thumbnailUrl:', err.message);
        thumbnailUrl = null;
      }
    }
  }

  const finalThumbnail = thumbnailUrl || downloadUrl;

  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    url: downloadUrl,
    thumbnail: finalThumbnail,
    sortOrder: Number(r.sort_order ?? 0),
  };
}

/**
 * GET /api/public/images
 * Lấy toàn bộ ảnh category 'website' của mọi xe public.
 */
export async function getAllPublicImages(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, vehicle_id, url, thumbnail, sort_order 
       FROM public_vehicle_images 
       ORDER BY sort_order ASC, id ASC`
    );

    // Lọc bỏ record thumbnail riêng biệt (nếu có)
    const validRows = result.rows.filter((r) => !isThumbnailRow(r));

    const data = await Promise.all(validRows.map(signPublicImage));

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Public Controller] getAllPublicImages error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải ảnh công khai',
    });
  }
}

/**
 * GET /api/public/vehicles/:id/images
 * Lấy danh sách ảnh công khai của 1 xe cụ thể.
 */
export async function getPublicVehicleImages(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, vehicle_id, url, thumbnail, sort_order 
       FROM public_vehicle_images 
       WHERE vehicle_id = $1 
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const validRows = result.rows.filter((r) => !isThumbnailRow(r));
    const data = await Promise.all(validRows.map(signPublicImage));

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Public Controller] getPublicVehicleImages error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải ảnh của xe',
    });
  }
}

/**
 * GET /api/public/settings
 * Lấy cấu hình liên hệ website công khai (không yêu cầu JWT token).
 */
export async function getPublicSettings(req: Request, res: Response) {
  try {
    const result = await query(`SELECT * FROM website_settings LIMIT 1`);
    const r = result.rows[0] || null;

    return res.status(200).json({
      ok: true,
      data: r,
    });
  } catch (err: any) {
    console.error('[Public Controller] getPublicSettings error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải cấu hình website',
    });
  }
}

/**
 * GET /api/public/options
 * Lấy danh mục tùy chọn xe công khai (không yêu cầu JWT token).
 */
export async function getPublicOptionDefs(req: Request, res: Response) {
  try {
    const result = await query(`SELECT * FROM vehicle_option_defs ORDER BY sort_order ASC, id ASC`);
    const data = result.rows.map((r) => ({
      id: r.id,
      groupKey: r.group_key,
      groupLabel: r.group_label,
      key: r.key,
      label: r.label,
      sortOrder: Number(r.sort_order ?? 0),
    }));

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Public Controller] getPublicOptionDefs error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh mục tùy chọn xe',
    });
  }
}
