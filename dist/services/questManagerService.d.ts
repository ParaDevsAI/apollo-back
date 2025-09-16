import { Quest, CreateQuestRequest } from '../models/quest.js';
export declare class QuestManagerService {
    private server;
    private contract;
    private networkPassphrase;
    constructor();
    /**
     * Cria uma nova quest
     */
    createQuest(adminSecret: string, questData: CreateQuestRequest): Promise<{
        success: boolean;
        questId?: string;
        error?: string;
    }>;
    /**
     * Registra um usuário em uma quest
     */
    registerForQuest(userSecret: string, questId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Busca uma quest por ID
     */
    getQuest(questId: string): Promise<Quest | null>;
    /**
     * Lista quests ativas
     */
    getActiveQuests(): Promise<Quest[]>;
    /**
     * Verifica se usuário está registrado em uma quest
     */
    isUserRegistered(questId: string, userAddress: string): Promise<boolean>;
    private distributionTypeToScVal;
    private questTypeToScVal;
    private formatQuestData;
    private formatQuestType;
    private extractQuestIdFromResult;
}
//# sourceMappingURL=questManagerService.d.ts.map