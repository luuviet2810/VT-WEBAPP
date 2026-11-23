import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  approveEmployee,
  rejectEmployee,
} from '../controllers/employees.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin, requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem danh sách và chi tiết nhân viên: Cho phép nhân viên và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getEmployees);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getEmployeeById);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateEmployee);
router.delete('/:id', authenticateJwt, requireAdmin, deleteEmployee);

// Phê duyệt và từ chối tài khoản: CHỈ Admin mới có quyền
router.post('/:id/approve', authenticateJwt, requireAdmin, approveEmployee);
router.post('/:id/reject', authenticateJwt, requireAdmin, rejectEmployee);

export default router;
