import { Router } from 'express';
import {
  getPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  reorderPositions,
} from '../controllers/positions.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem danh sách vị trí: Cho phép nhân viên và admin
router.get('/', authenticateJwt, requireStaffOrAdmin, getPositions);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getPositionById);

// Thêm, sửa, sắp xếp lại vị trí: Cho phép nhân viên và admin
router.post('/', authenticateJwt, requireStaffOrAdmin, createPosition);
router.put('/reorder', authenticateJwt, requireStaffOrAdmin, reorderPositions);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updatePosition);
router.delete('/:id', authenticateJwt, requireStaffOrAdmin, deletePosition);

export default router;
