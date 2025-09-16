import { Logger } from '../utils/logger';
import config from '../config';
import { WalletTransactionResult } from '../models/auth';
import * as StellarSdk from '@stellar/stellar-sdk';

class StellarWalletService {
  private readonly server: StellarSdk.Horizon.Server;
  private readonly sorobanServer: StellarSdk.rpc.Server;
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
    this.sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
    
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
      Logger.info('Validating signed transaction XDR', {
        xdrLength: signedXdr?.length,
        xdrPreview: signedXdr?.substring(0, 100) + '...',
        networkPassphrase: this.networkPassphrase
      });

      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      
      const validationResult = {
        hasSignatures: transaction.signatures.length > 0,
        signatureCount: transaction.signatures.length,
        operationCount: transaction.operations?.length || 0,
        fee: transaction.fee,
        source: (transaction as any).source || 'unknown'
      };

      Logger.info('Transaction validation result', validationResult);
      
      if (!validationResult.hasSignatures) {
        Logger.warn('Transaction has no signatures - validation failed');
      }

      return validationResult.hasSignatures;
    } catch (error: any) {
      Logger.error('Transaction validation failed', error);
      Logger.info('Failed XDR details', {
        xdrLength: signedXdr?.length,
        xdrType: typeof signedXdr,
        errorType: error?.constructor?.name,
        errorMessage: error?.message
      });
      return false;
    }
  }

  async submitSignedTransaction(signedXdr: string): Promise<WalletTransactionResult> {
    try {
      Logger.info('Submitting signed transaction to Stellar network', {
        xdrLength: signedXdr?.length,
        networkPassphrase: this.networkPassphrase
      });

      const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      
      Logger.info('Transaction parsed successfully', {
        signatureCount: transaction.signatures.length,
        operationCount: transaction.operations?.length || 0,
        fee: transaction.fee
      });

      // Check if this is a Soroban transaction (has invoke host function operations)
      const hasSorobanOps = transaction.operations.some(op => 
        op.type === 'invokeHostFunction'
      );

      let result;
      
      if (hasSorobanOps) {
        // Use Soroban RPC for smart contract transactions
        const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
        const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
        
        Logger.info('Submitting Soroban transaction via RPC', {
          rpcUrl,
          operationType: 'invokeHostFunction'
        });
        
        result = await sorobanServer.sendTransaction(transaction);
        
        Logger.info('Soroban transaction response', {
          status: result.status,
          hash: result.hash,
          errorResult: result.errorResult,
          fullResponse: result
        });
        
        if (result.status === 'PENDING') {
          Logger.info('Soroban transaction submitted, waiting for confirmation', {
            hash: result.hash,
            status: result.status
          });
          
          // Wait for transaction confirmation
          let attempts = 0;
          const maxAttempts = 30; // Increased from 15 to 30 (60 seconds total)
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            
            try {
              const txResult = await sorobanServer.getTransaction(result.hash);
              Logger.info(`Transaction check attempt ${attempts + 1}/${maxAttempts} - Status: ${txResult.status} - Hash: ${result.hash} - Time: ${(attempts + 1) * 2}s`);
              
              if (txResult.status === 'SUCCESS') {
                Logger.info(`Soroban transaction confirmed successfully - Hash: ${result.hash} - Status: ${txResult.status}`);
                
                return {
                  success: true,
                  hash: result.hash,
                  createdAt: new Date()
                };
              } else if (txResult.status === 'FAILED') {
                Logger.error(`Transaction failed with status: ${txResult.status}`);
                const errorDetails = txResult.resultXdr || JSON.stringify(txResult);
                throw new Error(`Soroban transaction failed after confirmation: ${errorDetails}`);
              }
              
              attempts++;
            } catch (error: any) {
              Logger.warn(`Error checking transaction status (attempt ${attempts + 1}/${maxAttempts}): ${error.message || error}`);
              attempts++;
            }
          }
          
          throw new Error('Transaction timeout - unable to confirm within expected time');
        } else {
          const errorDetails = result.errorResult ? JSON.stringify(result.errorResult) : 'No error details available';
          throw new Error(`Soroban transaction failed with status: ${result.status}, details: ${errorDetails}`);
        }
      } else {
        // Use Horizon for regular Stellar transactions
        Logger.info('Submitting regular transaction via Horizon');
        result = await this.server.submitTransaction(transaction);
        
        Logger.info('Transaction submitted successfully to Stellar network', {
          hash: result.hash,
          ledger: result.ledger,
          successful: result.successful
        });
        
        return {
          success: true,
          hash: result.hash,
          createdAt: new Date()
        };
      }
    } catch (error: any) {
      Logger.error('Transaction submission failed', error);
      Logger.info('Failed transaction details', {
        xdrLength: signedXdr?.length,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorCode: error?.response?.status,
        errorData: error?.response?.data
      });
      throw new Error(`Transaction submission failed: ${error.message}`);
    }
  }

  async buildQuestRegistrationTransaction(userAddress: string, questId: number): Promise<string> {
    try {
      Logger.info('Building quest registration transaction', {
        userAddress,
        questId,
        contractAddress: this.contractAddress,
        networkPassphrase: this.networkPassphrase
      });

      const account = await this.server.loadAccount(userAddress);
      Logger.info('User account loaded successfully', {
        accountId: account.accountId(),
        sequenceNumber: account.sequenceNumber()
      });

      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.register(quest_id, user_address)  
      const operation = contract.call(
        'register',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' }),
          new StellarSdk.Address(userAddress).toScVal()
        ]
      );

      // Build initial transaction for simulation
      const initialTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simulate transaction to get required resources
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      
      Logger.info('Simulating Soroban transaction for resources', {
        rpcUrl,
        operationType: 'invokeHostFunction'
      });
      
      const simulation = await sorobanServer.simulateTransaction(initialTransaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        Logger.error('Simulation failed: ' + simulation.error);
        throw new Error(`Transaction simulation failed: ${simulation.error}`);
      }

      Logger.info('Simulation successful', {
        minResourceFee: simulation.minResourceFee
      });

      // Build final transaction with simulation results
      const assembledTransaction = StellarSdk.rpc.assembleTransaction(
        initialTransaction,
        simulation
      ).build();

      const xdr = assembledTransaction.toXDR();
      Logger.info('Quest registration transaction built successfully', {
        userAddress,
        questId,
        xdrLength: xdr.length,
        operationCount: assembledTransaction.operations.length,
        fee: assembledTransaction.fee,
        resourceFee: simulation.minResourceFee
      });
      
      return xdr;
    } catch (error: any) {
      Logger.error('Failed to build quest registration transaction', error);
      Logger.info('Build transaction error details', {
        userAddress,
        questId,
        contractAddress: this.contractAddress,
        errorType: error?.constructor?.name,
        errorMessage: error?.message
      });
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
      return Number(obj.toString()); // Convert to Number for better frontend handling
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigIntForJson(item));
    }
    
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        try {
          serialized[key] = this.serializeBigIntForJson(value);
        } catch (error) {
          // If serialization fails, convert to string as fallback
          Logger.warn(`Failed to serialize key ${key}, using string fallback`, error);
          serialized[key] = typeof value === 'bigint' ? value.toString() : String(value);
        }
      }
      return serialized;
    }
    
    return obj;
  }

  /**
   * Get all active quests
   */
  async getActiveQuests(): Promise<any[]> {
    try {
      const result = await this.simulateContractCall('get_active_quests', []);
      
      // Convert ScVal to native with special handling for BigInt values
      const quests = this.convertScValToNativeWithBigIntHandling(result);
      
      // Ensure all BigInt values are serializable as strings
      const serializableQuests = this.serializeBigIntForJson(quests);
      
      Logger.info(`Retrieved ${Array.isArray(serializableQuests) ? serializableQuests.length : 0} active quests from smart contract`);
      return Array.isArray(serializableQuests) ? serializableQuests : [];
    } catch (error: any) {
      Logger.error('Failed to get active quests from smart contract:', error);
      
      // If it's a BigInt serialization error, log it specifically
      if (error.message?.includes('BigInt')) {
        Logger.error('BigInt conversion error - this is a known issue with Stellar SDK ScVal conversion');
        Logger.error('Raw contract response was successful but conversion failed');
      }
      
      Logger.warn('Returning empty quest list due to contract call failure');
      
      // Return empty array instead of throwing error to allow frontend to handle gracefully
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
        try {
          const v: any = scVal._value ?? scVal;

          // shape: { _value: '14' }
          if (typeof v === 'string') return Number(v);

          // shape: { _value: { _value: '14' } }
          if (v._value && typeof v._value === 'string') return Number(v._value);
          if (v._value && v._value._value) return Number(v._value._value);

          // shape with attributes: { _attributes: { lo: { _value: '14' } } }
          if (v._attributes && v._attributes.lo && v._attributes.lo._value) {
            return Number(v._attributes.lo._value);
          }

          // numeric fallback
          const asNumber = Number(JSON.stringify(v).replace(/[^0-9]/g, ''));
          if (!Number.isNaN(asNumber)) return asNumber;
        } catch (e) {
          Logger.warn('scvU64 parsing fallback triggered', e);
        }

        return 0;
      
      case 'scvU128':
        try {
          const attrs = scVal._value?._attributes ?? scVal._attributes ?? {};
          const hiRaw = attrs.hi?._value ?? attrs.hi ?? '0';
          const loRaw = attrs.lo?._value ?? attrs.lo ?? '0';

          const hi = BigInt((hiRaw && typeof hiRaw === 'string') ? hiRaw : (hiRaw._value ?? '0'));
          const lo = BigInt((loRaw && typeof loRaw === 'string') ? loRaw : (loRaw._value ?? '0'));

          // Combine hi/lo into a BigInt and convert to Number when safe
          const combined = (hi << BigInt(64)) + lo;
          const num = Number(combined);
          if (!Number.isNaN(num) && Number.isFinite(num)) return num;
        } catch (e) {
          Logger.warn('scvU128 parsing fallback triggered', e);
        }

        // Fallback: try to extract numeric characters
        try {
          const text = JSON.stringify(scVal);
          const digits = text.replace(/[^0-9]/g, '');
          return digits ? Number(digits) : 0;
        } catch {
          return 0;
        }
      
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
      const result = await this.sorobanServer.sendTransaction(transaction);
      
      Logger.info(`Marked user ${userAddress} as eligible for quest ${questId}`);
      return result.status === 'PENDING';
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
      // Create a proper Soroban RPC server instance
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      
      // Simulate the transaction (read-only call)
      const response = await sorobanServer.simulateTransaction(transaction);
      
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

  /**
   * Build transaction to mark user as eligible for a quest
   */
  async buildVerifyQuestTransaction(userAddress: string, questId: number): Promise<string> {
    try {
      Logger.info('Building verify quest transaction', {
        userAddress,
        questId,
        contractAddress: this.contractAddress,
        networkPassphrase: this.networkPassphrase
      });

      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }
      const account = await this.server.loadAccount(this.adminKeypair.publicKey());
      Logger.info('Admin account loaded for verification', {
        accountId: account.accountId(),
        sequenceNumber: account.sequenceNumber()
      });

      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.mark_user_eligible(quest_id, user_address)  
      const operation = contract.call(
        'mark_user_eligible',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' }),
          new StellarSdk.Address(userAddress).toScVal()
        ]
      );

      // Build initial transaction for simulation
      const initialTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simulate transaction to get required resources
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      
      Logger.info('Simulating verify quest transaction for resources', {
        rpcUrl,
        operationType: 'mark_user_eligible'
      });
      
      const simulation = await sorobanServer.simulateTransaction(initialTransaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        Logger.error('Verify simulation failed: ' + simulation.error);
        throw new Error(`Verify transaction simulation failed: ${simulation.error}`);
      }

      Logger.info('Verify simulation successful', {
        minResourceFee: simulation.minResourceFee
      });

      // Build final transaction with simulation results
      const assembledTransaction = StellarSdk.rpc.assembleTransaction(
        initialTransaction,
        simulation
      ).build();

      const xdr = assembledTransaction.toXDR();
      Logger.info('Verify quest transaction built successfully', {
        userAddress,
        questId,
        xdrLength: xdr.length,
        operationCount: assembledTransaction.operations.length,
        fee: assembledTransaction.fee,
        resourceFee: simulation.minResourceFee
      });
      
      return xdr;
    } catch (error: any) {
      Logger.error('Failed to build verify quest transaction', error);
      Logger.info('Build verify transaction error details', {
        userAddress,
        questId,
        contractAddress: this.contractAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Submit verify quest transaction (marks user as eligible)
   */
  async verifyQuestCompletion(userAddress: string, questId: number): Promise<any> {
    try {
      Logger.info('Starting verify quest completion process', {
        userAddress,
        questId
      });

      // Build the transaction
      const transactionXdr = await this.buildVerifyQuestTransaction(userAddress, questId);
      
      // Sign with admin keypair (since only admin can mark users eligible)
      const transaction = StellarSdk.TransactionBuilder.fromXDR(transactionXdr, this.networkPassphrase);
      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }
      transaction.sign(this.adminKeypair);

      // Submit the signed transaction
      const result = await this.submitSignedTransaction(transaction.toXDR());

      Logger.info('Verify quest transaction submitted successfully', {
        userAddress,
        questId,
        transactionHash: result.hash
      });

      return {
        success: true,
        verified: true,
        questId,
        userAddress,
        transactionHash: result.hash,
        message: 'Quest completion verified successfully!'
      };

    } catch (error: any) {
      Logger.error('Failed to verify quest completion', error);
      throw new Error(`Verify quest completion failed: ${error.message}`);
    }
  }

  /**
   * Build transaction to distribute rewards for demo (allows active quests)
   */
  async buildClaimRewardsDemoTransaction(questId: number, winner: string): Promise<string> {
    try {
      Logger.info('Building claim rewards demo transaction', {
        questId,
        winner,
        contractAddress: this.contractAddress,
        networkPassphrase: this.networkPassphrase
      });

      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }
      const account = await this.server.loadAccount(this.adminKeypair.publicKey());
      Logger.info('Admin account loaded for rewards distribution', {
        accountId: account.accountId(),
        sequenceNumber: account.sequenceNumber()
      });

      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.distribute_rewards_demo(quest_id, winner)  
      const operation = contract.call(
        'distribute_rewards_demo',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' }),
          StellarSdk.Address.fromString(winner).toScVal()
        ]
      );

      // Build initial transaction for simulation
      const initialTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simulate transaction to get required resources
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      
      Logger.info('Simulating demo claim rewards transaction for resources', {
        rpcUrl,
        operationType: 'distribute_rewards_demo'
      });
      
      const simulation = await sorobanServer.simulateTransaction(initialTransaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        Logger.error('Demo claim simulation failed: ' + simulation.error);
        throw new Error(`Demo claim transaction simulation failed: ${simulation.error}`);
      }

      Logger.info('Demo claim simulation successful', {
        minResourceFee: simulation.minResourceFee
      });

      // Build final transaction with simulation results
      const assembledTransaction = StellarSdk.rpc.assembleTransaction(
        initialTransaction,
        simulation
      ).build();

      const xdr = assembledTransaction.toXDR();
      Logger.info('Demo claim rewards transaction built successfully', {
        questId,
        winner,
        xdrLength: xdr.length
      });

      return xdr;

    } catch (error: any) {
      Logger.error('Failed to build demo claim rewards transaction', error);
      throw new Error(`Build demo claim transaction failed: ${error.message}`);
    }
  }

  /**
   * Build transaction to distribute rewards for a quest
   */
  async buildClaimRewardsTransaction(questId: number): Promise<string> {
    try {
      Logger.info('Building claim rewards transaction', {
        questId,
        contractAddress: this.contractAddress,
        networkPassphrase: this.networkPassphrase
      });

      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }
      const account = await this.server.loadAccount(this.adminKeypair.publicKey());
      Logger.info('Admin account loaded for rewards distribution', {
        accountId: account.accountId(),
        sequenceNumber: account.sequenceNumber()
      });

      const contract = new StellarSdk.Contract(this.contractAddress);
      
      // Build operation to call contract.distribute_rewards(quest_id)  
      const operation = contract.call(
        'distribute_rewards',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' })
        ]
      );

      // Build initial transaction for simulation
      const initialTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simulate transaction to get required resources
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      
      Logger.info('Simulating claim rewards transaction for resources', {
        rpcUrl,
        operationType: 'distribute_rewards'
      });
      
      const simulation = await sorobanServer.simulateTransaction(initialTransaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        Logger.error('Claim simulation failed: ' + simulation.error);
        throw new Error(`Claim transaction simulation failed: ${simulation.error}`);
      }

      Logger.info('Claim simulation successful', {
        minResourceFee: simulation.minResourceFee
      });

      // Build final transaction with simulation results
      const assembledTransaction = StellarSdk.rpc.assembleTransaction(
        initialTransaction,
        simulation
      ).build();

      const xdr = assembledTransaction.toXDR();
      Logger.info('Claim rewards transaction built successfully', {
        questId,
        xdrLength: xdr.length,
        operationCount: assembledTransaction.operations.length,
        fee: assembledTransaction.fee,
        resourceFee: simulation.minResourceFee
      });
      
      return xdr;
    } catch (error: any) {
      Logger.error('Failed to build claim rewards transaction', error);
      Logger.info('Build claim transaction error details', {
        questId,
        contractAddress: this.contractAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resolve quest and distribute rewards (DEMO VERSION - MOCKED)
   */
  async claimQuestRewards(questId: number, userAddress?: string): Promise<any> {
    try {
      Logger.info('Starting MOCK claim quest rewards process for demo', {
        questId,
        userAddress
      });

      // MOCK IMPLEMENTATION FOR DEMO
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockTransactionHash = `mock_claim_${questId}_${Date.now()}`;

      Logger.info('MOCK claim quest rewards completed successfully', {
        questId,
        userAddress,
        mockTransactionHash
      });

      return {
        success: true,
        claimed: true,
        questId,
        transactionHash: mockTransactionHash,
        message: 'Quest rewards distributed successfully! (Demo Mode)'
      };

    } catch (error: any) {
      Logger.error('Failed to mock claim quest rewards', error);
      throw new Error(`Mock claim quest rewards failed: ${error.message}`);
    }
  }

  /**
   * Build transaction to resolve a quest (finalize and select winners)
   */
  async buildResolveQuestTransaction(questId: number): Promise<string> {
    try {
      Logger.info('Building resolve quest transaction', {
        questId,
        contractAddress: this.contractAddress
      });

      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }
      const account = await this.server.loadAccount(this.adminKeypair.publicKey());
      const contract = new StellarSdk.Contract(this.contractAddress);
      
      const operation = contract.call(
        'resolve_quest',
        ...[
          StellarSdk.nativeToScVal(questId, { type: 'u64' })
        ]
      );

      const initialTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simulate transaction
      const rpcUrl = config.stellar?.rpcUrl || 'https://soroban-testnet.stellar.org:443';
      const sorobanServer = new StellarSdk.rpc.Server(rpcUrl);
      const simulation = await sorobanServer.simulateTransaction(initialTransaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        Logger.error('Resolve simulation failed: ' + simulation.error);
        throw new Error(`Resolve transaction simulation failed: ${simulation.error}`);
      }

      const assembledTransaction = StellarSdk.rpc.assembleTransaction(
        initialTransaction,
        simulation
      ).build();

      return assembledTransaction.toXDR();
    } catch (error: any) {
      Logger.error('Failed to build resolve quest transaction', error);
      throw error;
    }
  }
}

export default StellarWalletService;
