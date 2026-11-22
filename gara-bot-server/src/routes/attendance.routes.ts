import { Router } from 'express';
import { getAttendance, createOrUpdateAttendance } from '../controllers/attendance.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateJwt, requireStaffOrAdmin, getAttendance);
router.post('/', authenticateJwt, requireStaffOrAdmin, createOrUpdateAttendance);
router.put('/', authenticateJwt, requireStaffOrAdmin, createOrUpdateAttendance);

export default router;
