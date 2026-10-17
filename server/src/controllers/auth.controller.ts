import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import { setAuthCookies, clearAuthCookies } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '../services/audit.service';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.email, validated.password, req);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await recordAuditLog({
          userId: req.user.id,
          action: 'LOGOUT',
          entity: 'User',
          entityId: req.user.id,
          details: { email: req.user.email },
          req,
        });
      }

      clearAuthCookies(res);
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, { user }, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return sendError(res, 'Refresh token not found in cookies', 401);
      }

      const result = await AuthService.refresh(refreshToken);
      setAuthCookies(res, result.accessToken, refreshToken);

      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validated.email, req);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validated.token, validated.newPassword, req);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Not authenticated', 401);
      }

      const validated = changePasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const isMatch = await bcrypt.compare(validated.currentPassword, user.passwordHash);
      if (!isMatch) {
        return sendError(res, 'Current password does not match', 400);
      }

      const newHash = await bcrypt.hash(validated.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await recordAuditLog({
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        details: { event: 'PASSWORD_CHANGED' },
        req,
      });

      return sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
