import { Request, Response } from 'express';
export declare class AuthController {
    /**
     * Gera um desafio para ser assinado pela wallet
     */
    static generateChallenge(req: Request, res: Response): Promise<void>;
    /**
     * Autentica um usuário usando assinatura da wallet
     */
    static authenticate(req: Request, res: Response): Promise<void>;
    /**
     * Verifica se o token atual é válido
     */
    static verify(req: Request, res: Response): Promise<void>;
    /**
     * Lista wallets suportadas
     */
    static getSupportedWallets(req: Request, res: Response): Promise<void>;
}
export declare const authValidators: {
    generateChallenge: import("express-validator").ValidationChain[];
    authenticate: import("express-validator").ValidationChain[];
};
//# sourceMappingURL=authController.d.ts.map