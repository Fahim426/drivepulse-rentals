import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { generateInvoiceSchema } from '../validators/payment.validator';

const router = Router();

router.use(authenticate);

router.post('/generate', validateBody(generateInvoiceSchema), InvoiceController.generateInvoice);
router.get('/', InvoiceController.getInvoices);
router.get('/:id', InvoiceController.getInvoiceById);
router.get('/:id/pdf', InvoiceController.downloadInvoicePdf);
router.get('/:id/invoice-pdf', InvoiceController.downloadInvoicePdf);

export default router;
