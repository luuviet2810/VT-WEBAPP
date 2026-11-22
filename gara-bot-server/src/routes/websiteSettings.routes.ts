import { Router } from 'express';
import {
  getWebsiteSettings,
  updateWebsiteSettings,
} from '../controllers/websiteSettings.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireAdmin, requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem cấu hình website: Mọi nhân viên hoặc gọi công khai
router.get('/', authenticateJwt, requireStaffOrAdmin, getWebsiteSettings);

// Cập nhật cấu hình website: Chỉ Admin
router.put('/', authenticateJwt, requireAdmin, updateWebsiteSettings);

export default router;
