import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types';
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  setAuthCookies,
} from '../utils/jwt';
import { prisma } from '../prisma';
import { sendError } from '../utils/response';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Try refresh token if available in cookie
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        try {
          const decodedRefresh = verifyRefreshToken(refreshToken);
          const user = await prisma.user.findUnique({
            where: { id: decodedRefresh.userId },
          });

          if (user && user.isActive && !user.deletedAt) {
            const newAccessToken = generateAccessToken({
              userId: user.id,
              email: user.email,
              role: user.role,
            });
            setAuthCookies(res, newAccessToken, refreshToken);
            req.user = {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: user.role as Role,
            };
            return next();
          }
        } catch (refreshErr) {
          // Refresh token invalid or expired
        }
      }

      sendError(res, 'Authentication required', 401);
      return;
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive || user.deletedAt) {
        sendError(res, 'User account is inactive or deleted', 401);
        return;
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        sendError(res, 'Account is temporarily locked. Please try again later or contact Super Admin.', 403);
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
      };

      return next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        // Attempt silent refresh via refreshToken cookie
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
          try {
            const decodedRefresh = verifyRefreshToken(refreshToken);
            const user = await prisma.user.findUnique({
              where: { id: decodedRefresh.userId },
            });

            if (user && user.isActive && !user.deletedAt) {
              const newAccessToken = generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
              });
              setAuthCookies(res, newAccessToken, refreshToken);
              req.user = {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role as Role,
              };
              return next();
            }
          } catch (refreshErr) {
            sendError(res, 'Session expired. Please log in again.', 401);
            return;
          }
        }
        sendError(res, 'Session expired. Please log in again.', 401);
        return;
      }

      sendError(res, 'Invalid authentication token', 401);
      return;
    }
  } catch (error) {
    sendError(res, 'Internal authentication error', 500);
    return;
  }
};
