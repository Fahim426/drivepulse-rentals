import { z } from 'zod';
import { CustomerDocType } from '../types';

export const createCustomerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .transform((val) => val.replace(/\s+/g, '')),
  alternatePhone: z.string().optional().nullable(),
  email: z.string().email('Please enter a valid email address').optional().nullable(),
  address: z.string().min(5, 'Address is required'),
  dob: z.coerce.date().optional().nullable(),
  occupation: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const blacklistCustomerSchema = z.object({
  isBlacklisted: z.boolean(),
  blacklistReason: z.string().optional().nullable(),
});

export const customerDocumentSchema = z.object({
  docType: z.nativeEnum(CustomerDocType),
  documentNumber: z.string().min(1, 'Document number is required'),
  expiryDate: z.coerce.date().optional().nullable(),
  isVerified: z.coerce.boolean().default(false),
});
