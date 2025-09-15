import { Logger } from '../utils/logger';
import config from '../config';
import {
  PasskeyCredentials,
  PasskeyRegistrationOptions,
  MercuryAuthResponse,
  ZephyrSession,
  ZephyrTransactionRequest,
  ZephyrTransactionResponse,
  PasskeyUser
} from '../models';

export class MercuryAuthService {
  private readonly mercuryApiUrl: string;
  private readonly mercuryApiKey: string;
  private readonly zephyrContractId: string;
  private readonly networkPassphrase: string;

  constructor() {
    this.mercuryApiUrl = config.mercuryApiUrl;
    this.mercuryApiKey = config.mercuryApiKey;
    this.zephyrContractId = config.zephyrContractId;
    this.networkPassphrase = config.networkPassphrase;
  }

  /**
   * Inicia o processo de registro de passkey via Mercury
   */
  async initiatePasskeyRegistration(userIdentifier: string): Promise<{
    registrationOptions: PasskeyRegistrationOptions;
    sessionId: string;
    challenge: string;
  }> {
    try {
      Logger.info('Initiating passkey registration with Mercury', { userIdentifier });

      const response = await fetch(`${this.mercuryApiUrl}/passkey/register/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          userIdentifier,
          rpName: 'Apollo DApp',
          rpId: config.frontendDomain,
          networkPassphrase: this.networkPassphrase,
          contractTemplate: 'zephyr-smart-wallet'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate passkey registration');
      }

      const data = await response.json();

      Logger.info('Passkey registration initiated successfully', { 
        userIdentifier, 
        sessionId: data.sessionId 
      });

      return {
        registrationOptions: data.registrationOptions,
        sessionId: data.sessionId,
        challenge: data.challenge
      };
    } catch (error) {
      Logger.error('Mercury passkey registration initiation failed', error as Error);
      throw new Error(`Failed to initiate passkey registration: ${(error as Error).message}`);
    }
  }

  /**
   * Completa o registro da passkey e cria contrato Zephyr
   */
  async completePasskeyRegistration(
    sessionId: string, 
    passkeyResponse: PasskeyCredentials
  ): Promise<{
    success: boolean;
    contractAddress: string;
    stellarAddress: string;
    publicKey: string;
    credentialId: string;
    user: PasskeyUser;
  }> {
    try {
      Logger.info('Completing passkey registration with Mercury', { sessionId });

      const response = await fetch(`${this.mercuryApiUrl}/passkey/register/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          sessionId,
          passkeyResponse,
          networkPassphrase: this.networkPassphrase
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete passkey registration');
      }

      const data = await response.json();

      const user: PasskeyUser = {
        userIdentifier: data.userIdentifier,
        stellarAddress: data.stellarAddress,
        publicKey: data.publicKey,
        contractAddress: data.contractAddress,
        credentialId: data.credentialId,
        authMethod: 'passkey',
        registeredAt: Date.now(),
        isActive: true
      };

      Logger.info('Passkey registration completed successfully', { 
        contractAddress: data.contractAddress,
        stellarAddress: data.stellarAddress
      });

      return {
        success: true,
        contractAddress: data.contractAddress,
        stellarAddress: data.stellarAddress,
        publicKey: data.publicKey,
        credentialId: data.credentialId,
        user
      };
    } catch (error) {
      Logger.error('Mercury passkey registration completion failed', error as Error);
      throw new Error(`Failed to complete passkey registration: ${(error as Error).message}`);
    }
  }

