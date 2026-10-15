import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { Role } from '../types';

const router = Router();

// Only Super Admin can manage staff users
router.use(authenticate);
router.use(authorizeRoles(Role.SUPER_ADMIN));

router.get('/', UserController.listUsers);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.post('/:id/unlock', UserController.unlockUser);
router.delete('/:id', UserController.deleteUser);

export default router;
