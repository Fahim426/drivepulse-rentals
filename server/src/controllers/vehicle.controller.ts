import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role, VehicleStatus } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';
import { recordAuditLog } from '../services/audit.service';
import {
  calculateDocumentStatus,
  getDaysRemaining,
  evaluateVehicleCompliance,
} from '../utils/compliance';

export class VehicleController {
  static async listVehicles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      const fuelType = req.query.fuelType as string;
      const transmission = req.query.transmission as string;
      const search = (req.query.search as string)?.trim();

      const where: any = { deletedAt: null };

      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (fuelType && fuelType !== 'ALL') {
        where.fuelType = fuelType;
      }
      if (transmission && transmission !== 'ALL') {
        where.transmission = transmission;
      }

      if (search) {
        where.OR = [
          { registrationNumber: { contains: search } },
          { make: { contains: search } },
          { model: { contains: search } },
        ];
      }

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          include: {
            documents: {
              select: {
                id: true,
                type: true,
                expiryDate: true,
                status: true,
              },
            },
            _count: {
              select: {
                bookings: true,
                maintenanceRecords: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.vehicle.count({ where }),
      ]);

      // Enhance vehicles with dynamic compliance evaluation
      const enhancedVehicles = vehicles.map((v) => {
        const compliance = evaluateVehicleCompliance(v.documents);
        const parsedPhotos = v.photos ? JSON.parse(v.photos) : [];

        return {
          ...v,
          photos: parsedPhotos,
          compliance: {
            isBlocked: compliance.isBlocked,
            reasons: compliance.reasons,
            expiredDocsCount: compliance.expiredDocs.length,
            expiringSoonDocsCount: compliance.expiringSoonDocs.length,
          },
        };
      });

      return sendSuccess(
        res,
        {
          vehicles: enhancedVehicles,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Vehicles retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          documents: {
            include: {
              renewals: {
                orderBy: { renewedAt: 'desc' },
              },
            },
            orderBy: { expiryDate: 'asc' },
          },
          maintenanceRecords: {
            orderBy: { serviceDate: 'desc' },
          },
          expenses: {
            orderBy: { date: 'desc' },
          },
          bookings: {
            where: { deletedAt: null },
            include: {
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
            },
            orderBy: { pickupDateTime: 'desc' },
            take: 20,
          },
        },
      });

      if (!vehicle || vehicle.deletedAt) {
        return sendError(res, 'Vehicle not found', 404);
      }

      // Dynamic document status recalculation and remaining days
      const enhancedDocuments = vehicle.documents.map((doc) => {
        const currentStatus = calculateDocumentStatus(doc.expiryDate);
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        return {
          ...doc,
          status: currentStatus,
          daysRemaining,
        };
      });

      // Calculate Vehicle Financials & Profitability
      const totalRevenue = vehicle.bookings
        .filter((b) => b.status === 'PICKED_UP' || b.status === 'RETURNED')
        .reduce((sum, b) => sum + (b.totalAmount - b.balanceDue), 0);

      const totalMaintenanceCost = vehicle.maintenanceRecords.reduce(
        (sum, m) => sum + m.cost,
        0
      );
      const totalExpensesCost = vehicle.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalCosts = totalMaintenanceCost + totalExpensesCost;
      const netProfit = totalRevenue - totalCosts;

      const compliance = evaluateVehicleCompliance(enhancedDocuments);
      const parsedPhotos = vehicle.photos ? JSON.parse(vehicle.photos) : [];

      return sendSuccess(
        res,
        {
          ...vehicle,
          photos: parsedPhotos,
          documents: enhancedDocuments,
          compliance,
          profitability: {
            totalRevenue,
            totalMaintenanceCost,
            totalExpensesCost,
            totalCosts,
            netProfit,
            roiPercentage: totalCosts > 0 ? ((netProfit / totalCosts) * 100).toFixed(1) : '100.0',
          },
        },
        'Vehicle details retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  static async createVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createVehicleSchema.parse(req.body);

      // Check registration number uniqueness
      const existing = await prisma.vehicle.findFirst({
        where: {
          OR: [
            { registrationNumber: validated.registrationNumber },
            { chassisNumber: validated.chassisNumber },
            { engineNumber: validated.engineNumber },
          ],
          deletedAt: null,
        },
      });

      if (existing) {
        if (existing.registrationNumber === validated.registrationNumber) {
          return sendError(res, 'A vehicle with this registration number already exists', 409);
        }
        if (existing.chassisNumber === validated.chassisNumber) {
          return sendError(res, 'A vehicle with this chassis number already exists', 409);
        }
        if (existing.engineNumber === validated.engineNumber) {
          return sendError(res, 'A vehicle with this engine number already exists', 409);
        }
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          registrationNumber: validated.registrationNumber,
          make: validated.make,
          model: validated.model,
          variant: validated.variant,
          year: validated.year,
          color: validated.color,
          fuelType: validated.fuelType,
          transmission: validated.transmission,
          seats: validated.seats,
          chassisNumber: validated.chassisNumber,
          engineNumber: validated.engineNumber,
          odometer: validated.odometer,
          dailyRate: validated.dailyRate,
          weeklyRate: validated.weeklyRate,
          monthlyRate: validated.monthlyRate,
          securityDeposit: validated.securityDeposit,
          kmLimitPerDay: validated.kmLimitPerDay,
          extraKmCharge: validated.extraKmCharge,
          status: validated.status,
          photos: validated.photos ? JSON.stringify(validated.photos) : null,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Vehicle',
        entityId: vehicle.id,
        details: {
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.make,
          model: vehicle.model,
        },
        req,
      });

