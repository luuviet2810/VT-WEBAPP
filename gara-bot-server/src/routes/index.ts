import { Router } from 'express';
import healthRoutes from './health.routes.js';
import storageRoutes from './storage.routes.js';
import authRoutes from './auth.routes.js';
import positionsRoutes from './positions.routes.js';
import vehiclesRoutes from './vehicles.routes.js';
import checksheetsRoutes from './checksheets.routes.js';
import tasksRoutes from './tasks.routes.js';
import employeesRoutes from './employees.routes.js';
import moveLogsRoutes from './move-logs.routes.js';
import attendanceRoutes from './attendance.routes.js';
import vehicleOptionsRoutes from './vehicleOptions.routes.js';
import websiteSettingsRoutes from './websiteSettings.routes.js';
import telegramRoutes from '../api/telegram.routes.js';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/storage', storageRoutes);
router.use('/api/positions', positionsRoutes);
router.use('/api/vehicles', vehiclesRoutes);
router.use('/api/vehicle-options', vehicleOptionsRoutes);
router.use('/api/website-settings', websiteSettingsRoutes);
router.use('/api/checksheets', checksheetsRoutes);
router.use('/api/tasks', tasksRoutes);
router.use('/api/employees', employeesRoutes);
router.use('/api/move-logs', moveLogsRoutes);
router.use('/api/attendance', attendanceRoutes);
router.use('/api/telegram', telegramRoutes); // Preserved existing Telegram Bot routes

export default router;
