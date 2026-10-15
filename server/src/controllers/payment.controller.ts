import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role, PaymentType } from '../types';
import { AuditService } from '../services/audit.service';
import { PdfService, PaymentWithDetails } from '../services/pdf.service';

export class PaymentController {
  /**
   * Record a new payment against a booking
   */
  public static async recordPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        bookingId,
        amount,
        mode,
        type,
        transactionReference,
        notes,
      } = req.body;

      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { customer: true, vehicle: true },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      if (booking.status === 'CANCELLED') {
        res.status(400).json({ message: 'Cannot record payments on a cancelled booking' });
        return;
      }

      const numAmount = Number(amount);
      if (numAmount <= 0) {
        res.status(400).json({ message: 'Payment amount must be greater than zero' });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Generate unique receipt number: REC-YYYY-XXXX
        const year = new Date().getFullYear();
        const countThisYear = await tx.payment.count({
          where: {
            createdAt: {
              gte: new Date(`${year}-01-01`),
            },
          },
        });
        const seq = String(countThisYear + 1).padStart(4, '0');
        const receiptNumber = `REC-${year}-${seq}`;

        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            receiptNumber,
            bookingId: booking.id,
            amount: numAmount,
            mode,
            type,
            transactionReference: transactionReference || null,
            receivedByUserId: user.id,
            notes: notes || null,
          },
          include: {
            booking: {
              include: {
                customer: true,
                vehicle: true,
              },
            },
            receivedByUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });

        // Update booking balance and advance amounts
        if (type === PaymentType.ADVANCE || type === PaymentType.BALANCE) {
          const updatedAdvance = booking.advancePaid + numAmount;
          const updatedBalance = Math.max(0, booking.balanceDue - numAmount);
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              advancePaid: updatedAdvance,
              balanceDue: updatedBalance,
            },
          });
        } else if (
          type === PaymentType.EXTRA_KM ||
          type === PaymentType.DAMAGE_CHARGE ||
          type === PaymentType.LATE_FEE
        ) {
          const updatedBalance = Math.max(0, booking.balanceDue - numAmount);
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              balanceDue: updatedBalance,
            },
          });
        }

        return payment;
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: result.id,
        details: {
          receiptNumber: result.receiptNumber,
          bookingNumber: booking.bookingNumber,
          customer: booking.customer.fullName,
          amount: numAmount,
          mode,
          type,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('recordPayment error:', error);
      res.status(500).json({ message: 'Internal server error recording payment' });
    }
  }

  /**
   * Get paginated payment ledger with filtering
   */
  public static async getPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        bookingId,
        customerId,
        mode,
        type,
        from,
        to,
        search,
      } = req.query as Record<string, string | undefined>;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (bookingId) {
        where.bookingId = bookingId;
      }

      if (mode && mode !== 'ALL') {
        where.mode = mode;
      }

      if (type && type !== 'ALL') {
        where.type = type;
      }

      if (customerId) {
        where.booking = { customerId };
      }

      if (from || to) {
        where.paymentDate = {};
        if (from) where.paymentDate.gte = new Date(from);
        if (to) where.paymentDate.lte = new Date(to);
      }

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { receiptNumber: { contains: query } },
          { transactionReference: { contains: query } },
          { booking: { bookingNumber: { contains: query } } },
          { booking: { customer: { fullName: { contains: query } } } },
          { booking: { customer: { phone: { contains: query } } } },
          { booking: { vehicle: { registrationNumber: { contains: query } } } },
        ];
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { paymentDate: 'desc' },
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
                totalAmount: true,
                balanceDue: true,
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                  },
                },
                vehicle: {
                  select: {
                    id: true,
                    make: true,
                    model: true,
                    registrationNumber: true,
                  },
                },
              },
            },
            receivedByUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
        }),
      ]);

      res.json({
        payments,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('getPayments error:', error);
      res.status(500).json({ message: 'Internal server error fetching payments' });
    }
  }

  /**
   * Get single payment details
   */
  public static async getPaymentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
            },
          },
          receivedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!payment) {
        res.status(404).json({ message: 'Payment not found' });
        return;
      }

      res.json(payment);
    } catch (error) {
      console.error('getPaymentById error:', error);
      res.status(500).json({ message: 'Internal server error fetching payment' });
    }
  }

  /**
   * Download / stream payment receipt PDF
   */
  public static async downloadReceiptPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
            },
          },
          receivedByUser: true,
        },
      });

      if (!payment) {
        res.status(404).json({ message: 'Payment receipt not found' });
        return;
      }

      const pdfBuffer = await PdfService.generatePaymentReceipt(payment as unknown as PaymentWithDetails);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Receipt-${payment.receiptNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('downloadReceiptPdf error:', error);
      res.status(500).json({ message: 'Internal server error generating receipt PDF' });
    }
  }

  /**
   * Manager / Super Admin override to release vehicle or close rental with balance pending
   */
  public static async overrideBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      if (user.role === Role.STAFF) {
        res.status(403).json({ message: 'Staff cannot authorize balance overrides. Manager approval required.' });
        return;
      }

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          managerOverrideBalance: true,
          overrideBalanceReason: reason,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'OVERRIDE',
        entity: 'Booking',
        entityId: bookingId,
        details: { action: 'OVERRIDE_BALANCE', reason, remainingBalance: booking.balanceDue },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(updated);
    } catch (error) {
      console.error('overrideBalance error:', error);
      res.status(500).json({ message: 'Internal server error authorizing balance override' });
    }
  }
}
