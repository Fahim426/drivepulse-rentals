export type CustomerDocType =
  | 'DRIVING_LICENCE'
  | 'AADHAAR'
  | 'PASSPORT'
  | 'VOTER_ID'
  | 'SELFIE';

export interface CustomerDocument {
  id: string;
  customerId: string;
  docType: CustomerDocType;
  documentNumber: string;
  expiryDate?: string | null;
  filePath: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  address: string;
  dob?: string | null;
  occupation?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  rating: number;
  notes?: string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  blacklistedAt?: string | null;
  totalSpent?: number;
  outstandingBalance?: number;
  dlStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_UPLOADED';
  drivingLicence?: CustomerDocument | null;
  documents?: CustomerDocument[];
  _count?: {
    bookings: number;
    documents: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  isDlExpired?: boolean;
  hasValidDl?: boolean;
  bookings?: any[];
}

export interface LicenceCheckResult {
  hasLicence: boolean;
  isExpired: boolean;
  willExpireDuringRental: boolean;
  expiryDate?: string;
  message: string;
}
