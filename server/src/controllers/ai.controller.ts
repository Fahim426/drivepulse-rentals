import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AIService } from '../services/ai.service';
import { sendSuccess, sendError } from '../utils/response';

export class AIController {
  /**
   * Process Natural Language AI Chat query
   */
  public static async chat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return sendError(res, 'Message is required', 400);
      }

      const response = await AIService.processChat(message.trim(), history);
      return sendSuccess(res, response, 'AI response generated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Daily Morning Executive Briefing
   */
  public static async getDailyBriefing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const briefing = await AIService.getDailyBriefing();
      return sendSuccess(res, briefing, 'Daily briefing retrieved');
    } catch (error) {
      next(error);
    }
  }
}
