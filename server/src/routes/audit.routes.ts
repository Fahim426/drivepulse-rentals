import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { Role } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER));

router.get('/', AuditController.listLogs);

export default router;
