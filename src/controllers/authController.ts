import { Request, Response } from 'express';
import { StellarAuthService } from '../services/stellarAuthService.js';
import { ResponseHelper } from '../utils/response.js';
import { Logger } from '../utils/logger.js';
import { AuthRequest } from '../models/auth.js';
import { body, validationResult } from 'express-validator';

export class AuthController {
  /**
   * Gera um desafio para ser assinado pela wallet
   */
  static async generateChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.body;

      if (!address) {
        ResponseHelper.error(res, 'Endereço é obrigatório');
        return;
      }

      const challenge = StellarAuthService.generateChallenge(address);
      
      ResponseHelper.success(res, { 
        challenge,
        message: 'Assine este desafio com sua wallet Stellar' 
      });

    } catch (error) {
      Logger.error('Erro ao gerar desafio', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Autentica um usuário usando assinatura da wallet
   */
  static async authenticate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ResponseHelper.error(res, 'Dados inválidos', 400);
        return;
      }

      const authRequest: AuthRequest = req.body;
      const result = await StellarAuthService.authenticateWallet(authRequest);

      if (result.success) {
        ResponseHelper.success(res, {
          token: result.token,
          address: result.address,
          expiresAt: result.expiresAt
        }, 'Autenticação realizada com sucesso');
      } else {
        ResponseHelper.error(res, result.error || 'Falha na autenticação', 401);
      }

    } catch (error) {
      Logger.error('Erro na autenticação', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Verifica se o token atual é válido
   */
  static async verify(req: Request, res: Response): Promise<void> {
    try {
      // Se chegou até aqui, é porque passou pelo middleware de auth
      ResponseHelper.success(res, { 
        valid: true,
        message: 'Token válido' 
      });
    } catch (error) {
      Logger.error('Erro na verificação do token', error as Error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Lista wallets suportadas
   */
  static async getSupportedWallets(req: Request, res: Response): Promise<void> {
    try {
      const wallets = StellarAuthService.getSupportedWallets();
      ResponseHelper.success(res, { wallets });
    } catch (error) {
      Logger.error('Erro ao buscar wallets suportadas', error as Error);
      ResponseHelper.internalError(res);
    }
  }
}

// Validadores para as rotas
export const authValidators = {
  generateChallenge: [
    body('address').isString().notEmpty().withMessage('Endereço é obrigatório')
  ],
  
  authenticate: [
    body('address').isString().notEmpty().withMessage('Endereço é obrigatório'),
    body('signature').isString().notEmpty().withMessage('Assinatura é obrigatória'),
    body('publicKey').isString().notEmpty().withMessage('Chave pública é obrigatória'),
    body('walletType').isIn(['freighter', 'albedo', 'rabet', 'lobstr', 'xbull']).withMessage('Tipo de wallet inválido')
  ]
};
