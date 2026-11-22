import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapEmployeeRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    avatar: row.avatar ?? undefined,
    role: row.role,
    isAdmin: Boolean(row.is_admin || row.role === 'admin'),
    is_admin: Boolean(row.is_admin || row.role === 'admin'),
    status: row.status,
    disabled: Boolean(row.disabled),
    passkeyEnabled: Boolean(row.passkey_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEmployees(req: Request, res: Response) {
  try {
    // Chỉ chọn các trường an toàn, TUYỆT ĐỐI không chọn password_hash hoặc auth_id
    const result = await query(`
      SELECT id, name, phone, email, avatar, role, is_admin, status, disabled, passkey_enabled, created_at, updated_at
      FROM users
      ORDER BY name ASC
    `);

    const data = result.rows.map(mapEmployeeRow);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Employees Controller] getEmployees error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách nhân viên',
    });
  }
}

export async function getEmployeeById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, phone, email, avatar, role, is_admin, status, disabled, passkey_enabled, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhân viên',
      });
    }

    const data = mapEmployeeRow(result.rows[0]);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Employees Controller] getEmployeeById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tìm thông tin nhân viên',
    });
  }
}

export async function updateEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const patch = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) {
      values.push(patch.name.trim());
      fields.push(`name = $${values.length}`);
    }

    if (patch.phone !== undefined) {
      values.push(patch.phone ? patch.phone.trim() : null);
      fields.push(`phone = $${values.length}`);
    }

    if (patch.disabled !== undefined) {
      values.push(Boolean(patch.disabled));
      fields.push(`disabled = $${values.length}`);
    }

    if (patch.role !== undefined) {
      values.push(patch.role);
      fields.push(`role = $${values.length}`);
      values.push(patch.role === 'admin');
      fields.push(`is_admin = $${values.length}`);
    }

    if (patch.status !== undefined) {
      values.push(patch.status);
      fields.push(`status = $${values.length}`);
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

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, phone, email, avatar, role, is_admin, status, disabled, passkey_enabled, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhân viên để cập nhật',
      });
    }

    const data = mapEmployeeRow(result.rows[0]);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Employees Controller] updateEmployee error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật thông tin nhân viên',
    });
  }
}

export async function deleteEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const userResult = await query('SELECT id, role, is_admin FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhân viên',
      });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa nhân viên thành công',
    });
  } catch (err: any) {
    console.error('[Employees Controller] deleteEmployee error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa nhân viên',
    });
  }
}
