import { 
  PasskeyWalletOptions,
  PasskeyServerOptions,
  PasskeyCredentials,
  PasskeyUser,
  PasskeyAuthResult,
  SignerConfig,
  PasskeyRegistrationRequest,
  PasskeyAuthenticationRequest,
  PasskeyTransactionRequest
} from '../models/auth.js';
import config from '../config/index.js';
import { Logger } from '../utils/logger.js';

/**
 * Kale Passkey Service
 * 
 * This service integrates with Kale's passkey-kit for Stellar smart wallet management.
 * It provides passkey-based authentication, wallet creation, and transaction signing.
 */
class KalePasskeyService {
  private initialized = false;

  constructor() {
    
    // Initialize Kale PasskeyKit for client-side operations
    const walletOptions: PasskeyWalletOptions = {
      rpcUrl: config.stellar.rpcUrl,
      networkPassphrase: config.stellar.networkPassphrase,
      walletWasmHash: config.kale.walletWasmHash,
      timeoutInSeconds: config.kale.timeoutInSeconds || 30
    };

    this.passkeyKit = new PasskeyKit(walletOptions);

    // Initialize Kale PasskeyServer for server-side operations
    const serverOptions: PasskeyServerOptions = {
      rpcUrl: config.stellar.rpcUrl,
      launchtubeUrl: config.kale.launchtubeUrl,
      launchtubeJwt: config.kale.launchtubeJwt,
      mercuryProjectName: config.kale.mercuryProjectName,
      mercuryUrl: config.kale.mercuryUrl,
      mercuryJwt: config.kale.mercuryJwt,
      mercuryKey: config.kale.mercuryKey
    };

    this.passkeyServer = new PasskeyServer(serverOptions);
  }

