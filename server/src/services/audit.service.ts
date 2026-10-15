import { Request } from 'express';
import { prisma } from '../prisma';

export interface AuditLogParams {
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OVERRIDE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_RESET';
  entity: 'User' | 'Vehicle' | 'VehicleDocument' | 'Customer' | 'CustomerDocument' | 'Booking' | 'Payment' | 'Maintenance' | 'Expense' | 'Setting';
  entityId?: string | null;
  details?: Record<string, any> | string;
  req?: Request;
}

export const recordAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  details,
  req,
}: AuditLogParams) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for']?.toString() || req?.socket.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'unknown';

    const stringifiedDetails =
      typeof details === 'object' ? JSON.stringify(details) : details || null;

    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        details: stringifiedDetails,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

export class AuditService {
  public static async log(params: {
    userId?: string | null;
    action: any;
    entity: any;
    entityId?: string | null;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const stringifiedDetails =
        typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null;

      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          details: stringifiedDetails,
          ipAddress: params.ipAddress || '127.0.0.1',
          userAgent: params.userAgent || 'unknown',
        },
      });
    } catch (error) {
      console.error('AuditService.log error:', error);
    }
  }
}

