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
import { logActivity } from './activity-log.service.js';

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
      message: 'Tài khoản của bạn đã bị từ chối phê duyệt. Vui lòng liên hệ Quản trị viên.',
    };
  }

  // 6. Kiểm tra tài khoản đang chờ duyệt (status = 'pending')
  if (userRow.status !== 'approved') {
    return {
      ok: false,
      statusCode: 403,
      error: 'account_pending',
      message: 'Tài khoản của bạn đang chờ Admin phê duyệt. Bạn sẽ có thể đăng nhập sau khi được duyệt.',
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

export interface RegisterResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  message?: string;
  data?: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      createdAt: string;
    };
  };
}

/**
 * Đăng ký tài khoản người dùng mới (Public Self-Registration)
 * - Mặc định vai trò là 'staff', trạng thái 'pending', is_admin = false
 * - Mật khẩu được mã hóa bằng bcrypt với salt rounds = 10
 * - Tuyệt đối không trả về password hay password_hash trong response
 * - Ghi nhận lịch sử hoạt động vào bảng activity_logs
 */
export async function register(
  fullName: string,
  rawEmail: string,
  rawPassword: string,
  clientIp?: string,
  userAgent?: string
): Promise<RegisterResult> {
  const normalizedEmail = (rawEmail || '').trim().toLowerCase();
  const trimmedName = (fullName || '').trim();

  // 1. Kiểm tra họ và tên
  if (!trimmedName || trimmedName.length < 2) {
    return {
      ok: false,
      statusCode: 400,
      error: 'invalid_name',
      message: 'Họ và tên phải có ít nhất 2 ký tự.',
    };
  }

  // 2. Kiểm tra định dạng email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return {
      ok: false,
      statusCode: 400,
      error: 'invalid_email',
      message: 'Định dạng email không hợp lệ.',
    };
  }

  // 3. Kiểm tra độ dài mật khẩu (tối thiểu 6 ký tự)
  if (!rawPassword || rawPassword.length < 6) {
    return {
      ok: false,
      statusCode: 400,
      error: 'weak_password',
      message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.',
    };
  }

  // 4. Kiểm tra email đã tồn tại hay chưa
  try {
    const existing = await query<any>(
      `SELECT id FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1;`,
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return {
        ok: false,
        statusCode: 409,
        error: 'email_exists',
        message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác.',
      };
    }
  } catch (err: any) {
    console.error('[AuthService] Lỗi kiểm tra email tồn tại:', err.message);
    return {
      ok: false,
      statusCode: 500,
      error: 'database_error',
      message: 'Lỗi truy vấn cơ sở dữ liệu khi kiểm tra email.',
    };
  }

  // 5. Băm mật khẩu an toàn bằng bcryptjs
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(rawPassword, 10);
  } catch (bcryptErr: any) {
    console.error('[AuthService] Lỗi băm mật khẩu:', bcryptErr.message);
    return {
      ok: false,
      statusCode: 500,
      error: 'encryption_error',
      message: 'Lỗi hệ thống khi mã hóa mật khẩu.',
    };
  }

  // 6. Lưu tài khoản mới vào cơ sở dữ liệu Neon PostgreSQL
  // Luôn bắt buộc role = 'staff', is_admin = false, status = 'pending', disabled = false
  let newUser: any;
  try {
    const result = await query<any>(
      `INSERT INTO users (name, email, password_hash, role, is_admin, status, disabled, created_at, updated_at)
       VALUES ($1, $2, $3, 'staff'::user_role, false, 'pending'::user_status, false, now(), now())
       RETURNING id, name, email, role, status, created_at;`,
      [trimmedName, normalizedEmail, passwordHash]
    );
    newUser = result.rows[0];
  } catch (dbErr: any) {
    console.error('[AuthService] Lỗi tạo tài khoản mới:', dbErr.message);
    return {
      ok: false,
      statusCode: 500,
      error: 'database_error',
      message: 'Lỗi cơ sở dữ liệu khi tạo tài khoản.',
    };
  }

  // 7. Ghi nhận activity log
  await logActivity({
    userId: newUser.id,
    action: 'register',
    entityType: 'user',
    entityId: newUser.id,
    description: `Người dùng ${trimmedName} (${normalizedEmail}) đăng ký tài khoản mới (chờ duyệt)`,
    ipAddress: clientIp || null,
    userAgent: userAgent || null,
  });

  return {
    ok: true,
    statusCode: 201,
    message: 'Đăng ký thành công! Tài khoản của bạn đang chờ Admin phê duyệt. Bạn sẽ có thể đăng nhập sau khi được duyệt.',
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at,
      },
    },
  };
}