      return sendSuccess(res, vehicle, 'Vehicle added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateVehicleSchema.parse(req.body);

      const existing = await prisma.vehicle.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        return sendError(res, 'Vehicle not found', 404);
      }

      const updated = await prisma.vehicle.update({
        where: { id },
        data: {
          ...(validated.registrationNumber && {
            registrationNumber: validated.registrationNumber,
          }),
          ...(validated.make && { make: validated.make }),
          ...(validated.model && { model: validated.model }),
          ...(validated.variant !== undefined && { variant: validated.variant }),
          ...(validated.year && { year: validated.year }),
          ...(validated.color && { color: validated.color }),
          ...(validated.fuelType && { fuelType: validated.fuelType }),
          ...(validated.transmission && { transmission: validated.transmission }),
          ...(validated.seats && { seats: validated.seats }),
          ...(validated.chassisNumber && { chassisNumber: validated.chassisNumber }),
          ...(validated.engineNumber && { engineNumber: validated.engineNumber }),
          ...(validated.odometer !== undefined && { odometer: validated.odometer }),
          ...(validated.dailyRate && { dailyRate: validated.dailyRate }),
          ...(validated.weeklyRate && { weeklyRate: validated.weeklyRate }),
          ...(validated.monthlyRate && { monthlyRate: validated.monthlyRate }),
          ...(validated.securityDeposit !== undefined && {
            securityDeposit: validated.securityDeposit,
          }),
          ...(validated.kmLimitPerDay && { kmLimitPerDay: validated.kmLimitPerDay }),
          ...(validated.extraKmCharge && { extraKmCharge: validated.extraKmCharge }),
          ...(validated.status && { status: validated.status }),
          ...(validated.photos && { photos: JSON.stringify(validated.photos) }),
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Vehicle',
        entityId: id,
        details: { changes: validated },
        req,
      });

      return sendSuccess(res, updated, 'Vehicle updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          bookings: {
            where: {
              status: { in: ['CONFIRMED', 'PICKED_UP'] },
              deletedAt: null,
            },
          },
        },
      });

      if (!vehicle || vehicle.deletedAt) {
        return sendError(res, 'Vehicle not found', 404);
      }

      if (vehicle.bookings.length > 0) {
        return sendError(
          res,
          'Cannot delete vehicle with active or confirmed bookings. Please complete or cancel them first.',
          400
        );
      }

      await prisma.vehicle.update({
        where: { id },
        data: { deletedAt: new Date(), status: VehicleStatus.INACTIVE },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Vehicle',
        entityId: id,
        details: { registrationNumber: vehicle.registrationNumber },
        req,
      });

      return sendSuccess(res, null, 'Vehicle deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAvailabilityCalendar(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const [bookings, maintenance] = await Promise.all([
        prisma.booking.findMany({
          where: {
            vehicleId: id,
            status: { in: ['CONFIRMED', 'PICKED_UP', 'RETURNED'] },
            deletedAt: null,
            OR: [
              {
                pickupDateTime: { lte: endDate },
                returnDateTime: { gte: startDate },
              },
            ],
          },
          select: {
            id: true,
            bookingNumber: true,
            pickupDateTime: true,
            returnDateTime: true,
            status: true,
            customer: {
              select: { fullName: true, phone: true },
            },
          },
        }),
        prisma.maintenanceRecord.findMany({
          where: {
            vehicleId: id,
            serviceDate: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            type: true,
            serviceDate: true,
            vendor: true,
          },
        }),
      ]);

      return sendSuccess(
        res,
        {
          year,
          month,
          bookings,
          maintenance,
        },
        'Calendar data retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getComplianceAlerts(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const allVehicles = await prisma.vehicle.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          registrationNumber: true,
          make: true,
          model: true,
          documents: true,
        },
      });

      const expired: any[] = [];
      const expiring7Days: any[] = [];
      const expiring15Days: any[] = [];
      const expiring30Days: any[] = [];

      for (const vehicle of allVehicles) {
        for (const doc of vehicle.documents) {
          const days = getDaysRemaining(doc.expiryDate);
          const item = {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            vehicleName: `${vehicle.make} ${vehicle.model}`,
            documentId: doc.id,
            type: doc.type,
            documentNumber: doc.documentNumber,
            expiryDate: doc.expiryDate,
            daysRemaining: days,
          };

          if (days < 0) {
            expired.push(item);
          } else if (days <= 7) {
            expiring7Days.push(item);
          } else if (days <= 15) {
            expiring15Days.push(item);
          } else if (days <= 30) {
            expiring30Days.push(item);
          }
        }
      }

      return sendSuccess(
        res,
        {
          summary: {
            expiredCount: expired.length,
            expiring7DaysCount: expiring7Days.length,
            expiring15DaysCount: expiring15Days.length,
            expiring30DaysCount: expiring30Days.length,
            totalAlerts:
              expired.length +
              expiring7Days.length +
              expiring15Days.length +
              expiring30Days.length,
          },
          expired,
          expiring7Days,
          expiring15Days,
          expiring30Days,
        },
        'Compliance alerts summary retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}
