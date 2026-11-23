import { Router } from 'express';
import {
  loginController,
  registerController,
  getCurrentUser,
  logoutController,
  verifyTokenEndpoint,
  loginSchema,
  registerSchema,
  tokenVerifySchema,
} from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

// Đăng ký tài khoản mới (Public Self-Registration)
router.post('/register', validateBody(registerSchema), registerController);

// Đăng nhập hệ thống (kiểm tra mật khẩu bcrypt, rate limit 5 lần / 15 phút)
router.post('/login', validateBody(loginSchema), loginController);

// Lấy thông tin tài khoản hiện tại (bảo vệ bởi authenticateJwt)
router.get('/me', authenticateJwt, getCurrentUser);

// Kiểm tra quyền Quản trị viên (bảo vệ bởi authenticateJwt và requireAdmin)
router.get('/admin-check', authenticateJwt, requireAdmin, (req, res) => {
  res.json({
    ok: true,
    message: 'Quyền Quản trị viên đã được xác thực thành công.',
    user: req.user,
  });
});

// Đăng xuất phiên làm việc
router.post('/logout', authenticateJwt, logoutController);

// Xác minh tính hợp lệ của token
router.post('/verify', validateBody(tokenVerifySchema), verifyTokenEndpoint);

export default router;
