import { Request } from 'express';

export enum Role {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum VehicleType {
  CAR = 'CAR',
  BIKE = 'BIKE',
  SCOOTER = 'SCOOTER',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum FuelType {
  Petrol = 'Petrol',
  Diesel = 'Diesel',
  Electric = 'Electric',
  Hybrid = 'Hybrid',
  CNG = 'CNG',
}

export enum Transmission {
  Manual = 'Manual',
  Automatic = 'Automatic',
}

export enum DocumentType {
  INSURANCE = 'INSURANCE',
  FITNESS = 'FITNESS',
  PUC = 'PUC',
  RC = 'RC',
  ROAD_TAX = 'ROAD_TAX',
  PERMIT = 'PERMIT',
}

export enum DocumentStatus {
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
}

export enum CustomerDocType {
  DRIVING_LICENCE = 'DRIVING_LICENCE',
  AADHAAR = 'AADHAAR',
  PASSPORT = 'PASSPORT',
  VOTER_ID = 'VOTER_ID',
  SELFIE = 'SELFIE',
}

export enum BookingStatus {
  QUOTE = 'QUOTE',
  CONFIRMED = 'CONFIRMED',
  PICKED_UP = 'PICKED_UP',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum RateType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ChecklistType {
  PICKUP = 'PICKUP',
  RETURN = 'RETURN',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
}

export enum PaymentType {
  ADVANCE = 'ADVANCE',
  BALANCE = 'BALANCE',
  SECURITY_DEPOSIT = 'SECURITY_DEPOSIT',
  EXTRA_KM = 'EXTRA_KM',
  LATE_FEE = 'LATE_FEE',
  DAMAGE_CHARGE = 'DAMAGE_CHARGE',
  REFUND = 'REFUND',
}

export enum NotificationType {
  DOC_EXPIRY = 'DOC_EXPIRY',
  RETURN_DUE = 'RETURN_DUE',
  OVERDUE_RETURN = 'OVERDUE_RETURN',
  SERVICE_DUE = 'SERVICE_DUE',
  PENDING_BALANCE = 'PENDING_BALANCE',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
