import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role } from '../types';
import { AuditService } from '../services/audit.service';

const DEFAULT_SETTINGS = {
  companyName: 'DrivePulse Self-Drive Car Rentals',
  legalName: 'DrivePulse Mobility Solutions Pvt. Ltd.',
  gstin: '29AABCU9603R1ZM',
  address: '#42, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
  phone: '+91 98765 43210',
  email: 'billing@drivepulse.com',
  bankName: 'HDFC Bank Ltd.',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  upiId: 'drivepulse@hdfcbank',
  defaultSecurityDeposit: 5000,
  driverAllowancePerDay: 500,
  gracePeriodMinutes: 60,
  lateFeePerHour: 200,
  extraKmRate: 12,
  gstRate: 18,
  sacCode: '996601',
};

export class SettingController {
  /**
   * Get all application settings
   */
  public static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dbSettings = await prisma.setting.findMany();
      
      const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

      for (const item of dbSettings) {
        try {
          settingsMap[item.key] = JSON.parse(item.value);
        } catch {
          settingsMap[item.key] = item.value;
        }
      }

      res.json(settingsMap);
    } catch (error) {
      console.error('getSettings error:', error);
      res.status(500).json({ message: 'Error retrieving system settings' });
    }
  }

  /**
   * Update one or more application settings (Manager / Super Admin only)
   */
  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const updates = req.body;
      const user = req.user!;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ message: 'Invalid settings payload' });
        return;
      }

      // Upsert each provided key in Prisma
      const results: Record<string, any> = {};
      for (const [key, val] of Object.entries(updates)) {
        let category = 'BUSINESS';
        if (['defaultSecurityDeposit', 'driverAllowancePerDay', 'gracePeriodMinutes', 'lateFeePerHour', 'extraKmRate', 'gstRate', 'sacCode'].includes(key)) {
          category = 'POLICIES';
        }

        const valueString = typeof val === 'object' ? JSON.stringify(val) : String(val);

        await prisma.setting.upsert({
          where: { key },
          create: {
            key,
            value: valueString,
            category,
          },
          update: {
            value: valueString,
            category,
          },
        });

        results[key] = val;
      }

      await AuditService.log({
        userId: user.id,
        action: 'UPDATE',
        entity: 'Setting',
        entityId: 'global',
        details: {
          updatedKeys: Object.keys(updates),
          updatedBy: user.fullName,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Settings saved successfully', settings: results });
    } catch (error) {
      console.error('updateSettings error:', error);
      res.status(500).json({ message: 'Error updating system settings' });
    }
  }

  /**
   * Update current user profile and password
   */
  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { fullName, phone, currentPassword, newPassword } = req.body;

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const updateData: any = {};
      if (fullName && fullName.trim()) updateData.fullName = fullName.trim();
      if (phone !== undefined) updateData.phone = phone.trim() || null;

      // Handle password change if requested
      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ message: 'Current password is required to set a new password' });
          return;
        }

        const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!isMatch) {
          res.status(400).json({ message: 'Incorrect current password' });
          return;
        }

        if (newPassword.length < 8) {
          res.status(400).json({ message: 'New password must be at least 8 characters long' });
          return;
        }

        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        details: {
          action: 'PROFILE_UPDATE',
          passwordChanged: !!newPassword,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Profile updated successfully', user: updated });
    } catch (error) {
      console.error('updateProfile error:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  }
}
