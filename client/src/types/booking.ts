export type BookingStatus = 'QUOTE' | 'CONFIRMED' | 'PICKED_UP' | 'RETURNED' | 'CANCELLED';

export interface BookingExtra {
  id?: string;
  name: string;
  dailyPrice: number;
  fixedPrice: number;
  quantity: number;
  totalAmount: number;
}

export interface InspectionChecklist {
  id: string;
  bookingId: string;
  type: 'PICKUP' | 'RETURN';
  odometer: number;
  fuelLevel: '0/4' | '1/4' | '2/4' | '3/4' | '4/4';
  damageNotes?: string;
  photos?: string; // JSON string
  accessoriesHandedOver?: string; // JSON string
  customerSignature?: string;
  inspectedByUserId: string;
  inspectedByUser?: {
    id: string;
    fullName: string;
    role: string;
  };
  extraKm?: number;
  extraKmCharge?: number;
  lateFee?: number;
  fuelCharge?: number;
  damageCharge?: number;
  depositAdjustment?: number;
  inspectedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    isBlacklisted?: boolean;
    blacklistReason?: string;
    documents?: Array<{
      id: string;
      docType: string;
      documentNumber: string;
      expiryDate?: string;
      isVerified: boolean;
    }>;
  };
  vehicleId: string;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    variant?: string;
    type?: 'CAR' | 'BIKE' | 'SCOOTER';
    year: number;
    fuelType: string;
    transmission?: string;
    seats?: number;
    dailyRate: number;
    securityDeposit: number;
    kmLimitPerDay: number;
    extraKmCharge: number;
    odometer: number;
    photos?: string;
    documents?: Array<{
      id: string;
      type: string;
      documentNumber: string;
      expiryDate: string;
      status: string;
    }>;
  };
  createdByUserId: string;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  pickupDateTime: string;
  returnDateTime: string;
  actualReturnDateTime?: string;
  pickupLocation: string;
  returnLocation: string;
  rateType: string;
  baseRate: number;
  rentalDays: number;
  withDriver: boolean;
  driverAllowancePerDay: number;
  totalExtrasAmount: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  securityDeposit: number;
  advancePaid: number;
  balanceDue: number;
  status: BookingStatus;
  managerOverrideCompliance: boolean;
  overrideComplianceReason?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  createdAt: string;
  updatedAt: string;
  extras?: BookingExtra[];
  checklists?: InspectionChecklist[];
  payments?: Array<{
    id: string;
    amount: number;
    mode: string;
    type: string;
    paymentDate: string;
    receiptNumber?: string;
    transactionReference?: string;
  }>;
}

export interface AvailableVehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string;
  type?: 'CAR' | 'BIKE' | 'SCOOTER';
  year: number;
  color: string;
  fuelType: string;
  transmission: string;
  seats: number;
  dailyRate: number;
  securityDeposit: number;
  kmLimitPerDay: number;
  extraKmCharge: number;
  odometer: number;
  photos?: string;
  complianceBlocked: boolean;
  complianceIssues: string[];
}
