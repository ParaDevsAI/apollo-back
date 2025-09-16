import { Logger } from '../utils/logger.js';
import { Quest, CreateQuestRequest, DistributionType, QuestType } from '../models/quest.js';

/**
 * Serviço simplificado para gerenciar quests
 * Por enquanto usa dados mock para desenvolvimento rápido
 * TODO: Integrar com o contrato Soroban quando estiver pronto
 */
export class QuestManagerService {
  private static quests: Map<string, Quest> = new Map();
  private static participants: Map<string, Set<string>> = new Map(); // questId -> Set<userAddress>
  private static nextId = 1;

  /**
   * Cria uma nova quest
   */
  static async createQuest(adminAddress: string, questData: CreateQuestRequest): Promise<{ success: boolean; questId?: string; error?: string }> {
    try {
      const questId = this.nextId.toString();
      this.nextId++;

      const quest: Quest = {
        id: questId,
        admin: adminAddress,
        reward_token: questData.reward_token,
        reward_per_winner: questData.reward_per_winner,
        max_winners: questData.max_winners,
        distribution: questData.distribution,
        quest_type: questData.quest_type,
        end_timestamp: questData.end_timestamp,
        is_active: true,
        total_reward_pool: questData.total_reward_pool,
        title: questData.title,
        description: questData.description
      };

      this.quests.set(questId, quest);
      this.participants.set(questId, new Set());

      Logger.info('Quest criada com sucesso', { questId, admin: adminAddress, title: quest.title });
      return { success: true, questId };

    } catch (error) {
      Logger.error('Erro ao criar quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Registra um usuário em uma quest
   */
  static async registerForQuest(questId: string, userAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      const quest = this.quests.get(questId);
      if (!quest) {
        return { success: false, error: 'Quest não encontrada' };
      }

      if (!quest.is_active) {
        return { success: false, error: 'Quest não está ativa' };
      }

      if (Date.now() > quest.end_timestamp * 1000) {
        return { success: false, error: 'Quest expirada' };
      }

      const participants = this.participants.get(questId) || new Set();
      
      if (participants.has(userAddress)) {
        return { success: false, error: 'Usuário já está registrado nesta quest' };
      }

      if (participants.size >= quest.max_winners) {
        return { success: false, error: 'Quest já atingiu o número máximo de participantes' };
      }

      participants.add(userAddress);
      this.participants.set(questId, participants);

      Logger.info('Usuário registrado na quest', { questId, user: userAddress });
      return { success: true };

    } catch (error) {
      Logger.error('Erro ao registrar usuário na quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Busca uma quest por ID
   */
  static async getQuest(questId: string): Promise<Quest | null> {
    try {
      const quest = this.quests.get(questId);
      return quest || null;
    } catch (error) {
      Logger.error('Erro ao buscar quest', error as Error);
      return null;
    }
  }

  /**
   * Lista quests ativas
   */
  static async getActiveQuests(): Promise<Quest[]> {
    try {
      const activeQuests: Quest[] = [];
      const currentTime = Date.now();

      for (const quest of this.quests.values()) {
        if (quest.is_active && currentTime < quest.end_timestamp * 1000) {
          activeQuests.push(quest);
        }
      }

      return activeQuests;
    } catch (error) {
      Logger.error('Erro ao buscar quests ativas', error as Error);
      return [];
    }
  }

  /**
   * Lista todas as quests (incluindo inativas)
   */
  static async getAllQuests(): Promise<Quest[]> {
    try {
      return Array.from(this.quests.values());
    } catch (error) {
      Logger.error('Erro ao buscar todas as quests', error as Error);
      return [];
    }
  }

  /**
   * Verifica se usuário está registrado em uma quest
   */
  static async isUserRegistered(questId: string, userAddress: string): Promise<boolean> {
    try {
      const participants = this.participants.get(questId);
      return participants ? participants.has(userAddress) : false;
    } catch (error) {
      Logger.error('Erro ao verificar registro do usuário', error as Error);
      return false;
    }
  }

  /**
   * Lista participantes de uma quest
   */
  static async getQuestParticipants(questId: string): Promise<string[]> {
    try {
      const participants = this.participants.get(questId);
      return participants ? Array.from(participants) : [];
    } catch (error) {
      Logger.error('Erro ao buscar participantes', error as Error);
      return [];
    }
  }

  /**
   * Lista quests que um usuário está participando
   */
  static async getUserQuests(userAddress: string): Promise<Quest[]> {
    try {
      const userQuests: Quest[] = [];

      for (const [questId, participants] of this.participants.entries()) {
        if (participants.has(userAddress)) {
          const quest = this.quests.get(questId);
          if (quest) {
            userQuests.push(quest);
          }
        }
      }

      return userQuests;
    } catch (error) {
      Logger.error('Erro ao buscar quests do usuário', error as Error);
      return [];
    }
  }

  /**
   * Cancela uma quest (apenas admin)
   */
  static async cancelQuest(questId: string, adminAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      const quest = this.quests.get(questId);
      if (!quest) {
        return { success: false, error: 'Quest não encontrada' };
      }

      if (quest.admin !== adminAddress) {
        return { success: false, error: 'Apenas o admin da quest pode cancelá-la' };
      }

      quest.is_active = false;
      this.quests.set(questId, quest);

      Logger.info('Quest cancelada', { questId, admin: adminAddress });
      return { success: true };

    } catch (error) {
      Logger.error('Erro ao cancelar quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Atualiza uma quest (apenas admin)
   */
  static async updateQuest(questId: string, updateData: Partial<CreateQuestRequest>, adminAddress: string): Promise<Quest | null> {
    try {
      const quest = this.quests.get(questId);
      if (!quest) {
        return null;
      }

      if (quest.admin !== adminAddress) {
        return null; // Não tem permissão
      }

      // Atualizar apenas campos permitidos
      if (updateData.title !== undefined) quest.title = updateData.title;
      if (updateData.description !== undefined) quest.description = updateData.description;
      if (updateData.reward_per_winner !== undefined) quest.reward_per_winner = updateData.reward_per_winner;
      if (updateData.max_winners !== undefined) quest.max_winners = updateData.max_winners;
      if (updateData.end_timestamp !== undefined) quest.end_timestamp = updateData.end_timestamp;
      if (updateData.total_reward_pool !== undefined) quest.total_reward_pool = updateData.total_reward_pool;

      this.quests.set(questId, quest);

      Logger.info('Quest atualizada', { questId, admin: adminAddress });
      return quest;

    } catch (error) {
      Logger.error('Erro ao atualizar quest', error as Error);
      return null;
    }
  }

  /**
   * Remove uma quest (apenas admin)
   */
  static async deleteQuest(questId: string, adminAddress: string): Promise<boolean> {
    try {
      const quest = this.quests.get(questId);
      if (!quest) {
        return false;
      }

      if (quest.admin !== adminAddress) {
        return false; // Não tem permissão
      }

      this.quests.delete(questId);
      this.participants.delete(questId);

      Logger.info('Quest deletada', { questId, admin: adminAddress });
      return true;

    } catch (error) {
      Logger.error('Erro ao deletar quest', error as Error);
      return false;
    }
  }

  /**
   * Limpa todos os dados (apenas para desenvolvimento)
   */
  static clearAllData(): void {
    this.quests.clear();
    this.participants.clear();
    this.nextId = 1;
    Logger.warn('Todos os dados de quest foram limpos');
  }
}
