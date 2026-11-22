import { Router } from 'express';
import {
  createPresignedUpload,
  createPresignedDownload,
  presignedUploadSchema,
  presignedDownloadSchema,
} from '../controllers/storage.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

// Presigned upload URL generation (restricted to authenticated staff and admin)
router.post(
  '/presigned-upload',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(presignedUploadSchema),
  createPresignedUpload
);

// Presigned download URL generation (restricted to authenticated staff and admin)
router.post(
  '/presigned-download',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(presignedDownloadSchema),
  createPresignedDownload
);

export default router;
