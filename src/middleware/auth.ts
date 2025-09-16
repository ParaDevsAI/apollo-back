import { Request, Response, NextFunction } from 'express';
import { AuthHelper } from '../utils/auth';
import { ResponseHelper } from '../utils/response';
import { Logger } from '../utils/logger';
import { AuthenticatedRequest } from '../models';

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

    // Verify passkey authentication
    if (req.user.authMethod !== 'passkey') {
      ResponseHelper.forbidden(res, 'Passkey authentication required for this endpoint');
      return;
    }

    Logger.debug('Passkey authentication validated', { 
      address: req.user.address,
      contractAddress: req.user.contractAddress
    });

    next();
  } catch (error) {
    Logger.error('Passkey middleware failed');
    ResponseHelper.unauthorized(res, 'Passkey authentication validation failed');
  }
};