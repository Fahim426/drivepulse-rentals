import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types';
import { sendError } from '../utils/response';

export const authorizeRoles = (...allowedRoles: (Role | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // ADMIN (and SUPER_ADMIN) has complete administrative authority over all endpoints
    if (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Requires one of: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
        403
      );
      return;
    }

    next();
  };
};
