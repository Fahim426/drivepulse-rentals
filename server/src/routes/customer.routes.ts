import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { CustomerDocumentController } from '../controllers/customerDocument.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { upload } from '../middlewares/upload.middleware';
import { Role } from '../types';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// Directory & Details
router.get('/', CustomerController.listCustomers);
router.get('/:id', CustomerController.getCustomerById);
router.get('/:id/check-licence', CustomerController.checkLicenceValidity);

// Customer Mutations
router.post('/', CustomerController.createCustomer);
router.put('/:id', CustomerController.updateCustomer);

// Blacklist (Manager & Super Admin)
router.post(
  '/:id/blacklist',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  CustomerController.toggleBlacklist
);

// Delete Customer (Super Admin only)
router.delete(
  '/:id',
  authorizeRoles(Role.SUPER_ADMIN),
  CustomerController.deleteCustomer
);

// KYC Documents
router.post(
  '/:customerId/documents',
  upload.single('file'),
  CustomerDocumentController.uploadDocument
);

router.patch(
  '/documents/:documentId/verify',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  CustomerDocumentController.toggleVerification
);

router.delete(
  '/documents/:documentId',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  CustomerDocumentController.deleteDocument
);

export default router;
