import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { mercuryAuthService } from '../services';
import { ResponseHelper } from '../utils/response';
import { AuthHelper } from '../utils/auth';
import { Logger } from '../utils/logger';
import {
  PasskeyRegistrationInit,
  PasskeyRegistrationComplete,
  PasskeyAuthenticationComplete,
  PasskeyAuthenticationInit,
  MercuryAuthResponse
} from '../models';

export class AuthController {
  /**
   * POST /auth/passkey/register/init
   * Inicia o processo de registro de passkey
   */
  async initiatePasskeyRegistration(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { userIdentifier } = req.body as PasskeyRegistrationInit;

      Logger.info('Initiating passkey registration', { userIdentifier });

      const result = await mercuryAuthService.initiatePasskeyRegistration(userIdentifier);

      return ResponseHelper.success(res, {
        registrationOptions: result.registrationOptions,
        sessionId: result.sessionId,
        instructions: {
          message: 'Use these options to create your passkey with your device biometrics',
          nextStep: 'Call /auth/passkey/register/complete with the passkey response',
          webAuthnFlow: 'navigator.credentials.create(publicKey: registrationOptions)'
        }
      }, 'Passkey registration initiated successfully');

    } catch (error) {
      Logger.error('Passkey registration initiation failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/passkey/register/complete
   * Completa o registro de passkey e cria smart contract
   */
  async completePasskeyRegistration(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { sessionId, passkeyResponse } = req.body as PasskeyRegistrationComplete;

      Logger.info('Completing passkey registration', { sessionId });

      const result = await mercuryAuthService.completePasskeyRegistration(sessionId, passkeyResponse);

      // Gerar JWT token
      const token = AuthHelper.generateToken({
        address: result.stellarAddress,
        role: 'user',
        authMethod: 'passkey',
        contractAddress: result.contractAddress,
        publicKey: result.publicKey
      });

      return ResponseHelper.success(res, {
        token,
        user: {
          stellarAddress: result.stellarAddress,
          publicKey: result.publicKey,
          contractAddress: result.contractAddress,
          credentialId: result.credentialId,
          authMethod: 'passkey'
        },
        instructions: {
          message: 'Passkey registered successfully! Your Smart Wallet is ready.',
          contractAddress: result.contractAddress,
          nextSteps: [
            'Save your contract address safely',
            'Use your passkey for future logins',
            'Start participating in quests!'
          ],
          capabilities: ['quest_participation', 'reward_claims', 'profile_management']
        }
      }, 'Passkey registration completed successfully');

    } catch (error) {
      Logger.error('Passkey registration completion failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * GET /auth/passkey/challenge
   * Gera challenge para autenticação com passkey
   */
  async getAuthenticationChallenge(req: Request, res: Response): Promise<Response> {
    try {
      const { contractAddress } = req.query as PasskeyAuthenticationInit;

      Logger.debug('Generating authentication challenge', { contractAddress });

      const challenge = await mercuryAuthService.generateAuthenticationChallenge(contractAddress);

      return ResponseHelper.success(res, {
        challenge: challenge.challenge,
        options: {
          timeout: challenge.timeout,
          userVerification: challenge.userVerification
        },
        contractAddress,
        instructions: {
          message: 'Use this challenge to authenticate with your passkey',
          webAuthnFlow: 'navigator.credentials.get(publicKey: { challenge, timeout, userVerification })',
          nextStep: 'Call /auth/passkey/login with your passkey response'
        }
      }, 'Authentication challenge generated');

    } catch (error) {
      Logger.error('Authentication challenge generation failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/passkey/login
   * Autentica usuário com passkey e cria sessão Zephyr
   */
  async loginWithPasskey(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const { passkeyResponse, contractAddress } = req.body as PasskeyAuthenticationComplete;

      Logger.info('Processing passkey login', { contractAddress });

      // Autenticar via Mercury
      const authResult = await mercuryAuthService.authenticateWithPasskey(passkeyResponse, contractAddress);

      if (!authResult.success) {
        return ResponseHelper.unauthorized(res, 'Passkey authentication failed');
      }

      // Criar sessão Zephyr para transações
      const zephyrSession = await mercuryAuthService.createZephyrSession(
        authResult.contractAddress!,
        authResult.publicKey!,
        ['quest_interaction', 'reward_claim', 'profile_update']
      );

      // Gerar JWT token com informações da sessão
      const token = AuthHelper.generateToken({
        address: authResult.stellarAddress!,
        role: 'user',
        authMethod: 'passkey',
        contractAddress: authResult.contractAddress!,
        publicKey: authResult.publicKey!,
        sessionId: zephyrSession.sessionId
      });

      return ResponseHelper.success(res, {
        token,
        user: {
          stellarAddress: authResult.stellarAddress,
          publicKey: authResult.publicKey,
          contractAddress: authResult.contractAddress,
          authMethod: 'passkey'
        },
        session: {
          sessionId: zephyrSession.sessionId,
          expiresAt: zephyrSession.expiresAt,
          capabilities: zephyrSession.capabilities
        },
        instructions: {
          message: 'Login successful! You can now interact with Apollo quests.',
          sessionDuration: '1 hour',
          availableActions: [
            'Register for quests without manual signatures',
            'Claim rewards automatically',
            'View your profile and statistics'
          ]
        }
      }, 'Passkey login successful');

    } catch (error) {
      Logger.error('Passkey login failed', error as Error);
      return ResponseHelper.unauthorized(res, (error as Error).message);
    }
  }

  /**
   * POST /auth/passkey/register-quest
   * Registra usuário em quest via Zephyr (sem assinaturas manuais)
   */
  async registerForQuestWithPasskey(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { sessionId } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Registering for quest via Zephyr', { questId, sessionId });

      // Validar sessão primeiro
      const sessionValidation = await mercuryAuthService.validateZephyrSession(sessionId);
      if (!sessionValidation.valid) {
        return ResponseHelper.unauthorized(res, sessionValidation.error || 'Invalid session');
      }

      // Executar registro via Zephyr
      const result = await mercuryAuthService.registerForQuestViaZephyr(sessionId, questId);

      if (!result.success) {
        return ResponseHelper.error(res, result.error || 'Registration failed', 400);
      }

      return ResponseHelper.success(res, {
        registered: true,
        questId,
        transactionHash: result.transactionHash,
        instructions: {
          message: 'Successfully registered for quest via Smart Wallet!',
          benefit: 'No manual signature required - seamless interaction',
          nextSteps: [
            'Complete quest requirements',
            'Check quest progress in your profile',
            'Claim rewards when eligible'
          ]
        }
      }, 'Quest registration completed via Zephyr');

    } catch (error) {
      Logger.error('Zephyr quest registration failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * POST /auth/passkey/claim-rewards
   * Reivindica recompensas via Zephyr
   */
  async claimRewardsWithPasskey(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.error(res, 'Validation failed', 400);
      }

      const questId = Number(req.params.questId);
      const { sessionId } = req.body;

      if (isNaN(questId)) {
        return ResponseHelper.error(res, 'Invalid quest ID', 400);
      }

      Logger.info('Claiming rewards via Zephyr', { questId, sessionId });

      // Validar sessão
      const sessionValidation = await mercuryAuthService.validateZephyrSession(sessionId);
      if (!sessionValidation.valid) {
        return ResponseHelper.unauthorized(res, sessionValidation.error || 'Invalid session');
      }

      // Executar claim via Zephyr
      const result = await mercuryAuthService.claimRewardsViaZephyr(sessionId, questId);

      if (!result.success) {
        return ResponseHelper.error(res, result.error || 'Reward claim failed', 400);
      }

      return ResponseHelper.success(res, {
        claimed: true,
        questId,
        transactionHash: result.transactionHash,
        instructions: {
          message: 'Rewards claimed successfully via Smart Wallet!',
          benefit: 'Instant reward claiming without manual signatures',
          transactionDetails: `View on Stellar: https://stellar.expert/explorer/testnet/tx/${result.transactionHash}`
        }
      }, 'Rewards claimed via Zephyr');

    } catch (error) {
      Logger.error('Zephyr reward claim failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }

  /**
   * GET /auth/session/validate
   * Valida sessão Zephyr atual
   */
  async validateSession(req: Request, res: Response): Promise<Response> {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return ResponseHelper.error(res, 'Session ID required', 400);
      }

      const validation = await mercuryAuthService.validateZephyrSession(sessionId);

      if (!validation.valid) {
        return ResponseHelper.unauthorized(res, validation.error || 'Session invalid');
      }

      return ResponseHelper.success(res, {
        valid: true,
        session: validation.session,
        remainingTime: validation.session ? validation.session.expiresAt - Date.now() : 0
      }, 'Session is valid');

    } catch (error) {
      Logger.error('Session validation failed', error as Error);
      return ResponseHelper.error(res, (error as Error).message, 500);
    }
  }
}

export const authController = new AuthController();