  /**
   * Create new wallet with passkey
   */
  async createWallet(request: PasskeyRegistrationRequest): Promise<PasskeyAuthResult> {
    try {
      Logger.info('Creating new passkey wallet', { 
        appName: request.appName,
        userName: request.userName 
      });

      const walletResult = await this.passkeyKit.createWallet(
        request.appName, 
        request.userName
      );

      // Create user record
      const user: PasskeyUser = {
        id: walletResult.keyIdBase64,
        contractId: walletResult.contractId,
        publicKey: walletResult.keyId.toString('hex'),
        keyId: walletResult.keyId.toString('hex'),
        keyIdBase64: walletResult.keyIdBase64,
        createdAt: new Date(),
        appName: request.appName,
        userName: request.userName
      };

      const credentials: PasskeyCredentials = {
        keyId: walletResult.keyId.toString('hex'),
        keyIdBase64: walletResult.keyIdBase64,
        publicKey: walletResult.keyId.toString('hex'),
        contractId: walletResult.contractId,
        rawResponse: walletResult.rawResponse
      };

      Logger.info('Passkey wallet created successfully', { 
        contractId: walletResult.contractId 
      });

      return {
        success: true,
        user,
        credentials,
        signedTransaction: walletResult.signedTx?.toXDR()
      };

    } catch (error: any) {
      Logger.error('Failed to create passkey wallet', { error });
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }

  /**
   * Connect to existing wallet
   */
  async connectWallet(request: PasskeyAuthenticationRequest): Promise<PasskeyAuthResult> {
    try {
      Logger.info('Connecting to existing passkey wallet', { 
        keyId: request.keyId,
        contractId: request.contractId 
      });

      const connectResult = await this.passkeyKit.connectWallet({
        keyId: request.keyId,
        rpId: request.rpId,
        getContractId: async (keyId: string) => {
          // Custom logic to find contract ID by keyId
          if (request.contractId) {
            return request.contractId;
          }
          
          // Use server to look up contract ID
          return await this.passkeyServer.getContractId({ keyId });
        }
      });

      const user: PasskeyUser = {
        id: connectResult.keyIdBase64,
        contractId: connectResult.contractId,
        publicKey: connectResult.keyId.toString('hex'),
        keyId: connectResult.keyId.toString('hex'),
        keyIdBase64: connectResult.keyIdBase64,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      const credentials: PasskeyCredentials = {
        keyId: connectResult.keyId.toString('hex'),
        keyIdBase64: connectResult.keyIdBase64,
        publicKey: connectResult.keyId.toString('hex'),
        contractId: connectResult.contractId,
        rawResponse: connectResult.rawResponse
      };

      this.logger.info('Passkey wallet connected successfully', { 
        contractId: connectResult.contractId 
      });

      return {
        success: true,
        user,
        credentials
      };

    } catch (error: any) {
      this.logger.error('Failed to connect passkey wallet', { error });
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  /**
   * Sign and execute transaction
   */
  async executeTransaction(request: PasskeyTransactionRequest): Promise<any> {
    try {
      this.logger.info('Executing passkey transaction', { 
        contractId: request.contractId,
        operation: request.operation 
      });

      // Connect to wallet first
      await this.passkeyKit.connectWallet({
        keyId: request.keyId,
        rpId: request.rpId,
        getContractId: async () => request.contractId
      });

      // Build transaction based on operation
      let transaction;
      switch (request.operation) {
        case 'questRegister':
          // Build quest registration transaction
          transaction = await this.buildQuestTransaction('register', request.params);
          break;
        case 'claimRewards':
          // Build reward claim transaction
          transaction = await this.buildQuestTransaction('claim', request.params);
          break;
        default:
          throw new Error(`Unsupported operation: ${request.operation}`);
      }

      // Sign transaction with passkey
      const signedTx = await this.passkeyKit.sign(transaction, {
        keyId: request.keyId,
        rpId: request.rpId
      });

      // Send transaction via server
      const result = await this.passkeyServer.send(signedTx);

      this.logger.info('Transaction executed successfully', { 
        transactionHash: result.hash 
      });

      return result;

    } catch (error: any) {
      this.logger.error('Failed to execute transaction', { error });
      throw new Error(`Transaction execution failed: ${error.message}`);
    }
  }

  /**
   * Add additional signer to wallet
   */
  async addSigner(contractId: string, signerConfig: SignerConfig): Promise<any> {
    try {
      this.logger.info('Adding signer to wallet', { contractId });

      // Connect to wallet
      await this.passkeyKit.connectWallet({
        getContractId: async () => contractId
      });

      let transaction;
      const store = signerConfig.store === 'Persistent' ? SignerStore.Persistent : SignerStore.Temporary;

      switch (signerConfig.tag) {
        case 'Secp256r1':
          transaction = await this.passkeyKit.addSecp256r1(
            signerConfig.keyId!,
            signerConfig.publicKey!,
            signerConfig.limits,
            store,
            signerConfig.expiration
          );
          break;
        case 'Ed25519':
          transaction = await this.passkeyKit.addEd25519(
            signerConfig.publicKey as string,
            signerConfig.limits,
            store,
            signerConfig.expiration
          );
          break;
        case 'Policy':
          transaction = await this.passkeyKit.addPolicy(
            signerConfig.policy!,
            signerConfig.limits,
            store,
            signerConfig.expiration
          );
          break;
        default:
          throw new Error(`Unsupported signer type: ${signerConfig.tag}`);
      }

      // Sign and send transaction
      const signedTx = await this.passkeyKit.sign(transaction);
      const result = await this.passkeyServer.send(signedTx);

      this.logger.info('Signer added successfully');
      return result;

    } catch (error: any) {
      this.logger.error('Failed to add signer', { error });
      throw error;
    }
  }

  /**
   * Get wallet signers
   */
  async getSigners(contractId: string): Promise<any[]> {
    try {
      this.logger.info('Getting wallet signers', { contractId });

      const signers = await this.passkeyServer.getSigners(contractId);
      
      this.logger.info('Signers retrieved successfully', { count: signers.length });
      return signers;

    } catch (error: any) {
      this.logger.error('Failed to get signers', { error });
      throw error;
    }
  }

  /**
   * Get contract ID by key information
   */
  async getContractId(keyId?: string, publicKey?: string, policy?: string): Promise<string | undefined> {
    try {
      const contractId = await this.passkeyServer.getContractId({
        keyId,
        publicKey,
        policy
      });

      this.logger.info('Contract ID retrieved', { contractId });
      return contractId;

    } catch (error: any) {
      this.logger.error('Failed to get contract ID', { error });
      throw error;
    }
  }

  /**
   * Health check for Kale services
   */
  async healthCheck() {
    try {
      // Check RPC connectivity
      const rpcHealthy = await this.checkRpcHealth();
      
      // Check if required configurations are present
      const configHealthy = this.checkConfig();

      return {
        rpc: rpcHealthy,
        config: configHealthy,
        overall: rpcHealthy && configHealthy
      };
    } catch (error: any) {
      this.logger.error('Health check failed', { error });
      return {
        rpc: false,
        config: false,
        overall: false
      };
    }
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      service: 'Kale Passkey Kit',
      methods: ['wallet-creation', 'wallet-connection', 'transaction-signing'],
      features: {
        smartWallets: true,
        passkeyAuth: true,
        stellarIntegration: true,
        sorobanContracts: true
      },
      network: config.stellar.networkPassphrase,
      rpcUrl: config.stellar.rpcUrl
    };
  }

  private async buildQuestTransaction(operation: string, params: any): Promise<any> {
    // This would integrate with your quest smart contract
    // For now, return a mock transaction
    throw new Error('Quest transaction building not implemented yet');
  }

  private async checkRpcHealth(): Promise<boolean> {
    try {
      if (!this.passkeyKit.rpc) return false;
      await this.passkeyKit.rpc.getLatestLedger();
      return true;
    } catch {
      return false;
    }
  }

  private checkConfig(): boolean {
    return !!(
      config.stellar.rpcUrl &&
      config.stellar.networkPassphrase &&
      config.kale.walletWasmHash
    );
  }
}

export default KalePasskeyService;