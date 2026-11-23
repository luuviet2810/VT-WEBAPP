import { Request, Response } from 'express';
import { z } from 'zod';
import { login, register, verifyAuthToken } from '../services/auth.service.js';

export const loginSchema = z.object({
  email: z.string().trim().email('Định dạng email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100, 'Họ và tên tối đa 100 ký tự'),
  email: z.string().trim().email('Định dạng email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export const tokenVerifySchema = z.object({
  token: z.string().min(10, 'Token không hợp lệ'),
});

export async function registerController(req: Request, res: Response) {
  const { fullName, email, password } = req.body;

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || undefined;

  const result = await register(fullName, email, password, clientIp, userAgent);

  if (!result.ok) {
    return res.status(result.statusCode).json({
      ok: false,
      error: result.error,
      message: result.message,
    });
  }

  return res.status(result.statusCode).json({
    ok: true,
    message: result.message,
    data: result.data,
  });
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body;

  // Lấy IP của client (hỗ trợ reverse proxy headers)
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '127.0.0.1';

  const result = await login(email, password, clientIp);

  if (!result.ok) {
    return res.status(result.statusCode).json({
      ok: false,
      error: result.error,
      message: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    data: result.data,
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      message: 'Không tìm thấy phiên làm việc người dùng.',
    });
  }

  // Trả về thông tin tài khoản an toàn, loại bỏ các trường nhạy cảm
  res.json({
    ok: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        phone: req.user.phone || null,
        avatar: req.user.avatar || null,
      },
    },
  });
}

export async function logoutController(req: Request, res: Response) {
  // Làm rõ cơ chế logout thực tế: JWT là stateless bearer token.
  // Quá trình đăng xuất an toàn yêu cầu client xóa bỏ token khỏi bộ nhớ / localStorage / cookie.
  res.json({
    ok: true,
    message: 'Đăng xuất thành công. Vui lòng xóa mã xác thực (token) ở phía client.',
  });
}

export async function verifyTokenEndpoint(req: Request, res: Response) {
  const { token } = req.body;
  try {
    const payload = verifyAuthToken(token);
    res.json({
      ok: true,
      data: {
        valid: true,
        user: payload,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      data: {
        valid: false,
      },
      error: 'invalid_token',
      message: err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
    });
  }
}
