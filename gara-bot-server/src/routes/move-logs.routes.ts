import { Router } from 'express';
import { getMoveLogs, createMoveLog } from '../controllers/move-logs.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticateJwt, requireStaffOrAdmin, getMoveLogs);
router.post('/', authenticateJwt, requireStaffOrAdmin, createMoveLog);

export default router;
