export type VehicleStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE';
export type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'CNG';
export type Transmission = 'Manual' | 'Automatic';
export type DocumentType = 'INSURANCE' | 'FITNESS' | 'PUC' | 'RC' | 'ROAD_TAX' | 'PERMIT';
export type DocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface VehicleDocumentHistory {
  id: string;
  documentId: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  filePath?: string | null;
  premium?: number | null;
  renewedByUserId?: string | null;
  renewedAt: string;
  notes?: string | null;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string | null;
  filePath?: string | null;
  status: DocumentStatus;
  policyNumber?: string | null;
  insuranceProvider?: string | null;
  insuranceType?: string | null;
  idv?: number | null;
  premium?: number | null;
  notes?: string | null;
  daysRemaining?: number;
  renewals?: VehicleDocumentHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  type: string;
  cost: number;
  vendor: string;
  odometer: number;
  nextServiceDueDate?: string | null;
  nextServiceDueKm?: number | null;
  notes?: string | null;
  invoiceFilePath?: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  category: string;
  amount: number;
  date: string;
  odometer?: number | null;
  notes?: string | null;
  receiptFilePath?: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string | null;
  year: number;
  color: string;
  fuelType: FuelType;
  transmission: Transmission;
  seats: number;
  chassisNumber: string;
  engineNumber: string;
  odometer: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  securityDeposit: number;
  kmLimitPerDay: number;
  extraKmCharge: number;
  status: VehicleStatus;
  photos: string[];
  documents?: VehicleDocument[];
  compliance?: {
    isBlocked: boolean;
    reasons: string[];
    expiredDocsCount: number;
    expiringSoonDocsCount: number;
  };
  _count?: {
    bookings: number;
    maintenanceRecords: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VehicleProfitability {
  totalRevenue: number;
  totalMaintenanceCost: number;
  totalExpensesCost: number;
  totalCosts: number;
  netProfit: number;
  roiPercentage: string;
}

export interface ComplianceAlertItem {
  vehicleId: string;
  registrationNumber: string;
  vehicleName: string;
  documentId: string;
  type: DocumentType;
  documentNumber: string;
  expiryDate: string;
  daysRemaining: number;
}

export interface ComplianceAlertsResponse {
  summary: {
    expiredCount: number;
    expiring7DaysCount: number;
    expiring15DaysCount: number;
    expiring30DaysCount: number;
    totalAlerts: number;
  };
  expired: ComplianceAlertItem[];
  expiring7Days: ComplianceAlertItem[];
  expiring15Days: ComplianceAlertItem[];
  expiring30Days: ComplianceAlertItem[];
}
