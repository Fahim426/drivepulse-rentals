import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// 1. Revenue report
router.get('/revenue', ReportController.getRevenueReport);

// 2. Fleet utilization report
router.get('/fleet-utilization', ReportController.getFleetUtilizationReport);

// 3. Maintenance expense report
router.get('/maintenance', ReportController.getMaintenanceReport);

// 4. Customer intelligence report
router.get('/customers', ReportController.getCustomerReport);

export default router;
