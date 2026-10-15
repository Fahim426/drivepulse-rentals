import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  /**
   * Get comprehensive live executive dashboard statistics
   */
  public static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      // 1. Fetch fleet data in one query
      const allVehicles = await prisma.vehicle.findMany({
        where: { deletedAt: null },
        select: { id: true, fuelType: true, status: true },
      });

      const totalVehicles = allVehicles.length;
      const availableVehicles = allVehicles.filter((v) => v.status === 'AVAILABLE').length;
      const rentedVehicles = allVehicles.filter((v) => v.status === 'RENTED').length;
      const maintenanceVehicles = allVehicles.filter((v) => v.status === 'MAINTENANCE').length;
      const utilizationRate = totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;

      // Group by fuel type in memory
      const fuelCounts: Record<string, number> = {};
      for (const v of allVehicles) {
        fuelCounts[v.fuelType] = (fuelCounts[v.fuelType] || 0) + 1;
      }
      const fuelBreakdown = Object.entries(fuelCounts).map(([fuel, count]) => ({ fuel, count }));

      // 2. Fetch payments & bookings for KPIs
      const [
        monthPayments,
        pendingBookings,
        activeBookingsWithDeposits,
      ] = await Promise.all([
        prisma.payment.findMany({
          where: {
            createdAt: { gte: fourteenDaysAgo },
          },
          select: { amount: true, type: true, createdAt: true },
        }),
        prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: { notIn: ['CANCELLED'] },
            balanceDue: { gt: 0 },
          },
          select: { balanceDue: true },
        }),
        prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: 'PICKED_UP',
          },
          select: { securityDeposit: true },
        }),
      ]);

      let todayCollections = 0;
      let monthRevenue = 0;

      for (const p of monthPayments) {
        const pDate = new Date(p.createdAt);
        const amt = p.type !== 'REFUND' ? p.amount : -p.amount;
        if (pDate >= startOfToday && pDate <= endOfToday) {
          todayCollections += amt;
        }
        if (pDate >= startOfMonth) {
          monthRevenue += amt;
        }
      }

      const pendingReceivables = pendingBookings.reduce((sum, b) => sum + b.balanceDue, 0);
      const activeDepositsHeld = activeBookingsWithDeposits.reduce((sum, b) => sum + b.securityDeposit, 0);

      // 3. Operational Dispatch & Schedule Items
      const [
        todayPickups,
        todayReturns,
        overdueReturns,
        expiringDocuments,
      ] = await Promise.all([
        prisma.booking.findMany({
          where: {
            deletedAt: null,
            pickupDateTime: { gte: startOfToday, lte: endOfToday },
            status: { in: ['CONFIRMED', 'QUOTE'] },
          },
          include: {
            customer: { select: { fullName: true, phone: true } },
            vehicle: { select: { make: true, model: true, registrationNumber: true } },
          },
          take: 10,
        }),
        prisma.booking.findMany({
          where: {
            deletedAt: null,
            returnDateTime: { gte: startOfToday, lte: endOfToday },
            status: 'PICKED_UP',
          },
          include: {
            customer: { select: { fullName: true, phone: true } },
            vehicle: { select: { make: true, model: true, registrationNumber: true } },
          },
          take: 10,
        }),
        prisma.booking.findMany({
          where: {
            deletedAt: null,
            returnDateTime: { lt: startOfToday },
            status: 'PICKED_UP',
          },
          include: {
            customer: { select: { fullName: true, phone: true } },
            vehicle: { select: { make: true, model: true, registrationNumber: true } },
          },
          take: 10,
        }),
        prisma.vehicleDocument.findMany({
          where: {
            expiryDate: { lte: fifteenDaysFromNow },
            vehicle: { deletedAt: null },
          },
          include: {
            vehicle: { select: { id: true, make: true, model: true, registrationNumber: true } },
          },
          orderBy: { expiryDate: 'asc' },
          take: 10,
        }),
      ]);

      // 4. Daily Revenue Trend for the last 14 days (bucketed in memory)
      const trendData: Array<{ date: string; label: string; collections: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        const dayTotal = monthPayments
          .filter((p) => new Date(p.createdAt).toISOString().split('T')[0] === dayStr)
          .reduce((sum, p) => (p.type !== 'REFUND' ? sum + p.amount : sum - p.amount), 0);

        trendData.push({
          date: dayStr,
          label: dayLabel,
          collections: Math.max(0, dayTotal),
        });
      }

      // 5. Recent System Audit Activities
      const recentActivities = await prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, role: true } },
        },
      });

      res.json({
        fleet: {
          total: totalVehicles,
          available: availableVehicles,
          rented: rentedVehicles,
          maintenance: maintenanceVehicles,
          utilizationRate,
          fuelBreakdown,
        },
        financials: {
          todayCollections,
          monthRevenue,
          pendingReceivables,
          activeDepositsHeld,
        },
        operations: {
          todayPickupsCount: todayPickups.length,
          todayReturnsCount: todayReturns.length,
          overdueReturnsCount: overdueReturns.length,
          expiringDocumentsCount: expiringDocuments.length,
          todayPickups,
          todayReturns,
          overdueReturns,
          expiringDocuments,
        },
        revenueTrend: trendData,
        recentActivities,
      });
    } catch (error) {
      console.error('getSummary error:', error);
      res.status(500).json({ message: 'Error retrieving dashboard analytics' });
    }
  }
}
