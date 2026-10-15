import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request } from 'express';
import { prisma } from '../prisma';
import { config } from '../config';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { recordAuditLog } from './audit.service';
import { Role } from '../types';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class AuthService {
  static async login(email: string, passwordPlain: string, req: Request) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt) {
      throw new AuthError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AuthError('This user account has been deactivated. Please contact Super Admin.', 403);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AuthError(
        `Account is locked due to 5 consecutive failed login attempts. Try again in ${remainingMinutes} minute(s).`,
        423
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);

    if (!isMatch) {
      const nextAttempts = user.failedLoginAttempts + 1;
      let updateData: any = { failedLoginAttempts: nextAttempts };

      if (nextAttempts >= config.security.maxFailedAttempts) {
        const lockoutEnd = new Date(Date.now() + config.security.lockoutDurationMinutes * 60 * 1000);
        updateData.lockedUntil = lockoutEnd;

        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

        await recordAuditLog({
          userId: user.id,
          action: 'OVERRIDE',
          entity: 'User',
          entityId: user.id,
          details: { event: 'ACCOUNT_LOCKED', failedAttempts: nextAttempts },
          req,
        });

        throw new Error(
          `Account locked after ${config.security.maxFailedAttempts} failed login attempts. Please wait ${config.security.lockoutDurationMinutes} minutes.`
        );
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

        const remaining = config.security.maxFailedAttempts - nextAttempts;
        throw new AuthError(`Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`, 401);
      }
    }

    // Successful login - reset failed attempts
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokenPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await recordAuditLog({
      userId: updatedUser.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: updatedUser.id,
      details: { email: updatedUser.email, role: updatedUser.role },
      req,
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        role: updatedUser.role as Role,
        lastLoginAt: updatedUser.lastLoginAt,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new Error('User account not found or inactive');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
      },
    };
  }

  static async forgotPassword(email: string, req: Request) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive || user.deletedAt) {
      // Don't reveal account existence for security, return mock success message
      return { message: 'If an account exists with this email, a reset token has been generated.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: { event: 'PASSWORD_RESET_REQUESTED' },
      req,
    });

    // In production, an email would be dispatched. For local testing, we return the token
    return {
      message: 'Password reset link / token generated successfully.',
      resetToken, // Returned for dev convenience
    };
  }

  static async resetPassword(token: string, newPasswordPlain: string, req: Request) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      details: { event: 'PASSWORD_RESET_SUCCESSFUL' },
      req,
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  }
}
