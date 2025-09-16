import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../models/request.js';
/**
 * Middleware para validar token JWT de autenticação Stellar
 */
export declare const authenticateUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware opcional - permite acesso sem token mas popula user se disponível
 */
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware para validar se o usuário tem permissão para uma operação em uma quest
 */
export declare const validateQuestAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map