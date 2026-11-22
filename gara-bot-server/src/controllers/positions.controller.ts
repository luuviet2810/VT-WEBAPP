import { Request, Response } from 'express';
import { query } from '../database/index.js';

export async function getPositions(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT id, name, sort_order, created_at, updated_at
      FROM positions
      ORDER BY sort_order ASC, created_at ASC
    `);

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      order: row.sort_order,
      sort_order: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Positions Controller] getPositions error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách vị trí bãi đỗ',
    });
  }
}

export async function getPositionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, sort_order, created_at, updated_at FROM positions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy vị trí',
      });
    }

    const row = result.rows[0];
    return res.status(200).json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        order: row.sort_order,
        sort_order: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[Positions Controller] getPositionById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Lỗi khi tìm vị trí',
    });
  }
}

export async function createPosition(req: Request, res: Response) {
  try {
    const { name, sort_order, order } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Tên vị trí bãi đỗ là bắt buộc',
      });
    }

    let targetOrder = sort_order ?? order;
    if (targetOrder === undefined || targetOrder === null) {
      const maxOrderRes = await query('SELECT MAX(sort_order) as max_order FROM positions');
      targetOrder = (maxOrderRes.rows[0]?.max_order ?? -1) + 1;
    }

    const insertRes = await query(
      `INSERT INTO positions (name, sort_order, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       RETURNING *`,
      [name.trim(), Number(targetOrder) || 0]
    );

    const row = insertRes.rows[0];
    return res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        order: row.sort_order,
        sort_order: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[Positions Controller] createPosition error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tạo mới vị trí bãi đỗ',
    });
  }
}

export async function updatePosition(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, sort_order, order } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      values.push(name.trim());
      fields.push(`name = $${values.length}`);
    }

    const targetOrder = sort_order ?? order;
    if (targetOrder !== undefined) {
      values.push(Number(targetOrder));
      fields.push(`sort_order = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có dữ liệu cập nhật',
      });
    }

    fields.push('updated_at = now()');
    values.push(id);

    const updateRes = await query(
      `UPDATE positions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy vị trí để cập nhật',
      });
    }

    const row = updateRes.rows[0];
    return res.status(200).json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        order: row.sort_order,
        sort_order: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[Positions Controller] updatePosition error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật vị trí bãi đỗ',
    });
  }
}

export async function deletePosition(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Kiểm tra có xe nào đang đỗ ở vị trí này không
    const checkVehicles = await query('SELECT count(*) FROM vehicles WHERE position_id = $1', [id]);
    const vehicleCount = parseInt(checkVehicles.rows[0]?.count || '0', 10);
    if (vehicleCount > 0) {
      return res.status(400).json({
        ok: false,
        error: 'position_in_use',
        message: `Không thể xóa vị trí này vì đang có ${vehicleCount} xe đỗ tại đây.`,
      });
    }

    const deleteRes = await query('DELETE FROM positions WHERE id = $1 RETURNING id, name', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy vị trí để xóa',
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Đã xóa vị trí ${deleteRes.rows[0].name} thành công`,
    });
  } catch (err: any) {
    console.error('[Positions Controller] deletePosition error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa vị trí bãi đỗ',
    });
  }
}

export async function reorderPositions(req: Request, res: Response) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'items phải là mảng { id, sort_order }',
      });
    }

    for (const item of items) {
      if (item.id && typeof item.sort_order === 'number') {
        await query('UPDATE positions SET sort_order = $1, updated_at = now() WHERE id = $2', [
          item.sort_order,
          item.id,
        ]);
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã cập nhật thứ tự vị trí thành công',
    });
  } catch (err: any) {
    console.error('[Positions Controller] reorderPositions error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể sắp xếp lại vị trí',
    });
  }
}
