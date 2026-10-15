import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { createDocumentSchema, renewDocumentSchema } from '../validators/vehicle.validator';
import { calculateDocumentStatus } from '../utils/compliance';
import { recordAuditLog } from '../services/audit.service';
import { storageService } from '../services/storage.service';

export class VehicleDocumentController {
  static async addDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const file = req.file;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId, deletedAt: null },
      });

      if (!vehicle) {
        return sendError(res, 'Vehicle not found', 404);
      }

      const validated = createDocumentSchema.parse(req.body);

      let filePath: string | null = null;
      if (file) {
        const saved = await storageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          'documents'
        );
        filePath = saved.url;
      }

      const status = calculateDocumentStatus(validated.expiryDate);

      // Check if document of this type already exists for this vehicle
      const existingDoc = await prisma.vehicleDocument.findFirst({
        where: { vehicleId, type: validated.type },
      });

      if (existingDoc) {
        return sendError(
          res,
          `A ${validated.type} document already exists for this vehicle. Please use the Renew option instead.`,
          409
        );
      }

      const doc = await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          type: validated.type,
          documentNumber: validated.documentNumber,
          issueDate: validated.issueDate,
          expiryDate: validated.expiryDate,
          issuingAuthority: validated.issuingAuthority,
          policyNumber: validated.policyNumber,
          insuranceProvider: validated.insuranceProvider,
          insuranceType: validated.insuranceType,
          idv: validated.idv,
          premium: validated.premium,
          notes: validated.notes,
          filePath,
          status,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'VehicleDocument',
        entityId: doc.id,
        details: {
          vehicleId,
          type: doc.type,
          documentNumber: doc.documentNumber,
          expiryDate: doc.expiryDate,
        },
        req,
      });

      return sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async renewDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const file = req.file;

      const currentDoc = await prisma.vehicleDocument.findUnique({
        where: { id: documentId },
      });

      if (!currentDoc) {
        return sendError(res, 'Document not found', 404);
      }

      const validated = renewDocumentSchema.parse(req.body);

      let newFilePath = currentDoc.filePath;
      if (file) {
        const saved = await storageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          'documents'
        );
        newFilePath = saved.url;
      }

      // 1. Archive current document into History
      await prisma.vehicleDocumentHistory.create({
        data: {
          documentId: currentDoc.id,
          documentNumber: currentDoc.documentNumber,
          issueDate: currentDoc.issueDate,
          expiryDate: currentDoc.expiryDate,
          filePath: currentDoc.filePath,
          premium: currentDoc.premium,
          renewedByUserId: req.user?.id,
          renewedAt: new Date(),
          notes: `Renewed with new document: ${validated.documentNumber}. Previous notes: ${currentDoc.notes || 'None'}`,
        },
      });

      // 2. Recalculate status for new validity
      const newStatus = calculateDocumentStatus(validated.expiryDate);

      // 3. Update active document
      const updated = await prisma.vehicleDocument.update({
        where: { id: documentId },
        data: {
          documentNumber: validated.documentNumber,
          issueDate: validated.issueDate,
          expiryDate: validated.expiryDate,
          premium: validated.premium ?? currentDoc.premium,
          filePath: newFilePath,
          status: newStatus,
          notes: validated.notes || currentDoc.notes,
        },
        include: {
          renewals: {
            orderBy: { renewedAt: 'desc' },
          },
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'VehicleDocument',
        entityId: documentId,
        details: {
          event: 'DOCUMENT_RENEWAL',
          type: updated.type,
          newDocumentNumber: updated.documentNumber,
          newExpiryDate: updated.expiryDate,
        },
        req,
      });

      return sendSuccess(res, updated, 'Document renewed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;

      const doc = await prisma.vehicleDocument.findUnique({
        where: { id: documentId },
      });

      if (!doc) {
        return sendError(res, 'Document not found', 404);
      }

      await prisma.vehicleDocument.delete({
        where: { id: documentId },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'VehicleDocument',
        entityId: documentId,
        details: { type: doc.type, documentNumber: doc.documentNumber },
        req,
      });

      return sendSuccess(res, null, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
