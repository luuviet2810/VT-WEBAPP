import { Router } from 'express';
import {
  getVehicleOptions,
  createVehicleOption,
  updateVehicleOption,
  deleteVehicleOption,
} from '../controllers/vehicleOptions.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin, requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem danh sách tùy chọn xe: staff/admin
router.get('/', authenticateJwt, requireStaffOrAdmin, getVehicleOptions);

// Thêm, sửa, xóa tùy chọn xe: admin
router.post('/', authenticateJwt, requireAdmin, createVehicleOption);
router.put('/:id', authenticateJwt, requireAdmin, updateVehicleOption);
router.delete('/:id', authenticateJwt, requireAdmin, deleteVehicleOption);

export default router;
