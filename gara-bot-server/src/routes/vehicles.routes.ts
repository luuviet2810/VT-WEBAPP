import { Router } from 'express';
import {
  getVehicles,
  getVehicleById,
  getVehicleByPlate,
  createVehicle,
  updateVehicle,
  moveVehicle,
  deleteVehicle,
} from '../controllers/vehicles.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin, requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Đọc danh sách xe và chi tiết: Cho phép nhân viên và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getVehicles);
router.get('/by-plate/:plate', authenticateJwt, requireStaffOrAdmin, getVehicleByPlate);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getVehicleById);

// Thêm, cập nhật, di chuyển xe: Cho phép nhân viên và admin
router.post('/', authenticateJwt, requireStaffOrAdmin, createVehicle);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateVehicle);
router.patch('/:id', authenticateJwt, requireStaffOrAdmin, updateVehicle);
router.post('/:id/move', authenticateJwt, requireStaffOrAdmin, moveVehicle);

// Xóa xe: CHỈ DÀNH CHO ADMIN
router.delete('/:id', authenticateJwt, requireAdmin, deleteVehicle);

export default router;
