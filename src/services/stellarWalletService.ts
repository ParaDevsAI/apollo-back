import { Logger } from '../utils/logger';
import config from '../config';
import { WalletTransactionResult } from '../models/auth';
import * as StellarSdk from '@stellar/stellar-sdk';

class StellarWalletService {
  private readonly server: StellarSdk.Horizon.Server;
  private readonly sorobanServer: any;
  private readonly networkPassphrase: string;
  private readonly isTestnet: boolean;
  private readonly contractAddress: string;
  private readonly adminKeypair?: StellarSdk.Keypair;

  constructor() {
    this.networkPassphrase = config.stellar?.networkPassphrase || StellarSdk.Networks.TESTNET;
    this.isTestnet = this.networkPassphrase === StellarSdk.Networks.TESTNET;
    
    const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
    this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Initialize Soroban RPC server for smart contract calls
    this.sorobanServer = {
      url: rpcUrl,
      simulate: async (transaction: any) => {
        // For now, we'll use HTTP fetch to call the RPC directly
        // This is a simplified implementation for development
        Logger.info('Soroban RPC call simulation - using fallback implementation');
        throw new Error('Direct RPC calls not implemented, using mock data');
      }
    };
    
    this.contractAddress = config.contractId || '';
    if (!this.contractAddress) {
      throw new Error('CONTRACT_ID is required for smart contract operations');
    }

    // Initialize admin keypair from secret (for admin operations)
    const adminSecret = config.adminSecret || '';
    if (adminSecret && adminSecret !== 'apollo-admin-secret-development') {
      try {
        this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
      } catch (error) {
        Logger.warn('Invalid admin secret provided, admin operations will not be available');
      }
    }
    
    Logger.info('Stellar Backend Service initialized with contract integration', {
      contractAddress: this.contractAddress,
      network: this.isTestnet ? 'TESTNET' : 'PUBLIC',
      hasAdminKeypair: !!this.adminKeypair
    });
  }

