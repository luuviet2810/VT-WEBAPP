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
import {
  getVehicleWorkflowLogs,
  addVehicleWorkflowLog,
} from '../controllers/vehicleWorkflow.controller.js';
import {
  getVehicleImages,
  addVehicleImage,
  deleteVehicleImage,
  updateVehicleImageOrder,
  updateVehicleImageCategory,
  updateVehicleImageExpiry,
  getVehicleDocuments,
  addVehicleDocument,
  deleteVehicleDocument,
  deleteAllVehicleMedia,
  getMediaStats,
  getWebsiteImages,
} from '../controllers/vehicleMedia.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin, requireAdmin } from '../middleware/rbac.middleware.js';

const router = Router();

// Media stats & website images (phải đặt trước :id)
router.get('/media-stats', authenticateJwt, requireStaffOrAdmin, getMediaStats);
router.get('/website-images', authenticateJwt, requireStaffOrAdmin, getWebsiteImages);

// Đọc danh sách xe và chi tiết: Cho phép nhân viên và admin đã xác thực
router.get('/', authenticateJwt, requireStaffOrAdmin, getVehicles);
router.get('/by-plate/:plate', authenticateJwt, requireStaffOrAdmin, getVehicleByPlate);

// Quản lý media riêng lẻ (đặt trước :id)
router.patch('/images/:id/order', authenticateJwt, requireStaffOrAdmin, updateVehicleImageOrder);
router.patch('/images/:id/category', authenticateJwt, requireStaffOrAdmin, updateVehicleImageCategory);
router.patch('/images/:id/expiry', authenticateJwt, requireStaffOrAdmin, updateVehicleImageExpiry);
router.delete('/images/:id', authenticateJwt, requireStaffOrAdmin, deleteVehicleImage);
router.delete('/documents/:id', authenticateJwt, requireStaffOrAdmin, deleteVehicleDocument);

// Chi tiết xe theo ID
router.get('/:id', authenticateJwt, requireStaffOrAdmin, getVehicleById);

// Thêm, cập nhật, di chuyển xe: Cho phép nhân viên và admin
router.post('/', authenticateJwt, requireStaffOrAdmin, createVehicle);
router.put('/:id', authenticateJwt, requireStaffOrAdmin, updateVehicle);
router.patch('/:id', authenticateJwt, requireStaffOrAdmin, updateVehicle);
router.post('/:id/move', authenticateJwt, requireStaffOrAdmin, moveVehicle);

// Workflow logs theo xe
router.get('/:id/workflow-logs', authenticateJwt, requireStaffOrAdmin, getVehicleWorkflowLogs);
router.post('/:id/workflow-logs', authenticateJwt, requireStaffOrAdmin, addVehicleWorkflowLog);

// Media theo xe
router.get('/:id/images', authenticateJwt, requireStaffOrAdmin, getVehicleImages);
router.post('/:id/images', authenticateJwt, requireStaffOrAdmin, addVehicleImage);
router.get('/:id/documents', authenticateJwt, requireStaffOrAdmin, getVehicleDocuments);
router.post('/:id/documents', authenticateJwt, requireStaffOrAdmin, addVehicleDocument);
router.delete('/:id/media', authenticateJwt, requireStaffOrAdmin, deleteAllVehicleMedia);

// Xóa xe: CHỈ DÀNH CHO ADMIN
router.delete('/:id', authenticateJwt, requireAdmin, deleteVehicle);

export default router;
