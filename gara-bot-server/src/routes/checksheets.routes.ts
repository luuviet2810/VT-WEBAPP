import { Router } from 'express';
import {
  getCheckSheets,
  getCheckSheetById,
  createCheckSheet,
  updateCheckSheet,
  deleteCheckSheet,
  getCheckSheetPhotos,
  addCheckSheetPhoto,
  deleteCheckSheetPhoto,
} from '../controllers/checksheets.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// CheckSheet photo operations (đặt trước /:id nếu cần, nhưng /:id/photos là sub-path hợp lệ)
router.get('/:id/photos', authenticateJwt, requireStaffOrAdmin, getCheckSheetPhotos);
router.post('/:id/photos', authenticateJwt, requireStaffOrAdmin, addCheckSheetPhoto);
router.delete('/:id/photos', authenticateJwt, requireStaffOrAdmin, deleteCheckSheetPhoto);

// Toàn bộ thao tác checksheet cho phép staff và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getCheckSheets);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getCheckSheetById);
router.post('/', authenticateJwt, requireStaffOrAdmin, createCheckSheet);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateCheckSheet);
router.patch('/:id', authenticateJwt, requireStaffOrAdmin, updateCheckSheet);
router.delete('/:id', authenticateJwt, requireStaffOrAdmin, deleteCheckSheet);

export default router;
