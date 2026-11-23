import { Request, Response } from 'express';
import { query } from '../database/index.js';
import { logActivity } from '../services/activity-log.service.js';

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

    // 1. Kiểm tra quyền bảo mật:
    // Chỉ Quản trị viên (admin) mới được đổi role, status, hoặc disabled
    const isSensitiveChange = patch.role !== undefined || patch.status !== undefined || patch.disabled !== undefined;
    if (isSensitiveChange && req.user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'forbidden',
        message: 'Chỉ Quản trị viên mới có quyền thay đổi trạng thái hoặc vai trò tài khoản.',
      });
    }

    // Nếu không phải admin, người dùng chỉ được sửa thông tin cá nhân của chính mình
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      return res.status(403).json({
        ok: false,
        error: 'forbidden',
        message: 'Bạn chỉ có quyền cập nhật thông tin tài khoản của chính mình.',
      });
    }

    // Lấy thông tin user hiện tại để đối chiếu
    const existing = await query('SELECT id, name, email, role, status, disabled FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy người dùng để cập nhật',
      });
    }
    const oldUser = existing.rows[0];

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

    // Ghi activity log tương ứng
    if (patch.status !== undefined && patch.status !== oldUser.status) {
      if (patch.status === 'approved') {
        await logActivity({
          userId: req.user?.id,
          action: 'approve',
          entityType: 'user',
          entityId: id,
          description: `Admin ${req.user?.name || ''} đã phê duyệt tài khoản ${data.name} (${data.email})`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string,
        });
      } else if (patch.status === 'rejected') {
        await logActivity({
          userId: req.user?.id,
          action: 'reject',
          entityType: 'user',
          entityId: id,
          description: `Admin ${req.user?.name || ''} đã từ chối tài khoản ${data.name} (${data.email})`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string,
        });
      }
    } else if (patch.disabled !== undefined && patch.disabled !== oldUser.disabled) {
      await logActivity({
        userId: req.user?.id,
        action: patch.disabled ? 'disable' : 'enable',
        entityType: 'user',
        entityId: id,
        description: `Admin ${req.user?.name || ''} đã ${patch.disabled ? 'vô hiệu hóa' : 'kích hoạt lại'} tài khoản ${data.name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
    } else {
      await logActivity({
        userId: req.user?.id,
        action: 'update',
        entityType: 'user',
        entityId: id,
        description: `Cập nhật thông tin tài khoản ${data.name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
    }

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

/**
 * Phê duyệt tài khoản người dùng (Admin only)
 */
export async function approveEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name, email, status FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy tài khoản để phê duyệt',
      });
    }
    const targetUser = existing.rows[0];

    const result = await query(
      `UPDATE users
       SET status = 'approved'::user_status, disabled = false, updated_at = now()
       WHERE id = $1
       RETURNING id, name, phone, email, avatar, role, is_admin, status, disabled, passkey_enabled, created_at, updated_at`,
      [id]
    );

    const data = mapEmployeeRow(result.rows[0]);

    await logActivity({
      userId: req.user?.id,
      action: 'approve',
      entityType: 'user',
      entityId: id,
      description: `Admin ${req.user?.name || ''} đã phê duyệt tài khoản ${targetUser.name} (${targetUser.email})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    return res.status(200).json({
      ok: true,
      message: `Đã phê duyệt tài khoản "${targetUser.name}" thành công`,
      data,
    });
  } catch (err: any) {
    console.error('[Employees Controller] approveEmployee error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể phê duyệt tài khoản',
    });
  }
}

/**
 * Từ chối tài khoản người dùng (Admin only)
 */
export async function rejectEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name, email, status FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy tài khoản để từ chối',
      });
    }
    const targetUser = existing.rows[0];

    const result = await query(
      `UPDATE users
       SET status = 'rejected'::user_status, updated_at = now()
       WHERE id = $1
       RETURNING id, name, phone, email, avatar, role, is_admin, status, disabled, passkey_enabled, created_at, updated_at`,
      [id]
    );

    const data = mapEmployeeRow(result.rows[0]);

    await logActivity({
      userId: req.user?.id,
      action: 'reject',
      entityType: 'user',
      entityId: id,
      description: `Admin ${req.user?.name || ''} đã từ chối tài khoản ${targetUser.name} (${targetUser.email})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    return res.status(200).json({
      ok: true,
      message: `Đã từ chối tài khoản "${targetUser.name}"`,
      data,
    });
  } catch (err: any) {
    console.error('[Employees Controller] rejectEmployee error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể từ chối tài khoản',
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