  async validateSignedTransaction(signedXdr: string): Promise<boolean> {
    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      return transaction.signatures.length > 0;
    } catch (error: any) {
      Logger.error('Transaction validation failed:', error);
      return false;
    }
  }

  async submitSignedTransaction(signedXdr: string): Promise<WalletTransactionResult> {
    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      const result = await this.server.submitTransaction(transaction);
      
      return {
        success: true,
        hash: result.hash,
        createdAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Transaction submission failed: ${error.message}`);
    }
  }

  async buildQuestRegistrationTransaction(userAddress: string, questId: number): Promise<string> {
    try {
      const account = await this.server.loadAccount(userAddress);
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.register(quest_id, user_address)  
      const operation = contract.call(
        'register',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' }),
          new StellarSdk.Address(userAddress).toScVal()
        ]
      );

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      Logger.info(`Built quest registration transaction for user ${userAddress} and quest ${questId}`);
      return transaction.toXDR();
    } catch (error: any) {
      Logger.error('Failed to build quest registration transaction:', error);
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
  }

  async buildClaimRewardsTransaction(userAddress: string, questId: number): Promise<string> {
    try {
      // First check if user is actually a winner
      const isWinner = await this.checkIfUserIsWinner(questId, userAddress);
      if (!isWinner) {
        throw new Error('User is not a winner for this quest');
      }

      const account = await this.server.loadAccount(userAddress);
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.distribute_rewards(quest_id)
      // Note: This should only be called by winners and admin validation should happen on contract side
      const operation = contract.call(
        'distribute_rewards',
        ...[StellarSdk.nativeToScVal(questId, { type: 'u64' })]
      );

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      Logger.info(`Built claim rewards transaction for user ${userAddress} and quest ${questId}`);
      return transaction.toXDR();
    } catch (error: any) {
      Logger.error('Failed to build claim rewards transaction:', error);
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
  }

  async disconnectWallet(publicKey?: string): Promise<boolean> {
    Logger.info('Wallet disconnection requested (backend does not manage connections)', { publicKey });
    return true;
  }

  async executeTransaction(publicKey: string, transactionXdr: string): Promise<WalletTransactionResult> {
    return await this.submitSignedTransaction(transactionXdr);
  }

  async getSupportedWallets(): Promise<any[]> {
    return [
      { id: 'freighter', name: 'Freighter', type: 'extension', icon: '', url: '', isAvailable: true },
      { id: 'albedo', name: 'Albedo', type: 'web', icon: '', url: '', isAvailable: true },
      { id: 'rabet', name: 'Rabet', type: 'extension', icon: '', url: '', isAvailable: true }
    ];
  }

  async healthCheck() {
    try {
      await this.server.ledgers().order('desc').limit(1).call();
      return {
        overall: true,
        message: 'Stellar Backend Service is operational'
      };
    } catch (error: any) {
      return {
        overall: false,
        message: `Service unhealthy: ${error.message}`
      };
    }
  }

  getServiceInfo() {
    return {
      service: 'Stellar Backend Service',
      description: 'Backend-only Stellar service for transaction handling',
      network: this.isTestnet ? 'TESTNET' : 'PUBLIC',
      note: 'This service does NOT handle wallet connections. Use Stellar Wallets Kit on the frontend.'
    };
  }

  // QUEST-SPECIFIC SMART CONTRACT METHODS

  /**
   * Check if a user is registered for a quest
   */
  async isUserRegistered(questId: number, userAddress: string): Promise<boolean> {
    try {
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Call contract.is_user_registered(quest_id, user_address)
      const result = await this.simulateContractCall('is_user_registered', [
        StellarSdk.nativeToScVal(questId, { type: 'u64' }),
        new StellarSdk.Address(userAddress).toScVal()
      ]);
      
      return StellarSdk.scValToNative(result) as boolean;
    } catch (error: any) {
      Logger.error('Failed to check user registration:', error);
      return false;
    }
  }

  /**
   * Check if a user is a winner for a quest
   */
  async checkIfUserIsWinner(questId: number, userAddress: string): Promise<boolean> {
    try {
      const winners = await this.getQuestWinners(questId);
      return winners.includes(userAddress);
    } catch (error: any) {
      Logger.error('Failed to check if user is winner:', error);
      return false;
    }
  }

  /**
   * Get quest winners
   */
  async getQuestWinners(questId: number): Promise<string[]> {
    try {
      const result = await this.simulateContractCall('get_winners', [
        StellarSdk.nativeToScVal(questId, { type: 'u64' })
      ]);
      
      const winners = StellarSdk.scValToNative(result) as any[];
      return winners.map(winner => winner.toString());
    } catch (error: any) {
      Logger.error('Failed to get quest winners:', error);
      return [];
    }
  }

  /**
   * Get quest information
   */
  async getQuestInfo(questId: number): Promise<any> {
    try {
      const result = await this.simulateContractCall('get_quest', [
        StellarSdk.nativeToScVal(questId, { type: 'u64' })
      ]);
      
      return StellarSdk.scValToNative(result);
    } catch (error: any) {
      Logger.error('Failed to get quest info:', error);
      throw new Error(`Failed to get quest info: ${error.message}`);
    }
  }

  /**
   * Helper method to convert BigInt values to strings for JSON serialization
   */
  private serializeBigIntForJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigIntForJson(item));
    }
    
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = this.serializeBigIntForJson(value);
      }
      return serialized;
    }
    
    return obj;
  }

  /**
   * Token symbol mapping for known Stellar assets
   */
  private getTokenSymbol(contractOrAsset: string): string {
    const tokenMap: Record<string, string> = {
      // Native Stellar
      'native': 'XLM',
      'XLM': 'XLM',
      
      // Common Stellar tokens (by contract address)
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAOBKXN7FRZZ': 'USDC',
      'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2DA2KPP2GT': 'USDT', 
      'CDCLZROJYSA74I3N2QEGEW4XEWIY4KRZWHJJNIF2CEMEYCSM4H5CNCXD': 'XLM', // Quest contract using XLM
      
      // Default fallback
      'default': 'TOKEN'
    };
    
    return tokenMap[contractOrAsset] || tokenMap['default'];
  }

  /**
   * Enhanced retry mechanism with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 5, 
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`Network operation attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          Logger.error(`All ${maxRetries} attempts failed`);
          break;
        }
        
        // Check if it's a recoverable network error
        const isNetworkError = error.message?.includes('ECONNRESET') || 
                              error.message?.includes('ENOTFOUND') || 
                              error.message?.includes('ETIMEDOUT') ||
                              error.message?.includes('timeout') ||
                              error.message?.includes('ECONNREFUSED');
        
        if (isNetworkError) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          
          Logger.warn(`Network error on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`, {
            error: error.message,
            errorCode: error.code
          });
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Non-recoverable error, don't retry
          Logger.error('Non-recoverable error, not retrying:', error.message);
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Network operation failed after all retries');
  }

  /**
   * Get all active quests with improved network connectivity
   */
  async getActiveQuests(): Promise<any[]> {
    try {
      Logger.info('Attempting to fetch active quests from smart contract...');
      
      const result = await this.retryOperation(
        () => this.simulateContractCall('get_active_quests', []),
        5, // Increased retries
        2000 // Increased delay
      );
      
      // Convert ScVal to native with special handling for BigInt values
      const quests = this.convertScValToNativeWithBigIntHandling(result);
      
      // Ensure all BigInt values are serializable as strings
      let serializableQuests = this.serializeBigIntForJson(quests);
      
      // Enhance quest data with token symbols
      if (Array.isArray(serializableQuests)) {
        serializableQuests = serializableQuests.map((quest: any) => {
          const tokenSymbol = this.getTokenSymbol(quest.reward_token || 'native');
          
          return {
            ...quest,
            reward_token: tokenSymbol,
            title: quest.title || `Quest #${quest.id}`,
            description: quest.description || `Complete this quest to earn rewards`,
            end_timestamp: quest.end_timestamp
          };
        });
      }
      
      Logger.info(`Successfully retrieved ${Array.isArray(serializableQuests) ? serializableQuests.length : 0} active quests from smart contract`);
      return Array.isArray(serializableQuests) ? serializableQuests : [];
      
    } catch (error: any) {
      Logger.error('Failed to get active quests from smart contract:', error);
      
      // Detailed network error analysis
      if (error.message?.includes('ECONNRESET')) {
        Logger.error('Network connection reset - Stellar RPC server may be under heavy load');
        Logger.error('Try again in a few moments or check network connectivity');
      } else if (error.message?.includes('ENOTFOUND')) {
        Logger.error('DNS resolution failed - check network connectivity');
      } else if (error.message?.includes('timeout')) {
        Logger.error('Request timed out - Stellar RPC server may be slow');
      } else if (error.message?.includes('BigInt')) {
        Logger.error('Data conversion error - contract returned valid data but conversion failed');
      } else {
        Logger.error('Unexpected error type:', error.message);
      }
      
      Logger.warn('Unable to fetch quest data from smart contract - returning empty list');
      
      // Return empty array to allow frontend to handle gracefully
      return [];
    }
  }

  /**
   * Convert ScVal to native JavaScript with proper BigInt handling
   */
  private convertScValToNativeWithBigIntHandling(scVal: any): any {
    try {
      // First try the standard conversion
      return StellarSdk.scValToNative(scVal);
    } catch (error: any) {
      if (error.message?.includes('BigInt')) {
        Logger.info('Standard ScVal conversion failed due to BigInt, using custom conversion');
        return this.customScValToNative(scVal);
      }
      throw error;
    }
  }

  /**
   * Custom ScVal to native conversion that handles BigInt properly
   */
  private customScValToNative(scVal: any): any {
    if (!scVal || typeof scVal !== 'object') {
      return scVal;
    }

    // Handle different ScVal types
    switch (scVal._switch?.name) {
      case 'scvVec':
        return scVal._value?.map((item: any) => this.customScValToNative(item)) || [];
      
      case 'scvMap':
        const obj: any = {};
        if (scVal._value && Array.isArray(scVal._value)) {
          for (const item of scVal._value) {
            if (item._attributes?.key && item._attributes?.val) {
              const key = this.customScValToNative(item._attributes.key);
              const val = this.customScValToNative(item._attributes.val);
              obj[key] = val;
            }
          }
        }
        return obj;
      
      case 'scvString':
        return scVal._value ? Buffer.from(scVal._value.data).toString('utf8') : '';
      
      case 'scvSymbol':
        return scVal._value ? Buffer.from(scVal._value.data).toString('utf8') : '';
      
      case 'scvU64':
        return scVal._value?._value ? parseInt(scVal._value._value) : 0;
      
      case 'scvU128':
        // Convert BigInt to number (be careful with large values)
        const hi = scVal._value?._attributes?.hi?._value || '0';
        const lo = scVal._value?._attributes?.lo?._value || '0';
        return parseInt(lo); // For now, just use the low part
      
      case 'scvU32':
        return scVal._value || 0;
      
      case 'scvBool':
        return scVal._value || false;
      
      case 'scvAddress':
        // For addresses, we'll use the Stellar SDK to format them properly
        try {
          return StellarSdk.scValToNative(scVal);
        } catch {
          return scVal._value ? 'ADDRESS_CONVERSION_ERROR' : '';
        }
      
      default:
        // Try the standard conversion for other types
        try {
          return StellarSdk.scValToNative(scVal);
        } catch {
          return scVal._value || scVal;
        }
    }
  }

  /**
   * Mark user as eligible (Admin function - requires admin auth)
   */
  async markUserEligible(questId: number, userAddress: string): Promise<boolean> {
    try {
      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }

      const account = await this.server.loadAccount(this.adminKeypair.publicKey());
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      const operation = contract.call(
        'mark_user_eligible',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' }),
          new StellarSdk.Address(userAddress).toScVal()
        ]
      );

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);
      const result = await this.server.submitTransaction(transaction);
      
      Logger.info(`Marked user ${userAddress} as eligible for quest ${questId}`);
      return result.successful;
    } catch (error: any) {
      Logger.error('Failed to mark user as eligible:', error);
      throw new Error(`Failed to mark user as eligible: ${error.message}`);
    }
  }

  /**
   * Call a smart contract function (read-only operations)
   * Only calls the real smart contract - no mock data fallback
   */
  private async simulateContractCall(functionName: string, args: any[]): Promise<any> {
    try {
      // Validate prerequisites
      if (!this.adminKeypair) {
        throw new Error('ADMIN_SECRET not configured in environment variables. Please set a valid Stellar secret key (starts with S)');
      }

      if (!this.contractAddress) {
        throw new Error('CONTRACT_ID not configured in environment variables');
      }

      Logger.info(`Contract call requested: ${functionName} with contract ${this.contractAddress}`);

      // Build the contract address
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Create transaction to call the contract
      let account;
      try {
        account = await this.server.loadAccount(this.adminKeypair.publicKey());
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          throw new Error(
            `Admin account ${this.adminKeypair.publicKey()} not found on ${this.isTestnet ? 'testnet' : 'mainnet'}. ` +
            `${this.isTestnet ? 
              'Please fund it using the Stellar Laboratory: https://laboratory.stellar.org/#account-creator?network=test' : 
              'Please ensure the account is created and funded on mainnet'
            }`
          );
        }
        throw error;
      }
      
      // Convert arguments to ScVal format if needed
      const scValArgs = args.map(arg => {
        // If already ScVal, return as-is
        if (arg && typeof arg === 'object' && '_switch' in arg) {
          return arg;
        }
        // Otherwise convert
        if (typeof arg === 'string') {
          return StellarSdk.nativeToScVal(arg, { type: 'symbol' });
        }
        return StellarSdk.nativeToScVal(arg);
      });

      // Build the operation
      const operation = contract.call(functionName, ...scValArgs);
      
      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // For Soroban contract calls, we need to use the RPC server
      // Create a proper Soroban RPC server instance with timeout configuration
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl, {
        allowHttp: rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1'),
      });
      
      Logger.debug(`Making contract call to: ${rpcUrl}`);
      
      // Simulate the transaction with timeout handling (read-only call)
      const response = await Promise.race([
        sorobanServer.simulateTransaction(transaction),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract call timeout after 10 seconds')), 10000)
        )
      ]) as any;
      
      // Check if simulation was successful
      if (StellarSdk.rpc.Api.isSimulationError(response)) {
        throw new Error(`Contract simulation failed: ${response.error}`);
      }

      if (!StellarSdk.rpc.Api.isSimulationSuccess(response)) {
        throw new Error(`Contract simulation was not successful for function: ${functionName}`);
      }

      if (!response.result?.retval) {
        throw new Error(`Contract call returned no result for function: ${functionName}`);
      }

      Logger.info(`Contract call successful: ${functionName}`);
      
      // Return the result
      return response.result.retval;

    } catch (error: any) {
      Logger.error(`Contract call simulation failed for ${functionName}: ${error.message}`);
      
      // If it's an account not found error, provide more specific guidance
      if (error.message?.includes('Not Found') || error.message?.includes('not found')) {
        Logger.error('Account lookup failed. This could mean:');
        Logger.error('1. Admin account is not funded on testnet');
        Logger.error('2. Wrong network (should be testnet)');
        Logger.error('3. Invalid admin public key');
        Logger.error(`Admin account: ${this.adminKeypair?.publicKey()}`);
        Logger.error(`Network: ${this.networkPassphrase}`);
      }
      
      throw error;
    }
  }

  /**
   * Attempt to call the real smart contract
   */
  private async callRealContract(functionName: string, args: any[]): Promise<any> {
    // Validate prerequisites
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not available for contract calls');
    }

    if (!this.contractAddress) {
      throw new Error('Contract address not configured');
    }

    // For now, throw an error to force fallback to mock data
    // This will be implemented when we have a working contract deployment
    throw new Error('Real contract integration not yet implemented - using mock data');

    // TODO: Implement real contract call when ready
    // const contract = new StellarSdk.Contract(this.contractAddress);
    // const sourceAccount = await this.server.loadAccount(this.adminKeypair.publicKey());
    // const operation = contract.call(functionName, ...args);
    // ... rest of implementation
  }

  /**
   * Get mock responses for contract functions
   */
  private getMockContractResponse(functionName: string, args: any[]): any {
    const adminPublicKey = this.adminKeypair?.publicKey() || 'GC5SSXYUZTNVEXJHR7YWBSDNLLOMEDX67L7L3GQ2NUB7B4L2WIUY2JQ';
    
    switch (functionName) {
      case 'is_user_registered':
        return StellarSdk.nativeToScVal(false, { type: 'bool' });
      case 'get_winners':
        return StellarSdk.nativeToScVal([], { type: 'instance' });
      case 'get_quest':
        return StellarSdk.nativeToScVal({
          id: args[0],
          admin: adminPublicKey,
          reward_token: 'XLM',
          is_active: true
        }, { type: 'instance' });
      default:
        throw new Error(`Unknown contract function: ${functionName}`);
    }
  }

  /**
   * Generate a user-friendly quest title based on quest data
   */
  private generateQuestTitle(quest: any): string {
    if (quest.title) return quest.title;
    
    if (quest.quest_type?.TradeVolume) {
      return `Trading Volume Quest`;
    } else if (quest.quest_type?.PoolPosition) {
      return `Liquidity Provider Quest`;
    } else if (quest.quest_type?.TokenHold) {
      return `Token Hold Challenge`;
    }
    
    return `Quest #${quest.id}`;
  }

  /**
   * Generate a user-friendly quest description based on quest data
   */
  private generateQuestDescription(quest: any): string {
    if (quest.description) return quest.description;
    
    if (quest.quest_type?.TradeVolume) {
      return `Complete $${quest.quest_type.TradeVolume.toLocaleString()} in trading volume on Stellar DEX`;
    } else if (quest.quest_type?.PoolPosition) {
      return `Provide $${quest.quest_type.PoolPosition.toLocaleString()}+ liquidity to earn rewards`;
    } else if (quest.quest_type?.TokenHold) {
      const [token, amount] = quest.quest_type.TokenHold;
      return `Hold ${amount.toLocaleString()} ${token} tokens for the quest duration`;
    }
    
    return `Complete the quest requirements to earn ${quest.reward_per_winner} ${quest.reward_token}`;
  }

  /**
   * Get mock active quests for development/fallback
   */
  private getMockActiveQuests() {
    const adminPublicKey = this.adminKeypair?.publicKey() || 'GC5SSXYUZTNVEXJHR7YWBSDNLLOMEDX67L7L3GQ2NUB7B4L2WIUY2JQ';
    
    return [
      {
        id: 1,
        title: 'Trading Volume Quest',
        description: 'Complete $1000 in trading volume on Stellar DEX',
        admin: adminPublicKey,
        reward_token: 'USDC',
        reward_per_winner: 50,
        max_winners: 100,
        distribution: 'Fcfs',
        quest_type: { TradeVolume: 1000 },
        end_timestamp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        is_active: true,
        total_reward_pool: 5000
      },
      {
        id: 2,
        title: 'Liquidity Provider Quest',
        description: 'Provide $500+ liquidity to USDC/XLM pool for 24 hours',
        admin: adminPublicKey,
        reward_token: 'XLM',
        reward_per_winner: 100,
        max_winners: 50,
        distribution: 'Raffle',
        quest_type: { PoolPosition: 500 },
        end_timestamp: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        is_active: true,
        total_reward_pool: 5000
      },
      {
        id: 3,
        title: 'HODL Challenge',
        description: 'Hold 1000+ XLM tokens for the duration of the quest',
        admin: adminPublicKey,
        reward_token: 'XLM',
        reward_per_winner: 200,
        max_winners: 25,
        distribution: 'Fcfs',
        quest_type: { TokenHold: ['XLM', 1000] },
        end_timestamp: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days from now
        is_active: true,
        total_reward_pool: 5000
      }
    ];
  }
}

export default StellarWalletService;
