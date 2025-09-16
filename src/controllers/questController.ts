import { Response } from 'express';
import { QuestManagerService } from '../services/questService.js';
import { ResponseHelper } from '../utils/response.js';
import { Logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../models/request.js';
import { CreateQuestRequest } from '../models/quest.js';
import { body, param, validationResult } from 'express-validator';

export class QuestController {
  /**
   * Cria uma nova quest
   */
  static async createQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'Dados inválidos');
        return;
      }

      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const questData: CreateQuestRequest = req.body;
      const result = await QuestManagerService.createQuest(req.user.address, questData);

      if (result.success) {
        ResponseHelper.success(res, {
          questId: result.questId,
          message: 'Quest criada com sucesso'
        });
      } else {
        ResponseHelper.error(res, result.error || 'Erro ao criar quest');
      }

    } catch (error) {
      Logger.error('Erro ao criar quest', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Lista quests ativas
   */
  static async getActiveQuests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const quests = await QuestManagerService.getActiveQuests();
      ResponseHelper.success(res, { quests, total: quests.length });
    } catch (error) {
      Logger.error('Erro ao buscar quests ativas', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Lista todas as quests
   */
  static async getAllQuests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const quests = await QuestManagerService.getAllQuests();
      ResponseHelper.success(res, { quests, total: quests.length });
    } catch (error) {
      Logger.error('Erro ao buscar todas as quests', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Busca uma quest específica
   */
  static async getQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'ID da quest inválido');
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }
      
      const quest = await QuestManagerService.getQuest(questId);

      if (quest) {
        ResponseHelper.success(res, { quest });
      } else {
        ResponseHelper.notFound(res, 'Quest não encontrada');
      }

    } catch (error) {
      Logger.error('Erro ao buscar quest', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Registra usuário em uma quest
   */
  static async registerForQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'ID da quest inválido');
        return;
      }

      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }
      
      const result = await QuestManagerService.registerForQuest(questId, req.user.address);

      if (result.success) {
        ResponseHelper.success(res, {
          message: 'Registrado na quest com sucesso',
          questId,
          userAddress: req.user.address
        });
      } else {
        ResponseHelper.error(res, result.error || 'Erro ao registrar na quest');
      }

    } catch (error) {
      Logger.error('Erro ao registrar na quest', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Lista participantes de uma quest
   */
  static async getQuestParticipants(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'ID da quest inválido');
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }
      
      const participants = await QuestManagerService.getQuestParticipants(questId);

      ResponseHelper.success(res, { 
        questId,
        participants, 
        total: participants.length 
      });

    } catch (error) {
      Logger.error('Erro ao buscar participantes', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Lista quests do usuário
   */
  static async getUserQuests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const quests = await QuestManagerService.getUserQuests(req.user.address);
      ResponseHelper.success(res, { 
        quests, 
        total: quests.length,
        userAddress: req.user.address
      });

    } catch (error) {
      Logger.error('Erro ao buscar quests do usuário', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Verifica se usuário está registrado em uma quest
   */
  static async checkUserRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'ID da quest inválido');
        return;
      }

      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }
      
      const isRegistered = await QuestManagerService.isUserRegistered(questId, req.user.address);

      ResponseHelper.success(res, { 
        questId,
        userAddress: req.user.address,
        isRegistered
      });

    } catch (error) {
      Logger.error('Erro ao verificar registro', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Cancela uma quest (apenas admin)
   */
  static async cancelQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'ID da quest inválido');
        return;
      }

      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }
      
      const result = await QuestManagerService.cancelQuest(questId, req.user.address);

      if (result.success) {
        ResponseHelper.success(res, {
          message: 'Quest cancelada com sucesso',
          questId
        });
      } else {
        ResponseHelper.error(res, result.error || 'Erro ao cancelar quest');
      }

    } catch (error) {
      console.error('Erro ao cancelar participação na quest:', error);
      ResponseHelper.error(res, 'Erro interno do servidor');
    }
  }

  static async updateQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.validationError(res, errors.array());
        return;
      }

      if (!req.user) {
        ResponseHelper.error(res, 'Usuário não autenticado', 401);
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }

      const updateData = req.body;
      const updatedQuest = await QuestManagerService.updateQuest(questId, updateData, req.user.address);

      if (updatedQuest) {
        ResponseHelper.success(res, updatedQuest, 'Quest atualizada com sucesso');
      } else {
        ResponseHelper.error(res, 'Quest não encontrada ou você não tem permissão para editá-la', 404);
      }
    } catch (error) {
      console.error('Erro ao atualizar quest:', error);
      ResponseHelper.error(res, 'Erro interno do servidor');
    }
  }

  static async deleteQuest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseHelper.error(res, 'Usuário não autenticado', 401);
        return;
      }

      const { questId } = req.params;
      if (!questId) {
        ResponseHelper.error(res, 'ID da quest é obrigatório');
        return;
      }

      const success = await QuestManagerService.deleteQuest(questId, req.user.address);

      if (success) {
        ResponseHelper.success(res, null, 'Quest deletada com sucesso');
      } else {
        ResponseHelper.error(res, 'Quest não encontrada ou você não tem permissão para deletá-la', 404);
      }
    } catch (error) {
      console.error('Erro ao deletar quest:', error);
      ResponseHelper.error(res, 'Erro interno do servidor');
    }
  }
}

// Validadores para as rotas
export const questValidators = {
  createQuest: [
    body('title').isString().isLength({ min: 1, max: 100 }).withMessage('Título deve ter entre 1 e 100 caracteres'),
    body('description').isString().isLength({ min: 1, max: 500 }).withMessage('Descrição deve ter entre 1 e 500 caracteres'),
    body('reward_token').isString().notEmpty().withMessage('Token de recompensa é obrigatório'),
    body('reward_per_winner').isString().notEmpty().withMessage('Recompensa por vencedor é obrigatória'),
    body('max_winners').isInt({ min: 1 }).withMessage('Número máximo de vencedores deve ser maior que 0'),
    body('distribution').isIn(['Raffle', 'Fcfs']).withMessage('Tipo de distribuição inválido'),
    body('end_timestamp').isInt({ min: Date.now() / 1000 }).withMessage('Data de fim deve ser futura'),
    body('total_reward_pool').isString().notEmpty().withMessage('Pool total de recompensas é obrigatório')
  ],

  questId: [
    param('questId').isString().notEmpty().withMessage('ID da quest é obrigatório')
  ]
};
