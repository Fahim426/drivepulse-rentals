import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { InspectionController } from '../controllers/inspection.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validation.middleware';
import {
  createBookingSchema,
  updateBookingStatusSchema,
  extendBookingSchema,
  pickupInspectionSchema,
  returnInspectionSchema,
  checkAvailabilitySchema,
} from '../validators/booking.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Vehicle Availability Check
router.get('/available-vehicles', validateQuery(checkAvailabilitySchema), BookingController.getAvailableVehicles);

// Booking CRUD & Actions
router.get('/', BookingController.getBookings);
router.post('/', validateBody(createBookingSchema), BookingController.createBooking);
router.get('/:id', BookingController.getBookingById);
router.put('/:id/status', validateBody(updateBookingStatusSchema), BookingController.updateBookingStatus);
router.post('/:id/extend', validateBody(extendBookingSchema), BookingController.extendBooking);
router.get('/:id/agreement-pdf', BookingController.downloadRentalAgreement);

// Inspection Checklists
router.get('/:bookingId/checklists', InspectionController.getBookingChecklists);
router.post(
  '/:bookingId/pickup-inspection',
  validateBody(pickupInspectionSchema),
  InspectionController.recordPickupInspection
);
router.post(
  '/:bookingId/return-inspection',
  validateBody(returnInspectionSchema),
  InspectionController.recordReturnInspection
);

export default router;
