import { Router } from 'express';
import { SettingController } from '../controllers/setting.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { Role } from '../types';

const router = Router();

// All setting routes require authentication
router.use(authenticate);

// Get all settings (accessible to all authenticated staff)
router.get('/', SettingController.getSettings);

// Update system settings (Super Admin and Manager only)
router.put('/', authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER), SettingController.updateSettings);

// User profile and password update (any authenticated staff)
router.put('/profile', SettingController.updateProfile);

export default router;
