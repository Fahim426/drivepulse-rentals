import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { AuditService } from '../services/audit.service';
import { PdfService, InvoiceWithDetails } from '../services/pdf.service';

export class InvoiceController {
  /**
   * Generate an official GST Tax Invoice for a booking
   */
  public static async generateInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { bookingId, customerGstin, discount = 0 } = req.body;
      const user = req.user!;

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: {
          customer: true,
          vehicle: true,
          extras: true,
          invoices: true,
        },
      });

      if (!booking) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }

      // Check if invoice already exists
      if (booking.invoices && booking.invoices.length > 0) {
        res.json(booking.invoices[0]);
        return;
      }

      // Compute GST breakdown
      const baseRental = booking.rentalDays * booking.baseRate;
      const driverTotal = booking.withDriver ? booking.rentalDays * booking.driverAllowancePerDay : 0;
      const extrasTotal = booking.extras.reduce((sum, ex) => sum + ex.totalAmount, 0);
      const appliedDiscount = Number(discount || booking.discountAmount || 0);

      const subtotal = Math.max(0, baseRental + driverTotal + extrasTotal - appliedDiscount);
      const cgstAmount = Math.round(subtotal * 0.09 * 100) / 100; // 9% CGST
      const sgstAmount = Math.round(subtotal * 0.09 * 100) / 100; // 9% SGST
      const igstAmount = 0; // Intra-state Karnataka supply
      const totalAmount = Math.round((subtotal + cgstAmount + sgstAmount) * 100) / 100;

      const year = new Date().getFullYear();
      const countThisYear = await prisma.invoice.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
          },
        },
      });
      const seq = String(countThisYear + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${seq}`;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          bookingId: booking.id,
          subtotal,
          discount: appliedDiscount,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalAmount,
          customerGstin: customerGstin || null,
        },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
              extras: true,
            },
          },
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: invoice.id,
        details: {
          invoiceNumber,
          bookingNumber: booking.bookingNumber,
          customer: booking.customer.fullName,
          totalAmount,
          customerGstin,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('generateInvoice error:', error);
      res.status(500).json({ message: 'Internal server error generating tax invoice' });
    }
  }

  /**
   * Get paginated invoices list
   */
  public static async getInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        from,
        to,
      } = req.query as Record<string, string | undefined>;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (from || to) {
        where.invoiceDate = {};
        if (from) where.invoiceDate.gte = new Date(from);
        if (to) where.invoiceDate.lte = new Date(to);
      }

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { invoiceNumber: { contains: query } },
          { customerGstin: { contains: query } },
          { booking: { bookingNumber: { contains: query } } },
          { booking: { customer: { fullName: { contains: query } } } },
          { booking: { customer: { phone: { contains: query } } } },
          { booking: { vehicle: { registrationNumber: { contains: query } } } },
        ];
      }

      const [total, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { invoiceDate: 'desc' },
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
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
          },
        }),
      ]);

      res.json({
        invoices,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('getInvoices error:', error);
      res.status(500).json({ message: 'Internal server error fetching invoices' });
    }
  }

  /**
   * Get single invoice details
   */
  public static async getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
              extras: true,
              payments: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ message: 'Invoice not found' });
        return;
      }

      res.json(invoice);
    } catch (error) {
      console.error('getInvoiceById error:', error);
      res.status(500).json({ message: 'Internal server error fetching invoice' });
    }
  }

  /**
   * Download / stream GST Tax Invoice PDF
   */
  public static async downloadInvoicePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              customer: true,
              vehicle: true,
              extras: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ message: 'Invoice not found' });
        return;
      }

      const pdfBuffer = await PdfService.generateGstTaxInvoice(invoice as InvoiceWithDetails);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="TaxInvoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('downloadInvoicePdf error:', error);
      res.status(500).json({ message: 'Internal server error generating invoice PDF' });
    }
  }
}
