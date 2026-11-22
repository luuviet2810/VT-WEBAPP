import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      message: 'Yêu cầu đăng nhập để thực hiện tác vụ này.',
    });
  }

  // Luôn dùng role thực tế mới nhất đã được đối chiếu từ Neon bởi authenticateJwt
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'forbidden',
      message: 'Tác vụ này chỉ dành riêng cho Quản trị viên (Admin).',
    });
  }

  next();
}

export function requireStaffOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      message: 'Yêu cầu đăng nhập để thực hiện tác vụ này.',
    });
  }

  // Cho phép cả staff và admin đã được phê duyệt
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({
      ok: false,
      error: 'forbidden',
      message: 'Quyền truy cập bị từ chối. Yêu cầu quyền Nhân viên hoặc Quản trị viên.',
    });
  }

  next();
}
