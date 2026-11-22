import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employees.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin, requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem danh sách và chi tiết nhân viên: Cho phép nhân viên và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getEmployees);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getEmployeeById);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateEmployee);
router.delete('/:id', authenticateJwt, requireAdmin, deleteEmployee);

export default router;
