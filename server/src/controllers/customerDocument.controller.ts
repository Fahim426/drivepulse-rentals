import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest, Role } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { customerDocumentSchema } from '../validators/customer.validator';
import { storageService } from '../services/storage.service';
import { recordAuditLog } from '../services/audit.service';

export class CustomerDocumentController {
  static async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const file = req.file;

      if (!file) {
        return sendError(res, 'File scan or photo upload is required', 400);
      }

      const customer = await prisma.customer.findUnique({
        where: { id: customerId, deletedAt: null },
      });

      if (!customer) {
        return sendError(res, 'Customer not found', 404);
      }

      const validated = customerDocumentSchema.parse(req.body);

      const saved = await storageService.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'customers'
      );

      const doc = await prisma.customerDocument.create({
        data: {
          customerId,
          docType: validated.docType,
          documentNumber: validated.documentNumber,
          expiryDate: validated.expiryDate,
          filePath: saved.url,
          isVerified: validated.isVerified,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'CustomerDocument',
        entityId: doc.id,
        details: { customerId, docType: doc.docType, documentNumber: doc.documentNumber },
        req,
      });

      return sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async toggleVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;

      const doc = await prisma.customerDocument.findUnique({
        where: { id: documentId },
      });

      if (!doc) {
        return sendError(res, 'Document not found', 404);
      }

      const updated = await prisma.customerDocument.update({
        where: { id: documentId },
        data: { isVerified: !doc.isVerified },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'CustomerDocument',
        entityId: documentId,
        details: { event: 'DOCUMENT_VERIFICATION_TOGGLED', isVerified: updated.isVerified },
        req,
      });

      return sendSuccess(
        res,
        updated,
        updated.isVerified ? 'Document marked as verified' : 'Document unverified'
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;

      const doc = await prisma.customerDocument.findUnique({
        where: { id: documentId },
      });

      if (!doc) {
        return sendError(res, 'Document not found', 404);
      }

      await prisma.customerDocument.delete({
        where: { id: documentId },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'CustomerDocument',
        entityId: documentId,
        details: { docType: doc.docType, documentNumber: doc.documentNumber },
        req,
      });

      return sendSuccess(res, null, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
