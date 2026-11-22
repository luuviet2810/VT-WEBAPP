import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { query } from '../database/index.js';
import { AuthUser, JwtTokenPayload } from '../middleware/auth.middleware.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogin,
} from './rate-limit.service.js';

export interface LoginResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  message?: string;
  data?: {
    token: string;
    user: Omit<AuthUser, 'disabled'>;
  };
}

export function signAuthToken(user: { id: string; email: string; name: string }): string {
  // Chỉ đưa thông tin định danh tối thiểu vào JWT payload, tuyệt đối không đưa password_hash
  const payload: JwtTokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  return jwt.sign(payload, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): JwtTokenPayload {
  return jwt.verify(token, config.jwt.secret) as JwtTokenPayload;
}

export async function login(
  rawEmail: string,
  rawPassword: string,
  clientIp: string
): Promise<LoginResult> {
  const normalizedEmail = (rawEmail || '').trim().toLowerCase();

  // 1. Kiểm tra Rate Limiting (5 lần thử thất bại trong 15 phút theo IP và Email)
  const rateLimitStatus = await checkLoginRateLimit(clientIp, normalizedEmail);
  if (rateLimitStatus.blocked) {
    const minutesLeft = Math.ceil(rateLimitStatus.retryAfterSeconds / 60);
    return {
      ok: false,
      statusCode: 429,
      error: 'too_many_requests',
      message: `Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau ${minutesLeft} phút.`,
    };
  }

  // 2. Truy vấn tài khoản từ Neon PostgreSQL
  let userRow: any = null;
  try {
    const result = await query<any>(
      `SELECT id, name, email, role, status, disabled, password_hash, phone, avatar
       FROM users
       WHERE LOWER(TRIM(email)) = $1
       LIMIT 1;`,
      [normalizedEmail]
    );
    if (result.rows.length > 0) {
      userRow = result.rows[0];
    }
  } catch (err: any) {
    return {
      ok: false,
      statusCode: 500,
      error: 'database_error',
      message: 'Lỗi truy vấn cơ sở dữ liệu khi đăng nhập.',
    };
  }

  // 3. Nếu tài khoản không tồn tại -> Báo lỗi chung không tiết lộ email có tồn tại hay không
  if (!userRow) {
    await recordFailedLogin(clientIp, normalizedEmail);
    return {
      ok: false,
      statusCode: 401,
      error: 'invalid_credentials',
      message: 'Email hoặc mật khẩu không đúng.',
    };
  }

  // 4. Kiểm tra tài khoản bị vô hiệu hóa (disabled = true)
  if (userRow.disabled === true) {
    return {
      ok: false,
      statusCode: 403,
      error: 'account_disabled',
      message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.',
    };
  }

  // 5. Kiểm tra tài khoản bị từ chối phê duyệt (status = 'rejected')
  if (userRow.status === 'rejected') {
    return {
      ok: false,
      statusCode: 403,
      error: 'account_rejected',
      message: 'Tài khoản chưa được phê duyệt hoặc đã bị từ chối.',
    };
  }

  // 6. Kiểm tra tài khoản đang chờ duyệt (status = 'pending')
  if (userRow.status !== 'approved') {
    return {
      ok: false,
      statusCode: 403,
      error: 'account_pending',
      message: 'Tài khoản đang chờ Quản trị viên phê duyệt.',
    };
  }

  // 7. Kiểm tra tài khoản chưa có password_hash (NULL)
  if (!userRow.password_hash) {
    return {
      ok: false,
      statusCode: 400,
      error: 'password_not_set',
      message: 'Tài khoản chưa được thiết lập mật khẩu.',
    };
  }

  // 8. Xác minh mật khẩu bằng bcryptjs.compare()
  let isPasswordValid = false;
  try {
    isPasswordValid = await bcrypt.compare(rawPassword, userRow.password_hash);
  } catch (bcryptErr: any) {
    console.error('[AuthService] Lỗi khi kiểm tra bcrypt hash:', bcryptErr.message);
  }

  if (!isPasswordValid) {
    await recordFailedLogin(clientIp, normalizedEmail);
    return {
      ok: false,
      statusCode: 401,
      error: 'invalid_credentials',
      message: 'Email hoặc mật khẩu không đúng.',
    };
  }

  // 9. Đăng nhập thành công -> Xóa bộ đếm lỗi đăng nhập cho IP & Email này
  await clearFailedLogin(clientIp, normalizedEmail);

  // 10. Phát JWT Token HS256, hạn 7 ngày
  const token = signAuthToken({
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      token,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        status: userRow.status,
        phone: userRow.phone || null,
        avatar: userRow.avatar || null,
      },
    },
  };
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const result = await query<any>(
    `SELECT id, name, email, role, status, disabled, phone, avatar
     FROM users
     WHERE id = $1
     LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    disabled: Boolean(row.disabled),
    phone: row.phone || null,
    avatar: row.avatar || null,
  };
}
