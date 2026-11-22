import { Request, Response } from 'express';
import { query } from '../database/index.js';

export async function getWebsiteSettings(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM website_settings WHERE id = 1 LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        ok: true,
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('[WebsiteSettings Controller] getWebsiteSettings error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải cấu hình website',
    });
  }
}

export async function updateWebsiteSettings(req: Request, res: Response) {
  try {
    const patch = req.body;
    const allowedKeys = [
      'office_address_1',
      'office_address_2',
      'phone_display',
      'phone_raw',
      'kakao_url',
      'tiktok_url',
      'tiktok_display',
      'facebook_url',
      'messenger_url',
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowedKeys) {
      if (patch[key] !== undefined) {
        values.push(patch[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có dữ liệu cập nhật',
      });
    }

    fields.push('updated_at = now()');

    const result = await query(
      `UPDATE website_settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`,
      values
    );

    return res.status(200).json({
      ok: true,
      data: result.rows[0] || null,
    });
  } catch (err: any) {
    console.error('[WebsiteSettings Controller] updateWebsiteSettings error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật cấu hình website',
    });
  }
}
