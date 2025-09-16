import crypto from 'crypto';
import { AuthHelper } from '../utils/auth.js';
import { Logger } from '../utils/logger.js';
// Store de challenges temporários (em produção usar Redis)
const challengeStore = new Map();
export class StellarAuthService {
    /**
     * Gera um challenge único e seguro para ser assinado pela wallet
     */
    static generateChallenge(address) {
        try {
            // Validar endereço
            if (!AuthHelper.validateStellarAddress(address)) {
                throw new Error('Endereço Stellar inválido');
            }
            // Gerar challenge único
            const timestamp = Date.now();
            const nonce = crypto.randomBytes(16).toString('hex');
            const challengeId = crypto.randomUUID();
            const challenge = `Apollo Quest Manager Authentication
Address: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}
Challenge ID: ${challengeId}

Please sign this message to authenticate with Apollo Quest Manager.
This signature will not trigger any blockchain transactions.`;
            // Armazenar challenge temporariamente (5 minutos)
            challengeStore.set(challengeId, {
                challenge,
                timestamp,
                address
            });
            // Limpar challenges expirados
            StellarAuthService.cleanExpiredChallenges();
            Logger.info('Challenge gerado', { address, challengeId });
            return challenge;
        }
        catch (error) {
            Logger.error('Erro ao gerar challenge', error);
            throw error;
        }
    }
    /**
     * Limpa challenges expirados (mais de 5 minutos)
     */
    static cleanExpiredChallenges() {
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;
        for (const [id, data] of challengeStore.entries()) {
            if (now - data.timestamp > FIVE_MINUTES) {
                challengeStore.delete(id);
            }
        }
    }
    /**
     * Verifica assinatura usando o challenge armazenado
     */
    static async verifySignature(address, signature, challenge) {
        try {
            // Validar endereço
            if (!AuthHelper.validateStellarAddress(address)) {
                return { success: false, error: 'Endereço Stellar inválido' };
            }
            // Encontrar o challenge pelo conteúdo
            let challengeData = null;
            for (const [id, data] of challengeStore.entries()) {
                if (data.challenge === challenge && data.address === address) {
                    challengeData = data;
                    challengeStore.delete(id); // Remove após uso
                    break;
                }
            }
            if (!challengeData) {
                return { success: false, error: 'Challenge inválido ou expirado' };
            }
            // Verificar se não expirou (5 minutos)
            const FIVE_MINUTES = 5 * 60 * 1000;
            if (Date.now() - challengeData.timestamp > FIVE_MINUTES) {
                return { success: false, error: 'Challenge expirado' };
            }
            // TODO: Implementar verificação real da assinatura Stellar
            // Por enquanto, aceitar qualquer assinatura não vazia
            if (!signature || signature.length < 10) {
                return { success: false, error: 'Assinatura inválida' };
            }
            // Gerar token JWT
            const token = AuthHelper.generateToken({
                address,
                publicKey: address, // Por enquanto usando o address
                walletType: 'freighter' // Padrão por enquanto
            });
            const user = {
                address,
                walletType: 'freighter'
            };
            Logger.info('Usuário autenticado com sucesso', { address });
            return {
                success: true,
                token,
                user
            };
        }
        catch (error) {
            Logger.error('Erro na verificação de assinatura', error);
            return { success: false, error: 'Erro interno na verificação' };
        }
    }
    /**
     * Lista os tipos de wallet suportados
     */
    static getSupportedWallets() {
        return [
            {
                id: 'freighter',
                name: 'Freighter',
                description: 'Extensão oficial do Stellar para navegadores',
                icon: '🚀',
                downloadUrl: 'https://www.freighter.app/'
            },
            {
                id: 'albedo',
                name: 'Albedo',
                description: 'Wallet web segura para Stellar',
                icon: '🌟',
                downloadUrl: 'https://albedo.link/'
            },
            {
                id: 'rabet',
                name: 'Rabet',
                description: 'Wallet mobile e extensão para Stellar',
                icon: '🐰',
                downloadUrl: 'https://rabet.io/'
            },
            {
                id: 'lobstr',
                name: 'LOBSTR',
                description: 'Wallet popular para Stellar Lumens',
                icon: '🦞',
                downloadUrl: 'https://lobstr.co/'
            },
            {
                id: 'xbull',
                name: 'xBull',
                description: 'Wallet moderno para Stellar',
                icon: '🐂',
                downloadUrl: 'https://xbull.app/'
            }
        ];
    }
    /**
     * Método de compatibilidade com a implementação anterior
     */
    static async authenticateWallet(authRequest) {
        return this.verifySignature(authRequest.address, authRequest.signature, authRequest.challenge || '');
    }
}
//# sourceMappingURL=stellarAuthService.js.map