  /**
   * Gera challenge para autenticação com passkey
   */
  async generateAuthenticationChallenge(contractAddress?: string): Promise<{
    challenge: string;
    timeout: number;
    userVerification: string;
  }> {
    try {
      Logger.debug('Generating authentication challenge', { contractAddress });

      const response = await fetch(`${this.mercuryApiUrl}/passkey/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          contractAddress,
          networkPassphrase: this.networkPassphrase
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate challenge');
      }

      const data = await response.json();

      return {
        challenge: data.challenge,
        timeout: data.timeout || 60000,
        userVerification: data.userVerification || 'preferred'
      };
    } catch (error) {
      Logger.error('Failed to generate authentication challenge', error as Error);
      throw new Error(`Failed to generate challenge: ${(error as Error).message}`);
    }
  }

  /**
   * Autentica usuário com passkey via Mercury/Zephyr
   */
  async authenticateWithPasskey(
    passkeyResponse: PasskeyCredentials,
    contractAddress?: string
  ): Promise<MercuryAuthResponse> {
    try {
      Logger.info('Authenticating with passkey via Mercury', { contractAddress });

      const response = await fetch(`${this.mercuryApiUrl}/passkey/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          passkeyResponse,
          contractAddress,
          networkPassphrase: this.networkPassphrase
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Passkey authentication failed');
      }

      const data = await response.json();

      Logger.info('Passkey authentication successful', { 
        stellarAddress: data.stellarAddress,
        contractAddress: data.contractAddress
      });

      return {
        success: true,
        stellarAddress: data.stellarAddress,
        publicKey: data.publicKey,
        contractAddress: data.contractAddress,
        authMethod: 'passkey',
        sessionId: data.sessionId,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      Logger.error('Mercury passkey authentication failed', error as Error);
      throw new Error(`Passkey authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Cria sessão Zephyr para interações com smart contracts
   */
  async createZephyrSession(
    contractAddress: string, 
    publicKey: string,
    capabilities: string[] = ['quest_interaction', 'reward_claim']
  ): Promise<ZephyrSession> {
    try {
      Logger.info('Creating Zephyr session', { contractAddress, capabilities });

      const response = await fetch(`${this.mercuryApiUrl}/zephyr/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          contractAddress,
          publicKey,
          networkPassphrase: this.networkPassphrase,
          expirationMinutes: 60,
          capabilities,
          questManagerContract: config.contractId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Zephyr session');
      }

      const data = await response.json();

      const session: ZephyrSession = {
        sessionId: data.sessionId,
        contractAddress: data.contractAddress,
        publicKey: data.publicKey,
        stellarAddress: data.stellarAddress,
        expiresAt: data.expiresAt,
        capabilities: data.capabilities
      };

      Logger.info('Zephyr session created successfully', { 
        sessionId: session.sessionId,
        expiresAt: new Date(session.expiresAt)
      });

      return session;
    } catch (error) {
      Logger.error('Zephyr session creation failed', error as Error);
      throw new Error(`Failed to create Zephyr session: ${(error as Error).message}`);
    }
  }

  /**
   * Executa transação via Zephyr (sem necessidade de chaves privadas)
   */
  async executeZephyrTransaction(
    sessionId: string, 
    operation: any,
    memo?: string
  ): Promise<ZephyrTransactionResponse> {
    try {
      Logger.info('Executing Zephyr transaction', { sessionId, operation: operation.name });

      const request: ZephyrTransactionRequest = {
        sessionId,
        operation,
        memo
      };

      const response = await fetch(`${this.mercuryApiUrl}/zephyr/transaction/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          ...request,
          networkPassphrase: this.networkPassphrase
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transaction execution failed');
      }

      const data = await response.json();

      Logger.info('Zephyr transaction executed successfully', { 
        transactionHash: data.transactionHash 
      });

      return {
        success: true,
        transactionHash: data.transactionHash,
        result: data.result
      };
    } catch (error) {
      Logger.error('Zephyr transaction execution failed', error as Error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Valida se uma sessão Zephyr ainda está ativa
   */
  async validateZephyrSession(sessionId: string): Promise<{
    valid: boolean;
    session?: ZephyrSession;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.mercuryApiUrl}/zephyr/session/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mercuryApiKey}`,
          'X-Network': this.networkPassphrase
        },
        body: JSON.stringify({
          sessionId,
          networkPassphrase: this.networkPassphrase
        })
      });

      if (!response.ok) {
        return { valid: false, error: 'Session validation failed' };
      }

      const data = await response.json();

      if (!data.valid) {
        return { valid: false, error: data.reason || 'Session expired or invalid' };
      }

      return {
        valid: true,
        session: {
          sessionId: data.session.sessionId,
          contractAddress: data.session.contractAddress,
          publicKey: data.session.publicKey,
          stellarAddress: data.session.stellarAddress,
          expiresAt: data.session.expiresAt,
          capabilities: data.session.capabilities
        }
      };
    } catch (error) {
      Logger.error('Zephyr session validation failed', error as Error);
      return { valid: false, error: (error as Error).message };
    }
  }

  /**
   * Registra usuário em quest usando Zephyr
   */
  async registerForQuestViaZephyr(sessionId: string, questId: number): Promise<ZephyrTransactionResponse> {
    const operation = {
      name: 'register_user',
      contract: config.contractId,
      function: 'register_user',
      args: [
        { type: 'u64', value: questId }
      ]
    };

    return await this.executeZephyrTransaction(
      sessionId, 
      operation, 
      `Register for quest ${questId}`
    );
  }

  /**
   * Reivindica recompensas usando Zephyr
   */
  async claimRewardsViaZephyr(sessionId: string, questId: number): Promise<ZephyrTransactionResponse> {
    const operation = {
      name: 'claim_rewards',
      contract: config.contractId,
      function: 'claim_rewards',
      args: [
        { type: 'u64', value: questId }
      ]
    };

    return await this.executeZephyrTransaction(
      sessionId, 
      operation, 
      `Claim rewards for quest ${questId}`
    );
  }
}

export const mercuryAuthService = new MercuryAuthService();