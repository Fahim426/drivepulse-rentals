import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, BookingStatus, ChecklistType } from '../types';
import { AuditService } from '../services/audit.service';

export class InspectionController {
  /**
   * Record Pickup Checklist & Handover
   * Moves booking status to PICKED_UP and vehicle status to RENTED
   */
  public static async recordPickupInspection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const {
        odometer,
        fuelLevel,
        damageNotes,
        photos = [],
        accessoriesHandedOver = [],
        customerSignature,
      } = req.body;

      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { vehicle: true, customer: true },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.QUOTE) {
        res.status(400).json({
          message: `Cannot perform pickup inspection. Current booking status is ${booking.status} (must be CONFIRMED)`,
        });
        return;
      }

      if (odometer < booking.vehicle.odometer) {
        res.status(400).json({
          message: `Odometer reading (${odometer} km) cannot be less than vehicle's current recorded odometer (${booking.vehicle.odometer} km)`,
        });
        return;
      }

      // Execute handover in transaction
      const checklist = await prisma.$transaction(async (tx) => {
        // 1. Create inspection record
        const inspection = await tx.inspectionChecklist.create({
          data: {
            bookingId: booking.id,
            type: ChecklistType.PICKUP,
            odometer: Number(odometer),
            fuelLevel,
            damageNotes: damageNotes || null,
            photos: JSON.stringify(photos),
            accessoriesHandedOver: JSON.stringify(accessoriesHandedOver),
            customerSignature,
            inspectedByUserId: user.id,
          },
        });

        // 2. Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.PICKED_UP,
          },
        });

        // 3. Update vehicle status and sync odometer
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: {
            status: 'RENTED',
            odometer: Number(odometer),
          },
        });

        return inspection;
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'InspectionChecklist',
        entityId: checklist.id,
        details: {
          type: 'PICKUP',
          bookingNumber: booking.bookingNumber,
          odometer,
          fuelLevel,
          customer: booking.customer.fullName,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(checklist);
    } catch (error) {
      console.error('recordPickupInspection error:', error);
      res.status(500).json({ message: 'Internal server error recording pickup inspection' });
    }
  }

  /**
   * Record Return Checklist, Settlement & Vehicle Release
   * Moves booking status to RETURNED and vehicle status to AVAILABLE
   */
  public static async recordReturnInspection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const {
        odometer,
        fuelLevel,
        damageNotes,
        photos = [],
        damageCharge = 0,
        lateFee = 0,
        fuelCharge = 0,
        customerSignature,
      } = req.body;

      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: {
          vehicle: true,
          customer: true,
          checklists: {
            where: { type: ChecklistType.PICKUP },
          },
        },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      if (booking.status !== BookingStatus.PICKED_UP) {
        res.status(400).json({
          message: `Cannot perform return inspection. Booking is not in PICKED_UP status (current: ${booking.status})`,
        });
        return;
      }

      const pickupChecklist = booking.checklists[0];
      const initialOdo = pickupChecklist ? pickupChecklist.odometer : booking.vehicle.odometer;

      if (Number(odometer) < initialOdo) {
        res.status(400).json({
          message: `Return odometer (${odometer} km) cannot be less than initial pickup odometer (${initialOdo} km)`,
        });
        return;
      }

      // Compute Settlement Deductions
      const totalKmRun = Number(odometer) - initialOdo;
      const allowedKm = booking.rentalDays * booking.vehicle.kmLimitPerDay;
      const extraKm = Math.max(0, totalKmRun - allowedKm);
      const extraKmCharge = extraKm * booking.vehicle.extraKmCharge;

      const totalDeductions =
        extraKmCharge +
        Number(fuelCharge || 0) +
        Number(lateFee || 0) +
        Number(damageCharge || 0);

      // Deposit settlement:
      // If total deductions <= securityDeposit, netRefund = deposit - deductions
      // If total deductions > securityDeposit, additionalDue = deductions - deposit
      const depositAdjustment = totalDeductions;
      const netDepositRefund = Math.max(0, booking.securityDeposit - totalDeductions);
      const additionalBalanceDue = Math.max(0, totalDeductions - booking.securityDeposit);

      const actualReturnDateTime = new Date();

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create return checklist
        const inspection = await tx.inspectionChecklist.create({
          data: {
            bookingId: booking.id,
            type: ChecklistType.RETURN,
            odometer: Number(odometer),
            fuelLevel,
            damageNotes: damageNotes || null,
            photos: JSON.stringify(photos),
            customerSignature,
            inspectedByUserId: user.id,
            extraKm,
            extraKmCharge,
            lateFee: Number(lateFee || 0),
            fuelCharge: Number(fuelCharge || 0),
            damageCharge: Number(damageCharge || 0),
            depositAdjustment,
          },
        });

        // 2. Update booking status and balances
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.RETURNED,
            actualReturnDateTime,
            balanceDue: booking.balanceDue + additionalBalanceDue,
            totalAmount: booking.totalAmount + totalDeductions,
          },
        });

        // 3. Update vehicle status and sync final odometer
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: {
            status: 'AVAILABLE',
            odometer: Number(odometer),
          },
        });

        return {
          inspection,
          settlement: {
            totalKmRun,
            allowedKm,
            extraKm,
            extraKmCharge,
            fuelCharge: Number(fuelCharge || 0),
            lateFee: Number(lateFee || 0),
            damageCharge: Number(damageCharge || 0),
            totalDeductions,
            securityDeposit: booking.securityDeposit,
            netDepositRefund,
            additionalBalanceDue,
          },
        };
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'InspectionChecklist',
        entityId: result.inspection.id,
        details: {
          type: 'RETURN',
          bookingNumber: booking.bookingNumber,
          finalOdometer: odometer,
          totalKmRun,
          extraKm,
          extraKmCharge,
          totalDeductions,
          netDepositRefund,
          customer: booking.customer.fullName,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('recordReturnInspection error:', error);
      res.status(500).json({ message: 'Internal server error recording return inspection' });
    }
  }

  /**
   * Get checklists for a booking
   */
  public static async getBookingChecklists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;

      const checklists = await prisma.inspectionChecklist.findMany({
        where: { bookingId },
        include: {
          inspectedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { inspectedAt: 'asc' },
      });

      res.json(checklists);
    } catch (error) {
      console.error('getBookingChecklists error:', error);
      res.status(500).json({ message: 'Internal server error fetching checklists' });
    }
  }
}
