import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Executive dashboard summary
router.get('/summary', DashboardController.getSummary);

export default router;
