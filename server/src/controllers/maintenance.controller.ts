import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { createMaintenanceSchema } from '../validators/vehicle.validator';
import { recordAuditLog } from '../services/audit.service';
import { storageService } from '../services/storage.service';

export class MaintenanceController {
  static async addRecord(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const file = req.file;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId, deletedAt: null },
      });

      if (!vehicle) {
        return sendError(res, 'Vehicle not found', 404);
      }

      const validated = createMaintenanceSchema.parse(req.body);

      let invoiceFilePath: string | null = null;
      if (file) {
        const saved = await storageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          'maintenance'
        );
        invoiceFilePath = saved.url;
      }

      const record = await prisma.maintenanceRecord.create({
        data: {
          vehicleId,
          serviceDate: validated.serviceDate,
          type: validated.type,
          cost: validated.cost,
          vendor: validated.vendor,
          odometer: validated.odometer,
          nextServiceDueDate: validated.nextServiceDueDate,
          nextServiceDueKm: validated.nextServiceDueKm,
          notes: validated.notes,
          invoiceFilePath,
        },
      });

      // Update vehicle odometer if service odometer is higher
      if (validated.odometer > vehicle.odometer) {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: { odometer: validated.odometer },
        });
      }

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Maintenance',
        entityId: record.id,
        details: { vehicleId, type: record.type, cost: record.cost, vendor: record.vendor },
        req,
      });

      return sendSuccess(res, record, 'Maintenance record added', 201);
    } catch (error) {
      next(error);
    }
  }

  static async deleteRecord(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const record = await prisma.maintenanceRecord.findUnique({
        where: { id },
      });

      if (!record) {
        return sendError(res, 'Record not found', 404);
      }

      await prisma.maintenanceRecord.delete({
        where: { id },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Maintenance',
        entityId: id,
        details: { type: record.type, cost: record.cost },
        req,
      });

      return sendSuccess(res, null, 'Maintenance record deleted');
    } catch (error) {
      next(error);
    }
  }
}
