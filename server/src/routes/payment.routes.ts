import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { recordPaymentSchema, overrideBalanceSchema } from '../validators/payment.validator';
import { Role } from '../types';

const router = Router();

router.use(authenticate);

// Record & Query Payments
router.post('/', validateBody(recordPaymentSchema), PaymentController.recordPayment);
router.get('/', PaymentController.getPayments);
router.get('/:id', PaymentController.getPaymentById);
router.get('/:id/receipt-pdf', PaymentController.downloadReceiptPdf);

// Balance Override (Manager & Super Admin only)
router.post(
  '/override-balance/:bookingId',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  validateBody(overrideBalanceSchema),
  PaymentController.overrideBalance
);

export default router;
