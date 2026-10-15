import { z } from 'zod';
import { FuelType, Transmission, VehicleStatus, DocumentType } from '../types';

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(4, 'Registration number is required')
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional().nullable(),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1, 'Color is required'),
  fuelType: z.nativeEnum(FuelType).default(FuelType.Petrol),
  transmission: z.nativeEnum(Transmission).default(Transmission.Manual),
  seats: z.coerce.number().int().min(2).max(15).default(5),
  chassisNumber: z.string().min(4, 'Chassis number is required').transform((v) => v.toUpperCase()),
  engineNumber: z.string().min(4, 'Engine number is required').transform((v) => v.toUpperCase()),
  odometer: z.coerce.number().int().min(0).default(0),
  dailyRate: z.coerce.number().min(0).default(0),
  weeklyRate: z.coerce.number().min(0).default(0),
  monthlyRate: z.coerce.number().min(0).default(0),
  securityDeposit: z.coerce.number().min(0).default(5000),
  kmLimitPerDay: z.coerce.number().int().min(0).default(0),
  extraKmCharge: z.coerce.number().min(0).default(0),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  photos: z.array(z.string()).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  documentNumber: z.string().min(1, 'Document number is required'),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  issuingAuthority: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceType: z.string().optional().nullable(),
  idv: z.coerce.number().optional().nullable(),
  premium: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const renewDocumentSchema = z.object({
  documentNumber: z.string().min(1, 'Document number is required'),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  premium: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createMaintenanceSchema = z.object({
  serviceDate: z.coerce.date(),
  type: z.string().min(1, 'Maintenance type is required'),
  cost: z.coerce.number().min(0, 'Cost must be positive'),
  vendor: z.string().min(1, 'Vendor name is required'),
  odometer: z.coerce.number().int().min(0),
  nextServiceDueDate: z.coerce.date().optional().nullable(),
  nextServiceDueKm: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Expense category is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.coerce.date(),
  odometer: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});
