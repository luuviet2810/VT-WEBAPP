import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapOptionRow(r: any) {
  return {
    id: r.id,
    groupKey: r.group_key,
    group_key: r.group_key,
    groupLabel: r.group_label,
    group_label: r.group_label,
    key: r.key,
    label: r.label,
    sortOrder: Number(r.sort_order ?? 0),
    sort_order: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
    created_at: r.created_at,
    updatedAt: r.updated_at,
    updated_at: r.updated_at,
  };
}

export async function getVehicleOptions(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM vehicle_option_defs ORDER BY sort_order ASC`
    );
    return res.status(200).json({
      ok: true,
      data: result.rows.map(mapOptionRow),
    });
  } catch (err: any) {
    console.error('[VehicleOptions Controller] getVehicleOptions error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách tùy chọn xe',
    });
  }
}

export async function createVehicleOption(req: Request, res: Response) {
  try {
    const { groupKey, groupLabel, label, sortOrder, key } = req.body;
    if (!label) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Thiếu nhãn tùy chọn (label)',
      });
    }

    const effectiveKey = key || `opt_${Date.now().toString(36)}`;
    const effectiveGroupKey = groupKey || 'other';
    const effectiveGroupLabel = groupLabel || 'Khác';
    const effectiveSortOrder = Number(sortOrder ?? 0);

    const result = await query(
      `INSERT INTO vehicle_option_defs (group_key, group_label, key, label, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [effectiveGroupKey, effectiveGroupLabel, effectiveKey, label.trim(), effectiveSortOrder]
    );

    return res.status(201).json({
      ok: true,
      data: mapOptionRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleOptions Controller] createVehicleOption error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tạo tùy chọn xe mới',
    });
  }
}

export async function updateVehicleOption(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { label, sortOrder, groupKey, groupLabel } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (label !== undefined) {
      values.push(label.trim());
      fields.push(`label = $${values.length}`);
    }
    if (sortOrder !== undefined) {
      values.push(Number(sortOrder));
      fields.push(`sort_order = $${values.length}`);
    }
    if (groupKey !== undefined) {
      values.push(groupKey.trim());
      fields.push(`group_key = $${values.length}`);
    }
    if (groupLabel !== undefined) {
      values.push(groupLabel.trim());
      fields.push(`group_label = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có dữ liệu cập nhật',
      });
    }

    values.push(id);
    const result = await query(
      `UPDATE vehicle_option_defs SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy tùy chọn xe',
      });
    }

    return res.status(200).json({
      ok: true,
      data: mapOptionRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleOptions Controller] updateVehicleOption error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật tùy chọn xe',
    });
  }
}

export async function deleteVehicleOption(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM vehicle_option_defs WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy tùy chọn xe để xóa',
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa tùy chọn xe thành công',
    });
  } catch (err: any) {
    console.error('[VehicleOptions Controller] deleteVehicleOption error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa tùy chọn xe',
    });
  }
}
