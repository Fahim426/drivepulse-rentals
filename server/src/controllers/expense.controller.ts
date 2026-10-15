import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { createExpenseSchema } from '../validators/vehicle.validator';
import { recordAuditLog } from '../services/audit.service';
import { storageService } from '../services/storage.service';

export class ExpenseController {
  static async addExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const file = req.file;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId, deletedAt: null },
      });

      if (!vehicle) {
        return sendError(res, 'Vehicle not found', 404);
      }

      const validated = createExpenseSchema.parse(req.body);

      let receiptFilePath: string | null = null;
      if (file) {
        const saved = await storageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          'expenses'
        );
        receiptFilePath = saved.url;
      }

      const expense = await prisma.expense.create({
        data: {
          vehicleId,
          category: validated.category,
          amount: validated.amount,
          date: validated.date,
          odometer: validated.odometer,
          notes: validated.notes,
          receiptFilePath,
        },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense.id,
        details: { vehicleId, category: expense.category, amount: expense.amount },
        req,
      });

      return sendSuccess(res, expense, 'Expense recorded', 201);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const expense = await prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        return sendError(res, 'Expense not found', 404);
      }

      await prisma.expense.delete({
        where: { id },
      });

      await recordAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Expense',
        entityId: id,
        details: { category: expense.category, amount: expense.amount },
        req,
      });

      return sendSuccess(res, null, 'Expense deleted');
    } catch (error) {
      next(error);
    }
  }
}
