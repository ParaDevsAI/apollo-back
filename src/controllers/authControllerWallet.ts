import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import StellarWalletService from '../services/stellarWalletService';
import { ResponseHelper } from '../utils/response';
import { AuthHelper } from '../utils/auth';
import { Logger } from '../utils/logger';
import {
  StellarWalletConnection,
  WalletType
} from '../models/auth';

export class AuthController {
  private stellarWalletService = new StellarWalletService();

  /**
   * POST /auth/wallet/connect
   * Autentica um usuário com base na chave pública da carteira (frontend conecta)
   */
  async connectWallet(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { publicKey, userName, signedMessage } = req.body;

      Logger.info('Authenticating wallet user', { publicKey });

      // Validar assinatura se fornecida
      if (signedMessage) {
        const isValid = await this.stellarWalletService.validateSignedTransaction(signedMessage);
        if (!isValid) {
          return ResponseHelper.unauthorized(res, 'Invalid signature');
        }
      }

      // Gerar token JWT
      const token = AuthHelper.generateToken({
        address: publicKey,
        role: 'user',
        authMethod: 'wallet',
        publicKey: publicKey
      });

      return ResponseHelper.success(res, {
        token,
        user: {
          id: publicKey,
          userName: userName || `User-${publicKey.substring(0, 8)}`,
          publicKey: publicKey,
          authMethod: 'wallet',
          connectedAt: new Date()
        },
        instructions: {
          message: 'Wallet authentication successful!',
          note: 'Connect your wallet on the frontend using Stellar Wallets Kit',
          availableActions: [
            'Register for quests',
            'Claim rewards',
            'View your profile and statistics'
          ]
        }
      }, 'Wallet authentication successful');

    } catch (error) {
      Logger.error('Wallet authentication failed');
      return ResponseHelper.unauthorized(res, (error as Error).message);
    }
  }

  /**
   * POST /auth/wallet/disconnect
   * Desconectar de uma carteira Stellar
   */
  async disconnectWallet(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { publicKey } = req.body;

      Logger.info('Disconnecting from Stellar wallet');

      const result = await this.stellarWalletService.disconnectWallet(publicKey);

      return ResponseHelper.success(res, {
        disconnected: result,
        publicKey
      }, result ? 'Wallet disconnected successfully' : 'Failed to disconnect wallet');

    } catch (error) {
      Logger.error('Wallet disconnection failed');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/wallet/quest/:questId/build-register
   * Construir transação para registro em quest (frontend assina depois)
   */
  async buildQuestRegistrationTransaction(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Building quest registration transaction', { questId, publicKey });

      const transactionXdr = await this.stellarWalletService.buildQuestRegistrationTransaction(
        publicKey,
        questId
      );

      return ResponseHelper.success(res, {
        transactionXdr,
        questId,
        instructions: {
          message: 'Transaction ready for signing',
          nextStep: 'Sign this transaction with your wallet to register for the quest'
        }
      }, 'Quest registration transaction built successfully');

    } catch (error) {
      Logger.error('Failed to build quest registration transaction');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/wallet/quest/:questId/register
   * Submeter transação assinada de registro para quest
   */
  async registerForQuestWithWallet(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { signedTransactionXdr, publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Submitting signed quest registration transaction', { questId, publicKey });

      // Submeter transação assinada à rede Stellar
      const result = await this.stellarWalletService.submitSignedTransaction(signedTransactionXdr);

      return ResponseHelper.success(res, {
        registered: true,
        questId,
        transactionHash: result.hash,
        instructions: {
          message: 'Successfully registered for quest with Stellar wallet!',
          benefit: 'Seamless quest registration using wallet authentication',
          nextSteps: [
            'Complete quest requirements',
            'Check quest progress in your profile',
            'Claim rewards when eligible'
          ]
        }
      }, 'Quest registration completed');

    } catch (error) {
      Logger.error('Quest registration failed');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/wallet/quest/:questId/build-claim
   * Construir transação para reivindicação de recompensas (frontend assina depois)
   */
  async buildClaimRewardsTransaction(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Building claim rewards transaction', { questId, publicKey });

      const transactionXdr = await this.stellarWalletService.buildClaimRewardsTransaction(
        publicKey,
        questId
      );

      return ResponseHelper.success(res, {
        transactionXdr,
        questId,
        instructions: {
          message: 'Claim transaction ready for signing',
          nextStep: 'Sign this transaction with your wallet to claim your rewards'
        }
      }, 'Claim rewards transaction built successfully');

    } catch (error) {
      Logger.error('Failed to build claim rewards transaction');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/wallet/quest/:questId/claim-rewards
   * Submeter transação assinada de reivindicação de recompensas
   */
  async claimRewardsWithWallet(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { signedTransactionXdr, publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Submitting signed claim rewards transaction', { questId, publicKey });

      // Submeter transação assinada à rede Stellar
      const result = await this.stellarWalletService.submitSignedTransaction(signedTransactionXdr);

      return ResponseHelper.success(res, {
        claimed: true,
        questId,
        transactionHash: result.hash,
        instructions: {
          message: 'Rewards claimed successfully with Stellar wallet!',
          benefit: 'Instant reward claiming using wallet authentication',
          transactionDetails: `View on Stellar: https://stellar.expert/explorer/testnet/tx/${result.hash}`
        }
      }, 'Rewards claimed successfully');

    } catch (error) {
      Logger.error('Reward claim failed');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * GET /auth/wallet/supported
   * Obter carteiras suportadas
   */
  async getSupportedWallets(req: Request, res: Response): Promise<Response> {
    try {
      const wallets = await this.stellarWalletService.getSupportedWallets();

      return ResponseHelper.success(res, {
        wallets: wallets.map(wallet => ({
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          icon: wallet.icon,
          url: wallet.url,
          isAvailable: wallet.isAvailable
        })),
        count: wallets.length
      }, 'Supported wallets retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get supported wallets');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * GET /auth/wallet/health
   * Verificar a saúde do serviço de carteira
   */
  async walletServiceHealth(req: Request, res: Response): Promise<Response> {
    try {
      const health = await this.stellarWalletService.healthCheck();
      
      const statusCode = health.overall ? 200 : 503;
      
      return res.status(statusCode).json({
        status: health.overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'Stellar Backend Service',
        message: health.message,
        note: 'This backend service does NOT handle wallet connections - use frontend Stellar Wallets Kit'
      });

    } catch (error) {
      Logger.error('Wallet service health check failed');
      return ResponseHelper.error(res, (error as Error).message, 503);
    }
  }

  /**
   * GET /auth/wallet/info
   * Obter informações sobre o serviço de carteira
   */
  async getWalletServiceInfo(req: Request, res: Response): Promise<Response> {
    try {
      const info = this.stellarWalletService.getServiceInfo();
      
      return ResponseHelper.success(res, info, 'Wallet service info retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get wallet service info');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }
}

export const authController = new AuthController();