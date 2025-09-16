import { Response } from 'express';
import { AuthenticatedRequest } from '../models/request.js';
export declare class QuestController {
    /**
     * Cria uma nova quest
     */
    static createQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Lista quests ativas
     */
    static getActiveQuests(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Lista todas as quests
     */
    static getAllQuests(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Busca uma quest específica
     */
    static getQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Registra usuário em uma quest
     */
    static registerForQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Lista participantes de uma quest
     */
    static getQuestParticipants(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Lista quests do usuário
     */
    static getUserQuests(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Verifica se usuário está registrado em uma quest
     */
    static checkUserRegistration(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Cancela uma quest (apenas admin)
     */
    static cancelQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
    static deleteQuest(req: AuthenticatedRequest, res: Response): Promise<void>;
}
export declare const questValidators: {
    createQuest: import("express-validator").ValidationChain[];
    questId: import("express-validator").ValidationChain[];
};
//# sourceMappingURL=questController.d.ts.map