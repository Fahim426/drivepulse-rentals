import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types';
import { sendError } from '../utils/response';

export const authorizeRoles = (...allowedRoles: (Role | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
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
