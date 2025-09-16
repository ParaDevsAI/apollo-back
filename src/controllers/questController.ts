import { Request, Response } from 'express';
import { questService } from '../services';
import { ResponseHelper } from '../utils/response';
import { Logger } from '../utils/logger';
import { 
  CreateQuestRequest, 
  RegisterUserRequest, 
  MarkEligibleRequest, 
  QuestFilters,
  AuthenticatedRequest,
  QuestType
} from '../models';
import { Quest } from '../models/quest';
import { validationResult } from 'express-validator';

export class QuestController {
  async createQuest(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questData = req.body as CreateQuestRequest;
      Logger.info('Creating quest', { creator: req.user?.address, questData });

      const result = await questService.createQuest({
        ...questData,
        creator: req.user?.address || '',
        quest_type: questData.quest_type as QuestType,
      });

      if (result.success) {
        return ResponseHelper.success(res, { quest_id: result.questId }, 'Quest created successfully');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to create quest');
      }
    } catch (error) {
      Logger.error('Error in createQuest controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async getQuests(req: Request, res: Response): Promise<Response> {
    try {
      const filters = req.query as QuestFilters;
      Logger.debug('Getting quests', { filters });

      const result = await questService.getActiveQuests();


      if (result.success) {
        let quests = result.result || [];

        // Apply filters
        if (filters.status) {
          quests = quests.filter((quest: Quest) => quest.status === filters.status);
        }
        if (filters.quest_type) {
          quests = quests.filter((quest: Quest) => quest.quest_type === filters.quest_type);
        }
        if (filters.creator) {
          quests = quests.filter((quest: Quest) => quest.creator === filters.creator);
        }

        // Apply pagination
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(filters.limit) || 10));
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedQuests = quests.slice(startIndex, endIndex);

        return ResponseHelper.success(res, {
          quests: paginatedQuests,
          pagination: {
            page,
            limit,
            total: quests.length,
            total_pages: Math.ceil(quests.length / limit)
          }
        });
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to get quests');
      }
    } catch (error) {
      Logger.error('Error in getQuests controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async getQuestById(req: Request, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.debug('Getting quest by ID', { questId });

      const result = await questService.getQuest(questId);

      if (result) {
        return ResponseHelper.success(res, result);
      } else {
        return ResponseHelper.notFound(res, 'Quest not found');
      }
    } catch (error) {
      Logger.error('Error in getQuestById controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async registerUser(req: Request, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { user_address } = req.body as RegisterUserRequest;
      Logger.info('Registering user for quest', { questId, user_address });

      const result = await questService.registerUser(questId, user_address);

      if (result.success) {
        return ResponseHelper.success(res, { registered: true }, 'User registered successfully');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to register user');
      }
    } catch (error) {
      Logger.error('Error in registerUser controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async markUserEligible(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { user_address } = req.body as MarkEligibleRequest;
      Logger.info('Marking user as eligible', { questId, user_address });

      const result = await questService.markUserEligible(questId, user_address);

      if (result.success) {
        return ResponseHelper.success(res, { eligible: true }, 'User marked as eligible');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to mark user as eligible');
      }
    } catch (error) {
      Logger.error('Error in markUserEligible controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async resolveQuest(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Resolving quest', { questId, admin: req.user?.address });

      const result = await questService.resolveQuest(questId);

      if (result.success) {
        return ResponseHelper.success(res, { resolved: true }, 'Quest resolved successfully');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to resolve quest');
      }
    } catch (error) {
      Logger.error('Error in resolveQuest controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async cancelQuest(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Cancelling quest', { questId, admin: req.user?.address });

      const result = await questService.cancelQuest(questId);

      if (result.success) {
        return ResponseHelper.success(res, { cancelled: true }, 'Quest cancelled successfully');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to cancel quest');
      }
    } catch (error) {
      Logger.error('Error in cancelQuest controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async getQuestParticipants(req: Request, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.debug('Getting quest participants', { questId });

      const result = await questService.getQuestParticipants(questId);

      if (result.success) {
        return ResponseHelper.success(res, { participants: result.result });
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to get participants');
      }
    } catch (error) {
      Logger.error('Error in getQuestParticipants controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async distributeRewards(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const questId = Number(req.params.id);
      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Distributing rewards', { questId, admin: req.user?.address });

      const result = await questService.distributeRewards(questId);

      if (result.success) {
        return ResponseHelper.success(res, { distributed: true }, 'Rewards distributed successfully');
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to distribute rewards');
      }
    } catch (error) {
      Logger.error('Error in distributeRewards controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async verifyQuestCompletion(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        Logger.error('Validation failed in verifyQuestCompletion', new Error(JSON.stringify(errors.array())));
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { user_address, periodo, valor, token } = req.body;
      
      Logger.info('Verifying quest completion', {
        user_address,
        periodo,
        valor,
        token
      });

      // Importar dinamicamente a função de verificação
      const { verificarQuest } = await import('../utils/questVerification');
      
      const completed = await verificarQuest(user_address, periodo, valor, token);

      return ResponseHelper.success(res, {
        user_address,
        completed,
        verification_timestamp: Math.floor(Date.now() / 1000),
        details: {
          periodo,
          valor,
          token
        }
      }, completed ? 'Quest completed successfully' : 'Quest not completed');

    } catch (error) {
      Logger.error('Error in verifyQuestCompletion controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }
}

export const questController = new QuestController();