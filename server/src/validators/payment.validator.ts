import { z } from 'zod';

export const recordPaymentSchema = z.object({
  bookingId: z.string().uuid('Valid booking ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  type: z.enum([
    'ADVANCE',
    'BALANCE',
    'SECURITY_DEPOSIT',
    'EXTRA_KM',
    'LATE_FEE',
    'DAMAGE_CHARGE',
    'REFUND',
  ]),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export const generateInvoiceSchema = z.object({
  bookingId: z.string().uuid('Valid booking ID is required'),
  customerGstin: z.string().optional(),
  discount: z.number().min(0).optional(),
});

export const overrideBalanceSchema = z.object({
  reason: z.string().min(5, 'A documented override reason is required'),
});
