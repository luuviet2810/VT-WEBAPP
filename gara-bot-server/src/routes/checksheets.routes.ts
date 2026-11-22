import { Router } from 'express';
import {
  getCheckSheets,
  getCheckSheetById,
  createCheckSheet,
  updateCheckSheet,
  deleteCheckSheet,
} from '../controllers/checksheets.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Toàn bộ thao tác checksheet cho phép staff và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getCheckSheets);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getCheckSheetById);
router.post('/', authenticateJwt, requireStaffOrAdmin, createCheckSheet);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateCheckSheet);
router.patch('/:id', authenticateJwt, requireStaffOrAdmin, updateCheckSheet);
router.delete('/:id', authenticateJwt, requireStaffOrAdmin, deleteCheckSheet);

export default router;
