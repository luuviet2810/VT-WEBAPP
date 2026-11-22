import { Router } from 'express';
import {
  getBasicHealth,
  getDatabaseHealth,
  getStorageHealth,
  getFullHealth,
} from '../controllers/health.controller.js';

const router = Router();

router.get('/', getBasicHealth);
router.get('/db', getDatabaseHealth);
router.get('/r2', getStorageHealth);
router.get('/full', getFullHealth);

export default router;
