import { AuthHelper } from '../utils/auth.js';
import { ResponseHelper } from '../utils/response.js';
import { Logger } from '../utils/logger.js';
/**
 * Middleware para validar token JWT de autenticação Stellar
 */
export const authenticateUser = (req, res, next) => {
    try {
        const token = AuthHelper.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            ResponseHelper.unauthorized(res, 'Token de autorização requerido');
            return;
        }
        try {
            const decoded = AuthHelper.verifyToken(token);
            // Validar se o endereço Stellar é válido
            if (!AuthHelper.validateStellarAddress(decoded.address)) {
                ResponseHelper.unauthorized(res, 'Endereço Stellar inválido no token');
                return;
            }
            req.user = decoded;
            Logger.debug('Usuário autenticado', { address: decoded.address, walletType: decoded.walletType });
            next();
        }
        catch (jwtError) {
            Logger.error('Erro na validação do token JWT', jwtError);
            ResponseHelper.unauthorized(res, 'Token inválido ou expirado');
            return;
        }
    }
    catch (error) {
        Logger.error('Erro no middleware de autenticação', error);
        ResponseHelper.internalError(res);
        return;
    }
};
/**
 * Middleware opcional - permite acesso sem token mas popula user se disponível
 */
export const optionalAuth = (req, res, next) => {
    try {
        const token = AuthHelper.extractTokenFromHeader(req.headers.authorization);
        if (token) {
            try {
                const decoded = AuthHelper.verifyToken(token);
                if (AuthHelper.validateStellarAddress(decoded.address)) {
                    req.user = decoded;
                }
            }
            catch (error) {
                // Ignorar erros silenciosamente para auth opcional
                Logger.debug('Token inválido em auth opcional', { error: error.message });
            }
        }
        next();
    }
    catch (error) {
        Logger.error('Erro no middleware de auth opcional', error);
        next(); // Continuar mesmo com erro
    }
};
/**
 * Middleware para validar se o usuário tem permissão para uma operação em uma quest
 */
export const validateQuestAccess = (req, res, next) => {
    try {
        if (!req.user) {
            ResponseHelper.unauthorized(res, 'Autenticação requerida');
            return;
        }
        // Aqui você pode adicionar lógica adicional de validação de acesso
        // Por exemplo, verificar se o usuário é admin da quest, etc.
        next();
    }
    catch (error) {
        Logger.error('Erro na validação de acesso à quest', error);
        ResponseHelper.internalError(res);
        return;
    }
};
//# sourceMappingURL=auth.js.map