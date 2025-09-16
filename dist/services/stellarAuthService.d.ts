import { AuthRequest, AuthResponse, WalletInfo } from '../models/auth.js';
export declare class StellarAuthService {
    /**
     * Gera um challenge único e seguro para ser assinado pela wallet
     */
    static generateChallenge(address: string): string;
    /**
     * Limpa challenges expirados (mais de 5 minutos)
     */
    static cleanExpiredChallenges(): void;
    /**
     * Verifica assinatura usando o challenge armazenado
     */
    static verifySignature(address: string, signature: string, challenge: string): Promise<{
        success: boolean;
        error?: string;
        token?: string;
        user?: any;
    }>;
    /**
     * Lista os tipos de wallet suportados
     */
    static getSupportedWallets(): WalletInfo[];
    /**
     * Método de compatibilidade com a implementação anterior
     */
    static authenticateWallet(authRequest: AuthRequest): Promise<AuthResponse>;
}
//# sourceMappingURL=stellarAuthService.d.ts.map