import { Router } from 'express';
import {
  createPresignedUpload,
  confirmUpload,
  createPresignedDownload,
  deleteStorageFile,
  presignedUploadSchema,
  confirmUploadSchema,
  presignedDownloadSchema,
  deleteFileSchema,
} from '../controllers/storage.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

// 1. Presigned upload URL generation (restricted to authenticated staff and admin)
router.post(
  '/presigned-upload',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(presignedUploadSchema),
  createPresignedUpload
);

// 2. Confirm upload and save metadata to Neon (restricted to authenticated staff and admin)
router.post(
  '/confirm-upload',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(confirmUploadSchema),
  confirmUpload
);

// 3. Presigned download URL generation (restricted to authenticated staff and admin)
router.post(
  '/presigned-download',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(presignedDownloadSchema),
  createPresignedDownload
);

// 4. Delete file from R2 and clean up Neon metadata (restricted to authenticated staff and admin)
router.delete(
  '/file',
  authenticateJwt,
  requireStaffOrAdmin,
  validateBody(deleteFileSchema),
  deleteStorageFile
);

export default router;
