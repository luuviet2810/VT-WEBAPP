import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskActivity,
  getAllTaskActivity,
  addTaskActivity,
} from '../controllers/tasks.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Xem công việc và lịch sử hoạt động
router.get('/', authenticateJwt, requireStaffOrAdmin, getTasks);
router.get('/activity/all', authenticateJwt, requireStaffOrAdmin, getAllTaskActivity);
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getTaskById);
router.get('/:id/activity', authenticateJwt, requireStaffOrAdmin, getTaskActivity);

// Thao tác nhiệm vụ
router.post('/', authenticateJwt, requireStaffOrAdmin, createTask);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateTask);
router.patch('/:id', authenticateJwt, requireStaffOrAdmin, updateTask);
router.delete('/:id', authenticateJwt, requireStaffOrAdmin, deleteTask);
router.post('/:id/activity', authenticateJwt, requireStaffOrAdmin, addTaskActivity);

export default router;
