import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { createUserSchema, updateUserSchema } from '../validators/auth.validator';
import { recordAuditLog } from '../services/audit.service';

export class UserController {
  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const normalizedEmail = validated.email.trim().toLowerCase();

      const existing = await prisma.user.findFirst({
        where: { email: normalizedEmail, deletedAt: null },
      });

      if (existing) {
        return sendError(res, 'A user with this email address already exists', 409);
      }

      const passwordHash = await bcrypt.hash(validated.password, 10);

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: validated.fullName,
          phone: validated.phone || null,
          role: validated.role,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'User',
        entityId: newUser.id,
        details: { email: newUser.email, role: newUser.role, fullName: newUser.fullName },
        req,
      });

      return sendSuccess(res, newUser, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateUserSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user || user.deletedAt) {
        return sendError(res, 'User not found', 404);
      }

      // Prevent self de-escalation if only one Super Admin exists
      if (user.role === Role.SUPER_ADMIN && validated.role && validated.role !== Role.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: { role: Role.SUPER_ADMIN, deletedAt: null, isActive: true },
        });
        if (superAdminCount <= 1) {
          return sendError(res, 'Cannot change role. At least one active Super Admin must exist.', 400);
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(validated.fullName && { fullName: validated.fullName }),
          ...(validated.phone !== undefined && { phone: validated.phone }),
          ...(validated.role && { role: validated.role }),
          ...(validated.isActive !== undefined && { isActive: validated.isActive }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: updated.id,
        details: { changes: validated },
        req,
      });

      return sendSuccess(res, updated, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async unlockUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'OVERRIDE',
        entity: 'User',
        entityId: updated.id,
        details: { event: 'ACCOUNT_UNLOCKED_BY_ADMIN' },
        req,
      });

      return sendSuccess(res, null, 'User account has been unlocked');
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        return sendError(res, 'You cannot delete your own account', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user || user.deletedAt) {
        return sendError(res, 'User not found', 404);
      }

      if (user.role === Role.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: { role: Role.SUPER_ADMIN, deletedAt: null },
        });
        if (superAdminCount <= 1) {
          return sendError(res, 'Cannot delete the only Super Admin in the system', 400);
        }
      }

      // Soft delete
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        details: { email: user.email, role: user.role },
        req,
      });

      return sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
