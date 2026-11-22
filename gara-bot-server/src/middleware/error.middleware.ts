import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Loại bỏ mật khẩu, chuỗi kết nối database và các thông tin nhạy cảm khỏi log
  const sanitizedMessage = (err.message || 'Lỗi máy chủ nội bộ')
    .replace(/(password|secret|key|token)=[^& ]+/gi, '$1=***')
    .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@');

  console.error('[Server Error]', sanitizedMessage);

  const statusCode = err.statusCode || err.status || 500;

  // Tuyệt đối không trả về stack trace hoặc chi tiết kết nối database cho client
  res.status(statusCode).json({
    ok: false,
    error: err.code || 'internal_server_error',
    message: statusCode === 500 ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' : sanitizedMessage,
  });
}
