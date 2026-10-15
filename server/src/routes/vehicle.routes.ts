import { Router } from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { VehicleDocumentController } from '../controllers/vehicleDocument.controller';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { ExpenseController } from '../controllers/expense.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { upload } from '../middlewares/upload.middleware';
import { Role } from '../types';
import { storageService } from '../services/storage.service';
import { sendSuccess } from '../utils/response';
import { prisma } from '../prisma';

const router = Router();

// All vehicle routes require authentication
router.use(authenticate);

// Compliance Alerts across fleet
router.get('/compliance/alerts', VehicleController.getComplianceAlerts);

// List & Detail
router.get('/', VehicleController.listVehicles);
router.get('/:id', VehicleController.getVehicleById);
router.get('/:id/calendar', VehicleController.getAvailabilityCalendar);

// Vehicle Mutations (Manager and Super Admin only)
router.post(
  '/',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  VehicleController.createVehicle
);

router.put(
  '/:id',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  VehicleController.updateVehicle
);

// Delete Vehicle (Super Admin only - Manager cannot delete records)
router.delete(
  '/:id',
  authorizeRoles(Role.SUPER_ADMIN),
  VehicleController.deleteVehicle
);

// Photo upload endpoint
router.post(
  '/:vehicleId/photos',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  upload.array('photos', 5),
  async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const files = req.files as Express.Multer.File[];

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId, deletedAt: null },
      });

      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      const existingPhotos: string[] = vehicle.photos ? JSON.parse(vehicle.photos) : [];
      const uploadedUrls: string[] = [];

      for (const f of files) {
        const saved = await storageService.saveFile(
          f.buffer,
          f.originalname,
          f.mimetype,
          'vehicles'
        );
        uploadedUrls.push(saved.url);
      }

      const updatedPhotos = [...existingPhotos, ...uploadedUrls];
      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { photos: JSON.stringify(updatedPhotos) },
      });

      return sendSuccess(res, { photos: updatedPhotos }, 'Photos uploaded successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Documents
router.post(
  '/:vehicleId/documents',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('file'),
  VehicleDocumentController.addDocument
);

router.put(
  '/documents/:documentId/renew',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('file'),
  VehicleDocumentController.renewDocument
);

router.delete(
  '/documents/:documentId',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  VehicleDocumentController.deleteDocument
);

// Maintenance Records
router.post(
  '/:vehicleId/maintenance',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('invoice'),
  MaintenanceController.addRecord
);

router.delete(
  '/maintenance/:id',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  MaintenanceController.deleteRecord
);

// Expenses
router.post(
  '/:vehicleId/expenses',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('receipt'),
  ExpenseController.addExpense
);

router.delete(
  '/expenses/:id',
  authorizeRoles(Role.SUPER_ADMIN, Role.MANAGER),
  ExpenseController.deleteExpense
);

export default router;
