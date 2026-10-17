import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { Role } from '../types';

const router = Router();

// All AI endpoints require authentication and Admin access
router.use(authenticate);
router.use(authorizeRoles(Role.ADMIN, Role.SUPER_ADMIN));

// POST /api/ai/chat - Natural language operations query
router.post('/chat', AIController.chat);

// GET /api/ai/daily-briefing - Executive daily morning briefing
router.get('/daily-briefing', AIController.getDailyBriefing);

export default router;
