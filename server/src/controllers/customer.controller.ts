import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role, CustomerDocType } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import {
  createCustomerSchema,
  updateCustomerSchema,
  blacklistCustomerSchema,
} from '../validators/customer.validator';
import { recordAuditLog } from '../services/audit.service';

export class CustomerController {
  static async listCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string)?.trim();
      const isBlacklisted = req.query.isBlacklisted as string;
      const rating = req.query.rating as string;

      const where: any = { deletedAt: null };

      if (isBlacklisted === 'true') {
        where.isBlacklisted = true;
      } else if (isBlacklisted === 'false') {
        where.isBlacklisted = false;
      }

      if (rating && rating !== 'ALL') {
        where.rating = parseInt(rating, 10);
      }

      if (search) {
        where.OR = [
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { alternatePhone: { contains: search } },
          { email: { contains: search } },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            documents: {
              select: {
                id: true,
                docType: true,
                documentNumber: true,
                expiryDate: true,
                isVerified: true,
              },
            },
            bookings: {
              where: { deletedAt: null },
              select: {
                id: true,
                totalAmount: true,
                balanceDue: true,
                status: true,
              },
            },
            _count: {
              select: { bookings: true, documents: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.customer.count({ where }),
      ]);

      // Calculate total spent, outstanding balance, and DL status for each customer
      const enhancedCustomers = customers.map((c) => {
        const totalSpent = c.bookings
          .filter((b) => b.status === 'PICKED_UP' || b.status === 'RETURNED')
          .reduce((sum, b) => sum + (b.totalAmount - b.balanceDue), 0);

        const outstandingBalance = c.bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PICKED_UP' || b.status === 'RETURNED')
          .reduce((sum, b) => sum + b.balanceDue, 0);

        const dlDoc = c.documents.find((d) => d.docType === CustomerDocType.DRIVING_LICENCE);
        let dlStatus = 'NOT_UPLOADED';
        if (dlDoc) {
          if (dlDoc.expiryDate && new Date(dlDoc.expiryDate) < new Date()) {
            dlStatus = 'EXPIRED';
          } else {
            dlStatus = 'VALID';
          }
        }

        return {
          ...c,
          totalSpent,
          outstandingBalance,
          dlStatus,
          drivingLicence: dlDoc || null,
        };
      });

      return sendSuccess(
        res,
        {
          customers: enhancedCustomers,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Customers retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
          },
          bookings: {
            where: { deletedAt: null },
            include: {
              vehicle: {
                select: {
                  id: true,
                  registrationNumber: true,
                  make: true,
                  model: true,
                },
              },
              payments: {
                orderBy: { paymentDate: 'desc' },
              },
            },
            orderBy: { pickupDateTime: 'desc' },
          },
        },
      });

      if (!customer || customer.deletedAt) {
        return sendError(res, 'Customer not found', 404);
      }

      // Financial analytics
      const totalSpent = customer.bookings
        .filter((b) => b.status === 'PICKED_UP' || b.status === 'RETURNED')
        .reduce((sum, b) => sum + (b.totalAmount - b.balanceDue), 0);

      const outstandingBalance = customer.bookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'PICKED_UP' || b.status === 'RETURNED')
        .reduce((sum, b) => sum + b.balanceDue, 0);

      // Driving licence inspection
      const dlDoc = customer.documents.find((d) => d.docType === CustomerDocType.DRIVING_LICENCE);
      const isDlExpired = dlDoc?.expiryDate ? new Date(dlDoc.expiryDate) < new Date() : false;

      return sendSuccess(
        res,
        {
          ...customer,
          totalSpent,
          outstandingBalance,
          isDlExpired,
          hasValidDl: !!dlDoc && !isDlExpired,
        },
        'Customer details retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createCustomerSchema.parse(req.body);

      // Check phone uniqueness
      const existing = await prisma.customer.findFirst({
        where: { phone: validated.phone, deletedAt: null },
      });

      if (existing) {
        return sendError(res, 'A customer with this phone number already exists', 409);
      }

      const customer = await prisma.customer.create({
        data: {
          fullName: validated.fullName,
          phone: validated.phone,
          alternatePhone: validated.alternatePhone || null,
          email: validated.email || null,
          address: validated.address,
          dob: validated.dob || null,
          occupation: validated.occupation || null,
          emergencyContactName: validated.emergencyContactName || null,
          emergencyContactPhone: validated.emergencyContactPhone || null,
          emergencyContactRelation: validated.emergencyContactRelation || null,
          rating: validated.rating,
          notes: validated.notes || null,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Customer',
        entityId: customer.id,
        details: { fullName: customer.fullName, phone: customer.phone },
        req,
      });

      return sendSuccess(res, customer, 'Customer created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateCustomerSchema.parse(req.body);

      const existing = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        return sendError(res, 'Customer not found', 404);
      }

      if (validated.phone && validated.phone !== existing.phone) {
        const phoneTaken = await prisma.customer.findFirst({
          where: { phone: validated.phone, deletedAt: null, id: { not: id } },
        });
        if (phoneTaken) {
          return sendError(res, 'This phone number is already registered to another customer', 409);
        }
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          ...(validated.fullName && { fullName: validated.fullName }),
          ...(validated.phone && { phone: validated.phone }),
          ...(validated.alternatePhone !== undefined && {
            alternatePhone: validated.alternatePhone,
          }),
          ...(validated.email !== undefined && { email: validated.email }),
          ...(validated.address && { address: validated.address }),
          ...(validated.dob !== undefined && { dob: validated.dob }),
          ...(validated.occupation !== undefined && { occupation: validated.occupation }),
          ...(validated.emergencyContactName !== undefined && {
            emergencyContactName: validated.emergencyContactName,
          }),
          ...(validated.emergencyContactPhone !== undefined && {
            emergencyContactPhone: validated.emergencyContactPhone,
          }),
          ...(validated.emergencyContactRelation !== undefined && {
            emergencyContactRelation: validated.emergencyContactRelation,
          }),
          ...(validated.rating !== undefined && { rating: validated.rating }),
          ...(validated.notes !== undefined && { notes: validated.notes }),
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: id,
        details: { changes: validated },
        req,
      });

      return sendSuccess(res, updated, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleBlacklist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = blacklistCustomerSchema.parse(req.body);

      const customer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customer || customer.deletedAt) {
        return sendError(res, 'Customer not found', 404);
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          isBlacklisted: validated.isBlacklisted,
          blacklistReason: validated.isBlacklisted ? validated.blacklistReason || 'Unspecified staff reason' : null,
          blacklistedAt: validated.isBlacklisted ? new Date() : null,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: id,
        details: {
          event: validated.isBlacklisted ? 'CUSTOMER_BLACKLISTED' : 'CUSTOMER_WHITELISTED',
          reason: validated.blacklistReason,
        },
        req,
      });

      return sendSuccess(
        res,
        updated,
        validated.isBlacklisted
          ? 'Customer has been blacklisted'
          : 'Customer removed from blacklist'
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
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

      if (!customer || customer.deletedAt) {
        return sendError(res, 'Customer not found', 404);
      }

      if (customer.bookings.length > 0) {
        return sendError(
          res,
          'Cannot delete customer with active or confirmed bookings',
          400
        );
      }

      await prisma.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Customer',
        entityId: id,
        details: { fullName: customer.fullName, phone: customer.phone },
        req,
      });

      return sendSuccess(res, null, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async checkLicenceValidity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const returnDateTimeStr = req.query.returnDate as string;

      if (!returnDateTimeStr) {
        return sendError(res, 'returnDate query parameter is required', 400);
      }

      const returnDateTime = new Date(returnDateTimeStr);
      const now = new Date();

      const dlDoc = await prisma.customerDocument.findFirst({
        where: {
          customerId: id,
          docType: CustomerDocType.DRIVING_LICENCE,
        },
      });

      if (!dlDoc) {
        return sendSuccess(res, {
          hasLicence: false,
          isExpired: true,
          willExpireDuringRental: false,
          message: 'No Driving Licence has been uploaded for this customer.',
        });
      }

      if (!dlDoc.expiryDate) {
        return sendSuccess(res, {
          hasLicence: true,
          isExpired: false,
          willExpireDuringRental: false,
          message: 'Driving Licence does not have an expiry date recorded.',
        });
      }

      const expiryDate = new Date(dlDoc.expiryDate);

      if (expiryDate < now) {
        return sendSuccess(res, {
          hasLicence: true,
          isExpired: true,
          willExpireDuringRental: false,
          expiryDate: dlDoc.expiryDate,
          message: `Driving Licence expired on ${expiryDate.toLocaleDateString('en-IN')}. Rental cannot proceed without valid licence or manager override.`,
        });
      }

      if (expiryDate < returnDateTime) {
        return sendSuccess(res, {
          hasLicence: true,
          isExpired: false,
          willExpireDuringRental: true,
          expiryDate: dlDoc.expiryDate,
          message: `Warning: Driving Licence will expire on ${expiryDate.toLocaleDateString(
            'en-IN'
          )}, which is before the scheduled rental return date (${returnDateTime.toLocaleDateString(
            'en-IN'
          )}).`,
        });
      }

      return sendSuccess(res, {
        hasLicence: true,
        isExpired: false,
        willExpireDuringRental: false,
        expiryDate: dlDoc.expiryDate,
        message: `Driving licence is valid until ${expiryDate.toLocaleDateString('en-IN')}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
