import { z } from 'zod';

export const createBookingSchema = z
  .object({
    customerId: z.string().uuid('Invalid customer ID').optional(),
    customerName: z.string().min(2, 'Customer name must be at least 2 characters').optional(),
    customerPhone: z.string().min(10, 'Customer phone must be at least 10 digits').optional(),
    customerEmail: z.string().email().optional().or(z.literal('')),
    customerDlNumber: z.string().optional(),
    customerCity: z.string().optional(),
    vehicleId: z.string().uuid('Invalid vehicle ID'),
    pickupDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid pickup date and time is required',
    }),
    returnDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid return date and time is required',
    }),
    pickupLocation: z.string().min(2, 'Pickup location is required'),
    returnLocation: z.string().min(2, 'Return location is required'),
    rateType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    manualRentalAmount: z.number().min(0).optional(),
    baseRate: z.number().min(0).optional(),
    passengerCount: z.number().int().min(1).optional(),
    withDriver: z.boolean().default(false),
    driverAllowancePerDay: z.number().min(0).default(0),
    discountAmount: z.number().min(0).default(0),
    advancePaid: z.number().min(0).default(0),
    status: z.enum(['QUOTE', 'CONFIRMED']).default('CONFIRMED'),
    managerOverrideCompliance: z.boolean().default(false),
    overrideComplianceReason: z.string().optional(),
    extras: z
      .array(
        z.object({
          name: z.string().min(1),
          dailyPrice: z.number().min(0).default(0),
          fixedPrice: z.number().min(0).default(0),
          quantity: z.number().int().min(1).default(1),
        })
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => !!data.customerId || (!!data.customerName && !!data.customerPhone),
    {
      message: 'Either an existing customerId or customerName and customerPhone are required',
      path: ['customerName'],
    }
  );

export const updateBookingStatusSchema = z.object({
  status: z.enum(['QUOTE', 'CONFIRMED', 'PICKED_UP', 'RETURNED', 'CANCELLED']),
  cancellationReason: z.string().optional(),
  cancellationFee: z.number().min(0).optional(),
});

export const extendBookingSchema = z.object({
  newReturnDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid return date and time is required',
  }),
  discountAmount: z.number().min(0).optional(),
});

export const pickupInspectionSchema = z.object({
  odometer: z.number().int().min(0, 'Odometer reading is required'),
  fuelLevel: z.enum(['0/4', '1/4', '2/4', '3/4', '4/4']),
  damageNotes: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
  accessoriesHandedOver: z.array(z.string()).optional().default([]),
  customerSignature: z.string().min(1, 'Customer signature is required'),
});

export const returnInspectionSchema = z.object({
  odometer: z.number().int().min(0, 'Odometer reading is required'),
  fuelLevel: z.enum(['0/4', '1/4', '2/4', '3/4', '4/4']),
  damageNotes: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
  damageCharge: z.number().min(0).default(0),
  lateFee: z.number().min(0).default(0),
  fuelCharge: z.number().min(0).default(0),
  customerSignature: z.string().min(1, 'Customer signature is required'),
});

export const checkAvailabilitySchema = z.object({
  pickupDateTime: z.string(),
  returnDateTime: z.string(),
  vehicleType: z.string().optional(),
  excludeBookingId: z.string().optional(),
});
