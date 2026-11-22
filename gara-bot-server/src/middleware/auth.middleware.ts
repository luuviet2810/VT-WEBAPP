import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../database/index.js';

export interface JwtTokenPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  disabled: boolean;
  phone?: string | null;
  avatar?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      message: 'Thiếu header Authorization',
    });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      message: 'Định dạng Authorization không hợp lệ. Kỳ vọng: Bearer <token>',
    });
  }

  let decoded: JwtTokenPayload;
  try {
    decoded = jwt.verify(token, config.jwt.secret) as JwtTokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: 'token_expired',
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    return res.status(401).json({
      ok: false,
      error: 'invalid_token',
      message: 'Mã xác thực JWT không hợp lệ hoặc đã bị can thiệp.',
    });
  }

  if (!decoded || !decoded.id) {
    return res.status(401).json({
      ok: false,
      error: 'invalid_token',
      message: 'Mã xác thực không chứa thông tin định danh hợp lệ.',
    });
  }

  // Luôn đối chiếu trạng thái thực tế mới nhất từ Neon PostgreSQL
  try {
    const userRes = await query<any>(
      `SELECT id, name, email, role, status, disabled, phone, avatar
       FROM users
       WHERE id = $1
       LIMIT 1;`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: 'user_not_found',
        message: 'Tài khoản không tồn tại hoặc đã bị xóa.',
      });
    }

    const liveUser = userRes.rows[0];

    // Từ chối ngay nếu tài khoản bị khóa hoặc không ở trạng thái approved
    if (liveUser.disabled === true) {
      return res.status(403).json({
        ok: false,
        error: 'account_disabled',
        message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.',
      });
    }

    if (liveUser.status !== 'approved') {
      return res.status(403).json({
        ok: false,
        error: 'account_inactive',
        message: 'Tài khoản chưa được phê duyệt hoặc đã bị từ chối.',
      });
    }

    // Gán dữ liệu tài khoản THỰC TẾ mới nhất vào request
    req.user = {
      id: liveUser.id,
      name: liveUser.name,
      email: liveUser.email,
      role: liveUser.role, // Live role from Neon
      status: liveUser.status, // Live status from Neon
      disabled: Boolean(liveUser.disabled),
      phone: liveUser.phone || null,
      avatar: liveUser.avatar || null,
    };

    next();
  } catch (dbErr: any) {
    return res.status(500).json({
      ok: false,
      error: 'database_error',
      message: 'Không thể xác thực trạng thái tài khoản vào thời điểm này.',
    });
  }
}
