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
      // Log incoming request data for debugging
      Logger.info('Incoming build-register request', {
        params: req.params,
        body: req.body,
        headers: {
          origin: req.headers.origin,
          host: req.headers.host,
          'user-agent': req.headers['user-agent']
        }
      });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Return validation details to help frontend debugging
  const details = errors.array().map((e: any) => ({ param: e.param, msg: e.msg }));
        return res.status(400).json({ success: false, error: 'Validation failed', details, timestamp: new Date().toISOString() });
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
      // Log incoming request data for debugging
      Logger.info('Incoming register request', {
        params: req.params,
        body: req.body,
        headers: {
          origin: req.headers.origin,
          host: req.headers.host,
          'user-agent': req.headers['user-agent']
        }
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e: any) => ({ param: e.param, msg: e.msg }));
        Logger.warn('Validation failed for registerForQuestWithWallet', { details });
        return res.status(400).json({ success: false, error: 'Validation failed', details, timestamp: new Date().toISOString() });
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
      // Log incoming request data for debugging
      Logger.info('Incoming build-claim request', {
        params: req.params,
        body: req.body,
        headers: {
          origin: req.headers.origin,
          host: req.headers.host,
          'user-agent': req.headers['user-agent']
        }
      });
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

      const transactionXdr = await this.stellarWalletService.buildClaimRewardsTransaction(questId);

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



  /**
   * GET /auth/wallet/quest/:questId/status
   * Verificar o status do usuário em uma quest específica
   */
  async getQuestStatus(req: Request, res: Response): Promise<Response> {
    try {
      // Log incoming request for debugging
      Logger.info('Incoming get-quest-status request', {
        params: req.params,
        query: req.query,
        headers: {
          origin: req.headers.origin,
          host: req.headers.host,
          'user-agent': req.headers['user-agent']
        }
      });

      // Validate params (express-validator middleware may have added errors)
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e: any) => ({ param: e.param, msg: e.msg }));
        Logger.warn('Validation failed for getQuestStatus', { details });
        return res.status(400).json({ success: false, error: 'Validation failed', details, timestamp: new Date().toISOString() });
      }

      const questId = parseInt(req.params.questId);
      const { publicKey } = req.query;

      if (!publicKey || typeof publicKey !== 'string') {
        return ResponseHelper.error(res, 'publicKey is required as query parameter', 400);
      }

      const [questInfo, isRegistered, isWinner] = await Promise.all([
        this.stellarWalletService.getQuestInfo(questId),
        this.stellarWalletService.isUserRegistered(questId, publicKey),
        this.stellarWalletService.checkIfUserIsWinner(questId, publicKey)
      ]);

      return ResponseHelper.success(res, {
        questId,
        userAddress: publicKey,
        questInfo,
        isRegistered,
        isWinner,
        canClaim: isWinner && !questInfo.is_active, // Can claim if winner and quest is resolved
        timestamp: new Date().toISOString()
      }, 'Quest status retrieved successfully');

    } catch (error: unknown) {
      Logger.error(`Failed to get quest status for quest ${req.params.questId}`, (error as Error));
      // If questId appears invalid or zero, return clear message to help debugging
      const msg = (error as Error).message || 'Unknown server error';
      return ResponseHelper.error(res, `Failed to get quest status: ${msg}`, 500);
    }
  }

  /**
   * GET /auth/wallet/quests/active
   * Get all active quests available for registration
   */
  async getActiveQuests(req: Request, res: Response): Promise<Response> {
    try {
      // Get active quests from smart contract via service
      const activeQuests = await this.stellarWalletService.getActiveQuests();
      
      return ResponseHelper.success(res, {
        quests: activeQuests,
        count: activeQuests.length,
        timestamp: new Date().toISOString()
      }, 'Active quests retrieved successfully');

    } catch (error: unknown) {
      Logger.error('Failed to get active quests');
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Private helper method to verify user task completion
   */
  private async verifyUserTask(questId: number, userAddress: string, questType: any): Promise<boolean> {
    try {
      // TODO: Implement actual verification logic based on quest type
      // For now, simulate task verification
      
      Logger.info(`Verifying task for quest ${questId}, user ${userAddress}, type:`, questType);
      
      // Simulate verification - in real implementation:
      // - For TradeVolume: Check DEX APIs for trading history
      // - For PoolPosition: Check pool contract for user's position  
      // - For TokenHold: Check token balance via Horizon API
      
      return true; // Simulate successful verification
    } catch (error: any) {
      Logger.error('Task verification failed:', error);
      return false;
    }
  }

  /**
   * Verify that a user has completed quest requirements
   */
  async verifyQuestCompletion(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e: any) => ({ param: e.param, msg: e.msg }));
        Logger.warn('Validation failed for verifyQuestCompletion', { details });
        return res.status(400).json({ success: false, error: 'Validation failed', details, timestamp: new Date().toISOString() });
      }

      const questId = Number(req.params.questId);
      const { publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Verifying quest completion (MOCK for demo)', { questId, publicKey });

      // MOCK IMPLEMENTATION FOR DEMO
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing delay
      
      // Mock success response
      const mockTransactionHash = `mock_verify_tx_${questId}_${Date.now()}`;
      
      Logger.info('Mock verification completed successfully', { 
        questId, 
        publicKey,
        transactionHash: mockTransactionHash 
      });

      return ResponseHelper.success(res, {
        verified: true,
        questId,
        publicKey,
        transactionHash: mockTransactionHash,
        mock: true, // Indicate this is a mock response
        instructions: {
          message: '✅ Quest completion verified successfully! (Demo Mode)',
          benefit: 'You are now eligible for rewards when the quest ends',
          nextSteps: [
            'Wait for quest to end',
            'Claim your rewards if you are selected as a winner',
            'Check quest status in your profile'
          ]
        }
      });

    } catch (error: any) {
      Logger.error('Quest verification failed', error);
      return ResponseHelper.error(res, `Quest verification failed: ${error.message}`, 500);
    }
  }

  /**
   * Claim rewards for a completed quest
   */
  async claimQuestRewards(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((e: any) => ({ param: e.param, msg: e.msg }));
        Logger.warn('Validation failed for claimQuestRewards', { details });
        return res.status(400).json({ success: false, error: 'Validation failed', details, timestamp: new Date().toISOString() });
      }

      const questId = Number(req.params.questId);
      const { publicKey } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Processing quest reward claim', { questId, publicKey });

      // Get quest details to validate status
      const quest = await this.stellarWalletService.getQuestInfo(questId);
      if (!quest) {
        return ResponseHelper.error(res, 'Quest not found', 404);
      }

      // For demo: mock the claim functionality
      Logger.info('Using demo claim (mocked) for active quest', { questId, isActive: quest.is_active, publicKey });

      // Mock delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful claim result
      const result = {
        success: true,
        claimed: true,
        questId,
        transactionHash: `mock_tx_${questId}_${Date.now()}`,
        message: 'Quest rewards claimed successfully (demo mode)!'
      };

      return ResponseHelper.success(res, {
        claimed: true,
        questId,
        transactionHash: result.transactionHash,
        instructions: {
          message: result.message,
          benefit: 'Demo rewards claimed successfully',
          nextSteps: [
            'In production: Check your wallet for received rewards',
            'Participate in more quests',
            'Share your success with the community'
          ]
        }
      });

    } catch (error: any) {
      Logger.error('Quest reward claim failed', error);
      return ResponseHelper.error(res, `Quest reward claim failed: ${error.message}`, 500);
    }
  }
}

export const authController = new AuthController();