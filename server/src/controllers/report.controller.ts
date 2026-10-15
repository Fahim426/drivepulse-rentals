import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';

export class ReportController {
  /**
   * 1. Revenue & Collections Report with CSV Export
   */
  public static async getRevenueReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from, to, mode, type, format } = req.query as Record<string, string | undefined>;

      const where: any = {};
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      if (mode && mode !== 'ALL') where.mode = mode;
      if (type && type !== 'ALL') where.type = type;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: { select: { fullName: true, phone: true } },
              vehicle: { select: { make: true, model: true, registrationNumber: true } },
            },
          },
          receivedByUser: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Grouping by Mode
      const byMode: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let totalCollected = 0;
      let totalRefunds = 0;

      for (const p of payments) {
        byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
        byType[p.type] = (byType[p.type] || 0) + p.amount;
        if (p.type === 'REFUND') {
          totalRefunds += p.amount;
        } else {
          totalCollected += p.amount;
        }
      }

      // Handle CSV Download
      if (format === 'csv') {
        let csv = 'Receipt #,Date,Booking #,Customer,Phone,Vehicle,Mode,Type,Reference,Amount (INR),Cashier\n';
        for (const p of payments) {
          const row = [
            p.receiptNumber,
            new Date(p.paymentDate).toISOString().split('T')[0],
            p.booking.bookingNumber,
            `"${p.booking.customer.fullName.replace(/"/g, '""')}"`,
            p.booking.customer.phone,
            `"${p.booking.vehicle.make} ${p.booking.vehicle.model} (${p.booking.vehicle.registrationNumber})"`,
            p.mode,
            p.type,
            `"${(p.transactionReference || '').replace(/"/g, '""')}"`,
            p.amount.toFixed(2),
            `"${(p.receivedByUser?.fullName || '').replace(/"/g, '""')}"`,
          ];
          csv += row.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        return;
      }

      res.json({
        summary: {
          totalTransactions: payments.length,
          totalCollected,
          totalRefunds,
          netCollections: totalCollected - totalRefunds,
          byMode,
          byType,
        },
        payments,
      });
    } catch (error) {
      console.error('getRevenueReport error:', error);
      res.status(500).json({ message: 'Error generating revenue report' });
    }
  }

  /**
   * 2. Fleet Performance & Utilization Report with CSV Export
   */
  public static async getFleetUtilizationReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from, to, format } = req.query as Record<string, string | undefined>;

      const vehicles = await prisma.vehicle.findMany({
        where: { deletedAt: null },
        include: {
          bookings: {
            where: {
              status: { in: ['CONFIRMED', 'PICKED_UP', 'RETURNED'] },
              ...(from || to
                ? {
                    pickupDateTime: from ? { gte: new Date(from) } : undefined,
                    returnDateTime: to ? { lte: new Date(to) } : undefined,
                  }
                : {}),
            },
            select: {
              id: true,
              totalAmount: true,
              rentalDays: true,
              baseRate: true,
            },
          },
          maintenanceRecords: {
            where: {
              ...(from || to
                ? {
                    serviceDate: {
                      gte: from ? new Date(from) : undefined,
                      lte: to ? new Date(to) : undefined,
                    },
                  }
                : {}),
            },
            select: { cost: true },
          },
          expenses: {
            where: {
              ...(from || to
                ? {
                    date: {
                      gte: from ? new Date(from) : undefined,
                      lte: to ? new Date(to) : undefined,
                    },
                  }
                : {}),
            },
            select: { amount: true },
          },
        },
        orderBy: { registrationNumber: 'asc' },
      });

      const reportData = vehicles.map((v) => {
        const totalBookings = v.bookings.length;
        const totalRentalDays = v.bookings.reduce((sum, b) => sum + (b.rentalDays || 1), 0);
        const totalRevenue = v.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const maintenanceCost = v.maintenanceRecords.reduce((sum, m) => sum + m.cost, 0);
        const otherExpenseCost = v.expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = maintenanceCost + otherExpenseCost;
        const netProfit = totalRevenue - totalExpenses;
        
        // Approximate 30-day baseline utilization
        const periodDays = from && to
          ? Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)))
          : 30;
        const utilizationRate = Math.min(100, Math.round((totalRentalDays / periodDays) * 100));

        return {
          id: v.id,
          registrationNumber: v.registrationNumber,
          make: v.make,
          model: v.model,
          fuelType: v.fuelType,
          status: v.status,
          odometer: v.odometer,
          dailyRate: v.dailyRate,
          totalBookings,
          totalRentalDays,
          totalRevenue,
          totalExpenses,
          netProfit,
          utilizationRate,
        };
      });

      if (format === 'csv') {
        let csv = 'Registration,Make,Model,Fuel,Status,Odometer (KM),Daily Rate (INR),Total Bookings,Days Rented,Revenue (INR),Expenses (INR),Net Profit (INR),Utilization %\n';
        for (const item of reportData) {
          const row = [
            item.registrationNumber,
            `"${item.make}"`,
            `"${item.model}"`,
            item.fuelType,
            item.status,
            item.odometer,
            item.dailyRate,
            item.totalBookings,
            item.totalRentalDays,
            item.totalRevenue.toFixed(2),
            item.totalExpenses.toFixed(2),
            item.netProfit.toFixed(2),
            `${item.utilizationRate}%`,
          ];
          csv += row.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=fleet-utilization-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        return;
      }

      res.json(reportData);
    } catch (error) {
      console.error('getFleetUtilizationReport error:', error);
      res.status(500).json({ message: 'Error generating fleet report' });
    }
  }

  /**
   * 3. Maintenance & Expenses Report with CSV Export
   */
  public static async getMaintenanceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from, to, format } = req.query as Record<string, string | undefined>;

      const where: any = {};
      if (from || to) {
        where.serviceDate = {};
        if (from) where.serviceDate.gte = new Date(from);
        if (to) where.serviceDate.lte = new Date(to);
      }

      const records = await prisma.maintenanceRecord.findMany({
        where,
        include: {
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
        orderBy: { serviceDate: 'desc' },
      });

      if (format === 'csv') {
        let csv = 'Service Date,Vehicle,Registration,Type,Odometer (KM),Cost (INR),Vendor,Notes\n';
        for (const r of records) {
          const row = [
            new Date(r.serviceDate).toISOString().split('T')[0],
            `"${r.vehicle.make} ${r.vehicle.model}"`,
            r.vehicle.registrationNumber,
            r.type,
            r.odometer,
            r.cost.toFixed(2),
            `"${(r.vendor || '').replace(/"/g, '""')}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`,
          ];
          csv += row.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=maintenance-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        return;
      }

      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

      res.json({
        totalCost,
        totalRecords: records.length,
        records,
      });
    } catch (error) {
      console.error('getMaintenanceReport error:', error);
      res.status(500).json({ message: 'Error generating maintenance report' });
    }
  }

  /**
   * 4. Customer Intelligence & Analytics Report
   */
  public static async getCustomerReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { format } = req.query as Record<string, string | undefined>;

      const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        include: {
          bookings: {
            where: { status: { notIn: ['CANCELLED'] } },
            select: { totalAmount: true, status: true },
          },
          documents: {
            select: { isVerified: true, docType: true },
          },
        },
      });

      const totalCustomers = customers.length;
      let blacklistedCount = 0;
      let repeatCustomersCount = 0;
      let verifiedCount = 0;

      const customerAnalytics = customers.map((c) => {
        if (c.isBlacklisted) blacklistedCount++;
        const totalBookings = c.bookings.length;
        if (totalBookings > 1) repeatCustomersCount++;
        const totalSpent = c.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        
        const hasVerifiedKyc = c.documents.some((d) => d.isVerified);
        if (hasVerifiedKyc) verifiedCount++;

        return {
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
          address: c.address,
          isBlacklisted: c.isBlacklisted,
          hasVerifiedKyc,
          totalBookings,
          totalSpent,
        };
      });

      // Sort by total spent descending
      customerAnalytics.sort((a, b) => b.totalSpent - a.totalSpent);

      if (format === 'csv') {
        let csv = 'Customer Name,Phone,Email,Address,Total Bookings,Total Spent (INR),KYC Verified,Blacklisted\n';
        for (const c of customerAnalytics) {
          const row = [
            `"${c.fullName.replace(/"/g, '""')}"`,
            c.phone,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.address || '').replace(/"/g, '""')}"`,
            c.totalBookings,
            c.totalSpent.toFixed(2),
            c.hasVerifiedKyc ? 'YES' : 'NO',
            c.isBlacklisted ? 'YES' : 'NO',
          ];
          csv += row.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=customer-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        return;
      }

      res.json({
        summary: {
          totalCustomers,
          blacklistedCount,
          verifiedCount,
          repeatCustomersCount,
          repeatRatePercentage: totalCustomers > 0 ? Math.round((repeatCustomersCount / totalCustomers) * 100) : 0,
        },
        customers: customerAnalytics,
      });
    } catch (error) {
      console.error('getCustomerReport error:', error);
      res.status(500).json({ message: 'Error generating customer report' });
    }
  }
}
