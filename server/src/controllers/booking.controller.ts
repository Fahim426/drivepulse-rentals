import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role, BookingStatus, DocumentType } from '../types';
import { AuditService } from '../services/audit.service';
import { PdfService, BookingWithDetails } from '../services/pdf.service';

export class BookingController {
  /**
   * Check available vehicles for a date/time window
   */
  public static async getAvailableVehicles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pickupDateTime, returnDateTime, vehicleType, type, category, excludeBookingId } = req.query as {
        pickupDateTime?: string;
        returnDateTime?: string;
        vehicleType?: string;
        type?: string;
        category?: string;
        excludeBookingId?: string;
      };

      if (!pickupDateTime || !returnDateTime) {
        res.status(400).json({ message: 'pickupDateTime and returnDateTime are required query parameters' });
        return;
      }

      const pickup = new Date(pickupDateTime);
      const returnDate = new Date(returnDateTime);

      if (isNaN(pickup.getTime()) || isNaN(returnDate.getTime()) || returnDate <= pickup) {
        res.status(400).json({ message: 'returnDateTime must be after pickupDateTime' });
        return;
      }

      // 1. Find all active bookings that overlap with requested period
      // Overlap condition: booking.pickupDateTime < requestedReturn && booking.returnDateTime > requestedPickup
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          id: excludeBookingId ? { not: excludeBookingId } : undefined,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PICKED_UP] },
          deletedAt: null,
          pickupDateTime: { lt: returnDate },
          returnDateTime: { gt: pickup },
        },
        select: { vehicleId: true },
      });

      const bookedVehicleIds = conflictingBookings.map((b) => b.vehicleId);

      // 2. Fetch candidate vehicles that are active and not in maintenance
      const targetType = (type || category) as string;
      const vehicles = await prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          status: { in: ['AVAILABLE', 'RENTED'] }, // RENTED vehicles might be free during requested future dates
          id: { notIn: bookedVehicleIds },
          ...(targetType && targetType !== 'ALL' && { type: targetType.toUpperCase() }),
          ...(vehicleType && ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'].includes(vehicleType) && { fuelType: vehicleType }),
        },
        include: {
          documents: true,
        },
        orderBy: [{ dailyRate: 'asc' }],
      });

      // 3. Evaluate compliance documents for each candidate
      const now = new Date();
      const mandatoryDocs = [DocumentType.INSURANCE, DocumentType.FITNESS, DocumentType.PUC];

      const evaluatedVehicles = vehicles.map((v) => {
        const complianceIssues: string[] = [];

        for (const docType of mandatoryDocs) {
          const doc = v.documents.find((d) => d.type === docType);
          if (!doc) {
            complianceIssues.push(`Missing mandatory ${docType} document`);
          } else if (new Date(doc.expiryDate) < now) {
            complianceIssues.push(`${docType} expired on ${new Date(doc.expiryDate).toLocaleDateString('en-IN')}`);
          }
        }

        return {
          ...v,
          isAvailable: true,
          complianceBlocked: complianceIssues.length > 0,
          complianceIssues,
        };
      });

      res.json({
        pickupDateTime: pickup.toISOString(),
        returnDateTime: returnDate.toISOString(),
        totalAvailable: evaluatedVehicles.length,
        vehicles: evaluatedVehicles,
      });
    } catch (error) {
      console.error('getAvailableVehicles error:', error);
      res.status(500).json({ message: 'Internal server error checking vehicle availability' });
    }
  }

  /**
   * Get paginated list of bookings with filtering
   */
  public static async getBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        status,
        search,
        customerId,
        vehicleId,
        from,
        to,
      } = req.query as Record<string, string | undefined>;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        deletedAt: null,
      };

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      if (vehicleId) {
        where.vehicleId = vehicleId;
      }

      if (from || to) {
        where.pickupDateTime = {};
        if (from) where.pickupDateTime.gte = new Date(from);
        if (to) where.pickupDateTime.lte = new Date(to);
      }

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { bookingNumber: { contains: query } },
          { customer: { fullName: { contains: query } } },
          { customer: { phone: { contains: query } } },
          { vehicle: { registrationNumber: { contains: query } } },
          { vehicle: { make: { contains: query } } },
          { vehicle: { model: { contains: query } } },
        ];
      }

      const [total, bookings] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                isBlacklisted: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                registrationNumber: true,
                make: true,
                model: true,
                year: true,
                fuelType: true,
                dailyRate: true,
                photos: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                type: true,
                paymentDate: true,
              },
            },
            checklists: {
              select: {
                id: true,
                type: true,
                odometer: true,
                fuelLevel: true,
                inspectedAt: true,
              },
            },
          },
        }),
      ]);

      res.json({
        bookings,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('getBookings error:', error);
      res.status(500).json({ message: 'Internal server error fetching bookings' });
    }
  }

  /**
   * Get single booking details
   */
  public static async getBookingById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findFirst({
        where: { id, deletedAt: null },
        include: {
          customer: {
            include: {
              documents: true,
            },
          },
          vehicle: {
            include: {
              documents: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          extras: true,
          checklists: {
            include: {
              inspectedByUser: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
            },
            orderBy: { inspectedAt: 'asc' },
          },
          payments: {
            include: {
              receivedByUser: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      res.json(booking);
    } catch (error) {
      console.error('getBookingById error:', error);
      res.status(500).json({ message: 'Internal server error fetching booking' });
    }
  }

  /**
   * Create a new booking with overlap checks, compliance checks, and pricing calculation
   */
  public static async createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        customerDlNumber,
        customerCity,
        vehicleId,
        pickupDateTime,
        returnDateTime,
        pickupLocation,
        returnLocation,
        rateType = 'DAILY',
        manualRentalAmount,
        baseRate: customBaseRate,
        passengerCount,
        withDriver = false,
        driverAllowancePerDay = 500,
        discountAmount = 0,
        advancePaid = 0,
        status = 'CONFIRMED',
        managerOverrideCompliance = false,
        overrideComplianceReason,
        extras = [],
      } = req.body;

      const user = req.user!;
      const pickup = new Date(pickupDateTime);
      const returnDate = new Date(returnDateTime);

      if (returnDate <= pickup) {
        res.status(400).json({ message: 'Return date must be strictly after pickup date' });
        return;
      }

      // 1. Verify or Auto-Create Customer
      let finalCustomerId = customerId;
      let customer: any = null;

      if (finalCustomerId) {
        customer = await prisma.customer.findFirst({
          where: { id: finalCustomerId, deletedAt: null },
          include: { documents: true },
        });

        if (!customer) {
          res.status(404).json({ message: 'Customer not found' });
          return;
        }

        if (customer.isBlacklisted) {
          res.status(400).json({
            message: `Cannot book: Customer is blacklisted. Reason: ${customer.blacklistReason || 'Documented violation'}`,
          });
          return;
        }

        // DL Expiry Guard for existing customer on self-drive
        if (!withDriver) {
          const dlDoc = customer.documents?.find((d: any) => d.docType === 'DRIVING_LICENCE');
          if (dlDoc && dlDoc.expiryDate && new Date(dlDoc.expiryDate) < returnDate) {
            res.status(400).json({
              message: `Customer Driving Licence expires on ${new Date(dlDoc.expiryDate).toLocaleDateString(
                'en-IN'
              )}, which is before the rental return date (${returnDate.toLocaleDateString('en-IN')}).`,
            });
            return;
          }
        }
      } else if (customerName && customerPhone) {
        const trimmedPhone = String(customerPhone).trim();
        const trimmedName = String(customerName).trim();

        // Check if customer with this phone number already exists
        customer = await prisma.customer.findFirst({
          where: { phone: trimmedPhone, deletedAt: null },
          include: { documents: true },
        });

        if (customer) {
          if (customer.isBlacklisted) {
            res.status(400).json({
              message: `Cannot book: Customer is blacklisted. Reason: ${customer.blacklistReason || 'Documented violation'}`,
            });
            return;
          }
          finalCustomerId = customer.id;
        } else {
          // Auto-create new customer record on the fly
          customer = await prisma.customer.create({
            data: {
              fullName: trimmedName,
              phone: trimmedPhone,
              email: customerEmail?.trim() || `${trimmedPhone}@walkin.drivepulse.local`,
              address: customerCity?.trim() ? `Walk-in (${customerCity.trim()})` : 'Walk-in Customer',
              emergencyContactName: 'N/A',
              emergencyContactPhone: trimmedPhone,
              documents: customerDlNumber?.trim()
                ? {
                    create: [
                      {
                        docType: 'DRIVING_LICENCE',
                        documentNumber: customerDlNumber.trim(),
                        expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
                        isVerified: true,
                        filePath: 'walkin/dl_on_file.pdf',
                      },
                    ],
                  }
                : undefined,
            },
            include: { documents: true },
          });
          finalCustomerId = customer.id;
        }
      } else {
        res.status(400).json({ message: 'Customer ID or Customer Name and Phone is required' });
        return;
      }

      // 2. Verify Vehicle
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, deletedAt: null },
        include: { documents: true },
      });

      if (!vehicle) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }

      if (vehicle.status === 'INACTIVE' || vehicle.status === 'MAINTENANCE') {
        res.status(400).json({ message: `Vehicle is currently not available (Status: ${vehicle.status})` });
        return;
      }

      // Check vehicle compliance
      const now = new Date();
      const mandatoryDocs = [DocumentType.INSURANCE, DocumentType.FITNESS, DocumentType.PUC];
      const expiredDocs: string[] = [];

      for (const mDoc of mandatoryDocs) {
        const found = vehicle.documents.find((d) => d.type === mDoc);
        if (!found || new Date(found.expiryDate) < now) {
          expiredDocs.push(mDoc);
        }
      }

      if (expiredDocs.length > 0) {
        if (!managerOverrideCompliance) {
          res.status(400).json({
            message: `Vehicle has expired/missing mandatory compliance documents: ${expiredDocs.join(
              ', '
            )}. Manager override required to proceed.`,
            expiredDocs,
          });
          return;
        }

        // Manager override validation
        if (user.role === Role.STAFF) {
          res.status(403).json({ message: 'Staff cannot override vehicle compliance issues. Manager approval required.' });
          return;
        }

        if (!overrideComplianceReason || overrideComplianceReason.trim().length < 5) {
          res.status(400).json({ message: 'A documented override reason is required to bypass compliance rules.' });
          return;
        }
      }

      // 3. Compute Quotation with Manual / People-based Pricing Support
      // Rental duration in days (minimum 1 day)
      const diffMs = returnDate.getTime() - pickup.getTime();
      const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // Allow manual price override (pricing based on people or negotiated quote)
      let computedBaseRental = 0;
      let computedBaseRate = 0;

      if (manualRentalAmount !== undefined && manualRentalAmount !== null && Number(manualRentalAmount) >= 0) {
        computedBaseRental = Number(manualRentalAmount);
        computedBaseRate = rentalDays > 0 ? Math.round((computedBaseRental / rentalDays) * 100) / 100 : computedBaseRental;
      } else if (customBaseRate !== undefined && customBaseRate !== null && Number(customBaseRate) >= 0) {
        computedBaseRate = Number(customBaseRate);
        computedBaseRental = rentalDays * computedBaseRate;
      } else {
        computedBaseRate = vehicle.dailyRate;
        computedBaseRental = rentalDays * computedBaseRate;
      }

      const baseRateToStore = computedBaseRate;
      const baseRental = computedBaseRental;
      const driverTotal = withDriver ? rentalDays * driverAllowancePerDay : 0;

      let totalExtrasAmount = 0;
      const computedExtras = extras.map((ex: any) => {
        const total = (Number(ex.dailyPrice || 0) * rentalDays + Number(ex.fixedPrice || 0)) * Number(ex.quantity || 1);
        totalExtrasAmount += total;
        return {
          name: ex.name,
          dailyPrice: Number(ex.dailyPrice || 0),
          fixedPrice: Number(ex.fixedPrice || 0),
          quantity: Number(ex.quantity || 1),
          totalAmount: total,
        };
      });

      const subtotal = Math.max(0, baseRental + driverTotal + totalExtrasAmount - Number(discountAmount || 0));
      const taxPercentage = req.body.taxPercentage !== undefined ? Number(req.body.taxPercentage) : 18;
      const taxAmount = taxPercentage > 0 ? Math.round((subtotal * (taxPercentage / 100)) * 100) / 100 : 0;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
      const securityDeposit = vehicle.securityDeposit;
      const balanceDue = Math.max(0, totalAmount - Number(advancePaid || 0));

      // 4. Overlap Guard inside Prisma Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Re-check overlap inside transaction
        const conflict = await tx.booking.findFirst({
          where: {
            vehicleId,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.PICKED_UP] },
            deletedAt: null,
            pickupDateTime: { lt: returnDate },
            returnDateTime: { gt: pickup },
          },
        });

        if (conflict) {
          throw new Error(
            `Vehicle is already booked from ${new Date(conflict.pickupDateTime).toLocaleDateString(
              'en-IN'
            )} to ${new Date(conflict.returnDateTime).toLocaleDateString('en-IN')}`
          );
        }

        // Generate unique booking number: BK-YYYY-XXXX
        const year = new Date().getFullYear();
        const countThisYear = await tx.booking.count({
          where: {
            createdAt: {
              gte: new Date(`${year}-01-01`),
            },
          },
        });
        const seq = String(countThisYear + 1).padStart(4, '0');
        const bookingNumber = `BK-${year}-${seq}`;

        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            bookingNumber,
            customerId: finalCustomerId,
            vehicleId,
            createdByUserId: user.id,
            pickupDateTime: pickup,
            returnDateTime: returnDate,
            pickupLocation,
            returnLocation,
            rateType,
            baseRate: baseRateToStore,
            rentalDays,
            withDriver,
            driverAllowancePerDay: withDriver ? driverAllowancePerDay : 0,
            totalExtrasAmount,
            discountAmount: Number(discountAmount || 0),
            taxPercentage,
            taxAmount,
            totalAmount,
            securityDeposit,
            advancePaid: Number(advancePaid || 0),
            balanceDue,
            status,
            managerOverrideCompliance,
            overrideComplianceReason: managerOverrideCompliance ? overrideComplianceReason : null,
            extras: {
              create: computedExtras,
            },
          },
          include: {
            customer: true,
            vehicle: true,
            extras: true,
          },
        });

        // If advance paid, record immediate payment
        if (Number(advancePaid) > 0) {
          const receiptNumber = `REC-${year}-${String(Math.floor(1000 + Math.random() * 9000))}`;
          await tx.payment.create({
            data: {
              receiptNumber,
              bookingId: newBooking.id,
              amount: Number(advancePaid),
              mode: 'UPI',
              type: 'ADVANCE',
              receivedByUserId: user.id,
              notes: 'Advance booking payment recorded during booking creation',
            },
          });
        }

        return newBooking;
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'Booking',
        entityId: result.id,
        details: {
          bookingNumber: result.bookingNumber,
          customer: result.customer.fullName,
          vehicle: result.vehicle.registrationNumber,
          totalAmount: result.totalAmount,
          advancePaid: result.advancePaid,
          status: result.status,
          managerOverrideCompliance,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('createBooking error:', error);
      res.status(400).json({ message: error.message || 'Error creating booking' });
    }
  }

  /**
   * Update status (e.g. Quote -> Confirmed, or Cancel booking)
   */
  public static async updateBookingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, cancellationReason, cancellationFee = 0 } = req.body;
      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id, deletedAt: null },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      if (status === BookingStatus.CANCELLED) {
        if (!cancellationReason || cancellationReason.trim().length < 3) {
          res.status(400).json({ message: 'Cancellation reason is required' });
          return;
        }

        const updated = await prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason,
            cancellationFee: Number(cancellationFee || 0),
          },
        });

        // Ensure vehicle returns to AVAILABLE if it was reserved
        await prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { status: 'AVAILABLE' },
        });

        await AuditService.log({
          userId: user.id,
          action: 'UPDATE',
          entity: 'Booking',
          entityId: id,
          details: { action: 'CANCEL', cancellationReason, cancellationFee },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.json(updated);
        return;
      }

      // Quote to Confirmed transition
      if (status === BookingStatus.CONFIRMED && booking.status === BookingStatus.QUOTE) {
        const updated = await prisma.booking.update({
          where: { id },
          data: { status: BookingStatus.CONFIRMED },
        });

        await AuditService.log({
          userId: user.id,
          action: 'UPDATE',
          entity: 'Booking',
          entityId: id,
          details: { fromStatus: booking.status, toStatus: BookingStatus.CONFIRMED },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.json(updated);
        return;
      }

      res.status(400).json({
        message: `Direct transition to ${status} is not allowed via this endpoint. Use Inspection Checklists for Pickups and Returns.`,
      });
    } catch (error) {
      console.error('updateBookingStatus error:', error);
      res.status(500).json({ message: 'Internal server error updating booking status' });
    }
  }

  /**
   * Extend booking return date with overlap verification and rate recalculation
   */
  public static async extendBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newReturnDateTime, discountAmount = 0 } = req.body;
      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id, deletedAt: null },
        include: { vehicle: true, extras: true },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PICKED_UP) {
        res.status(400).json({ message: `Cannot extend booking with status ${booking.status}` });
        return;
      }

      const newReturn = new Date(newReturnDateTime);
      if (isNaN(newReturn.getTime()) || newReturn <= new Date(booking.returnDateTime)) {
        res.status(400).json({ message: 'New return date must be strictly after the current return date' });
        return;
      }

      // Check for vehicle booking conflicts in extension window
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          vehicleId: booking.vehicleId,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PICKED_UP] },
          deletedAt: null,
          pickupDateTime: { lt: newReturn },
          returnDateTime: { gt: booking.returnDateTime },
        },
      });

      if (conflict) {
        res.status(400).json({
          message: `Cannot extend: Vehicle is already scheduled for another booking from ${new Date(
            conflict.pickupDateTime
          ).toLocaleDateString('en-IN')}`,
        });
        return;
      }

      // Recalculate duration & pricing
      const pickup = new Date(booking.pickupDateTime);
      const diffMs = newReturn.getTime() - pickup.getTime();
      const updatedDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const baseRental = updatedDays * booking.baseRate;
      const driverTotal = booking.withDriver ? updatedDays * booking.driverAllowancePerDay : 0;

      // Recalculate extras with daily prices
      let totalExtrasAmount = 0;
      for (const extra of booking.extras) {
        const updatedTotal = (extra.dailyPrice * updatedDays + extra.fixedPrice) * extra.quantity;
        totalExtrasAmount += updatedTotal;
        await prisma.bookingExtra.update({
          where: { id: extra.id },
          data: { totalAmount: updatedTotal },
        });
      }

      const subtotal = Math.max(0, baseRental + driverTotal + totalExtrasAmount - Number(discountAmount || booking.discountAmount));
      const taxAmount = Math.round((subtotal * (booking.taxPercentage / 100)) * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
      const balanceDue = Math.max(0, totalAmount - booking.advancePaid);

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          returnDateTime: newReturn,
          rentalDays: updatedDays,
          totalExtrasAmount,
          discountAmount: Number(discountAmount || booking.discountAmount),
          taxAmount,
          totalAmount,
          balanceDue,
        },
        include: {
          customer: true,
          vehicle: true,
          extras: true,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'UPDATE',
        entity: 'Booking',
        entityId: id,
        details: {
          action: 'EXTEND',
          oldReturn: booking.returnDateTime,
          newReturn,
          addedDays: updatedDays - booking.rentalDays,
          newTotal: totalAmount,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(updated);
    } catch (error) {
      console.error('extendBooking error:', error);
      res.status(500).json({ message: 'Internal server error extending booking' });
    }
  }

  /**
   * Download or stream Rental Agreement PDF
   */
  public static async downloadRentalAgreement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findFirst({
        where: { id, deletedAt: null },
        include: {
          customer: {
            include: {
              documents: true,
            },
          },
          vehicle: true,
          createdByUser: true,
          extras: true,
        },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      const pdfBuffer = await PdfService.generateRentalAgreement(booking as BookingWithDetails);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Agreement-${booking.bookingNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('downloadRentalAgreement error:', error);
      res.status(500).json({ message: 'Internal server error generating agreement PDF' });
    }
  }
}
