export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';

export type PaymentType =
  | 'ADVANCE'
  | 'BALANCE'
  | 'SECURITY_DEPOSIT'
  | 'EXTRA_KM'
  | 'LATE_FEE'
  | 'DAMAGE_CHARGE'
  | 'REFUND';

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  type: PaymentType;
  transactionReference?: string;
  receivedByUserId: string;
  receivedByUser?: {
    id: string;
    fullName: string;
    email: string;
    role?: string;
  };
  notes?: string;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    balanceDue: number;
    customer: {
      id: string;
      fullName: string;
      phone: string;
    };
    vehicle: {
      id: string;
      make: string;
      model: string;
      registrationNumber: string;
    };
  };
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  invoiceDate: string;
  subtotal: number;
  discount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  customerGstin?: string;
  pdfPath?: string;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    customer: {
      id: string;
      fullName: string;
      phone: string;
      email?: string;
    };
    vehicle: {
      id: string;
      make: string;
      model: string;
      registrationNumber: string;
    };
  };
}
