import { Request, Response, NextFunction } from 'express';
import { AuthHelper } from '../utils/auth';
import { ResponseHelper } from '../utils/response';
import { Logger } from '../utils/logger';
import { AuthenticatedRequest } from '../models';
import { mercuryAuthService } from '../services';

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthHelper.extractTokenFromHeader(authHeader);

    if (!token) {
      ResponseHelper.unauthorized(res, 'Authentication token required');
      return;
    }

    const payload = AuthHelper.verifyToken(token);
    req.user = payload;
    
    Logger.debug('User authenticated', { address: payload.address, role: payload.role });
    next();
  } catch (error) {
    Logger.error('Authentication failed', error as Error);
    ResponseHelper.unauthorized(res, 'Invalid or expired token');
  }
};

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res, 'Authentication required');
      return;
    }

    if (req.user.role !== 'admin') {
      ResponseHelper.forbidden(res, 'Admin access required');
      return;
    }

    Logger.debug('Admin access granted', { address: req.user.address });
    next();
  } catch (error) {
    Logger.error('Admin authorization failed', error as Error);
    ResponseHelper.forbidden(res, 'Admin access denied');
  }
};

export const passkeyMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res, 'Authentication required');
      return;
    }

    // Verificar se é autenticação via passkey
    if (req.user.authMethod !== 'passkey') {
      ResponseHelper.forbidden(res, 'Passkey authentication required for this endpoint');
      return;
    }

    // Validar sessão Zephyr se presente
    if (req.user.sessionId) {
      const sessionValidation = await mercuryAuthService.validateZephyrSession(req.user.sessionId);
      
      if (!sessionValidation.valid) {
        ResponseHelper.unauthorized(res, 'Zephyr session expired or invalid');
        return;
      }

      // Adicionar informações da sessão ao request
      (req as any).zephyrSession = sessionValidation.session;
      
      Logger.debug('Passkey authentication and Zephyr session validated', { 
        address: req.user.address,
        sessionId: req.user.sessionId 
      });
    }

    next();
  } catch (error) {
    Logger.error('Passkey middleware failed', error as Error);
    ResponseHelper.unauthorized(res, 'Passkey authentication validation failed');
  }
};