import { Request, Response, NextFunction } from 'express';
import { AuthHelper } from '../utils/auth.js';
import { ResponseHelper } from '../utils/response.js';
import { Logger } from '../utils/logger.js';
import { AuthenticatedRequest } from '../models/request.js';

/**
 * Middleware para validar token JWT de autenticação Stellar
 */
export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
      
    } catch (jwtError) {
      Logger.error('Erro na validação do token JWT', jwtError as Error);
      ResponseHelper.unauthorized(res, 'Token inválido ou expirado');
      return;
    }
    
  } catch (error) {
    Logger.error('Erro no middleware de autenticação', error as Error);
    ResponseHelper.internalError(res);
    return;
  }
};

/**
 * Middleware opcional - permite acesso sem token mas popula user se disponível
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = AuthHelper.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const decoded = AuthHelper.verifyToken(token);
        if (AuthHelper.validateStellarAddress(decoded.address)) {
          req.user = decoded;
        }
      } catch (error) {
        // Ignorar erros silenciosamente para auth opcional
        Logger.debug('Token inválido em auth opcional', { error: (error as Error).message });
      }
    }
    
    next();
  } catch (error) {
    Logger.error('Erro no middleware de auth opcional', error as Error);
    next(); // Continuar mesmo com erro
  }
};

/**
 * Middleware para validar se o usuário tem permissão para uma operação em uma quest
 */
export const validateQuestAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res, 'Autenticação requerida');
      return;
    }

    // Aqui você pode adicionar lógica adicional de validação de acesso
    // Por exemplo, verificar se o usuário é admin da quest, etc.
    
    next();
  } catch (error) {
    Logger.error('Erro na validação de acesso à quest', error as Error);
    ResponseHelper.internalError(res);
    return;
  }
};
