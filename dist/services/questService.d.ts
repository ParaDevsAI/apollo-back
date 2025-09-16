import { Quest, CreateQuestRequest } from '../models/quest.js';
/**
 * Serviço simplificado para gerenciar quests
 * Por enquanto usa dados mock para desenvolvimento rápido
 * TODO: Integrar com o contrato Soroban quando estiver pronto
 */
export declare class QuestManagerService {
    private static quests;
    private static participants;
    private static nextId;
    /**
     * Cria uma nova quest
     */
    static createQuest(adminAddress: string, questData: CreateQuestRequest): Promise<{
        success: boolean;
        questId?: string;
        error?: string;
    }>;
    /**
     * Registra um usuário em uma quest
     */
    static registerForQuest(questId: string, userAddress: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Busca uma quest por ID
     */
    static getQuest(questId: string): Promise<Quest | null>;
    /**
     * Lista quests ativas
     */
    static getActiveQuests(): Promise<Quest[]>;
    /**
     * Lista todas as quests (incluindo inativas)
     */
    static getAllQuests(): Promise<Quest[]>;
    /**
     * Verifica se usuário está registrado em uma quest
     */
    static isUserRegistered(questId: string, userAddress: string): Promise<boolean>;
    /**
     * Lista participantes de uma quest
     */
    static getQuestParticipants(questId: string): Promise<string[]>;
    /**
     * Lista quests que um usuário está participando
     */
    static getUserQuests(userAddress: string): Promise<Quest[]>;
    /**
     * Cancela uma quest (apenas admin)
     */
    static cancelQuest(questId: string, adminAddress: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Atualiza uma quest (apenas admin)
     */
    static updateQuest(questId: string, updateData: Partial<CreateQuestRequest>, adminAddress: string): Promise<Quest | null>;
    /**
     * Remove uma quest (apenas admin)
     */
    static deleteQuest(questId: string, adminAddress: string): Promise<boolean>;
    /**
     * Limpa todos os dados (apenas para desenvolvimento)
     */
    static clearAllData(): void;
}
//# sourceMappingURL=questService.d.ts.map