import { Router } from 'express';
import {
  getPublicVehicles,
  getPublicVehicleById,
  getAllPublicImages,
  getPublicVehicleImages,
  getPublicSettings,
  getPublicOptionDefs,
} from '../controllers/public.controller.js';

const router = Router();

// Các endpoint công khai phục vụ Public Web (không yêu cầu JWT token)
router.get('/vehicles', getPublicVehicles);
router.get('/vehicles/:id', getPublicVehicleById);
router.get('/images', getAllPublicImages);
router.get('/vehicles/:id/images', getPublicVehicleImages);
router.get('/settings', getPublicSettings);
router.get('/options', getPublicOptionDefs);

export default router;
