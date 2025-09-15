import { 
  Contract, 
  SorobanRpc, 
  TransactionBuilder, 
  Operation, 
  Keypair,
  Address,
  nativeToScVal,
  scValToNative
} from '@stellar/stellar-sdk';
import { sorobanClient } from '../config/soroban';
import { Logger } from '../utils/logger';
import { Quest, QuestStatus, QuestParticipant, ContractCallResult } from '../models';

export class QuestService {
  private contract: Contract;
  private server: SorobanRpc.Server;
  private adminKeypair: Keypair;

  constructor() {
    this.contract = sorobanClient.getContract();
    this.server = sorobanClient.getServer();
    this.adminKeypair = sorobanClient.getAdminKeypair();
  }

  async createQuest(questData: Omit<Quest, 'id' | 'status' | 'participants_count' | 'winners_count'>): Promise<ContractCallResult<number>> {
    try {
      Logger.info('Creating quest', questData);

      // Build transaction
      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      const contract = this.contract;
      
      const operation = contract.call(
        'create_quest',
        nativeToScVal(questData.title, { type: 'string' }),
        nativeToScVal(questData.description, { type: 'string' }),
        nativeToScVal(questData.creator, { type: 'string' }),
        nativeToScVal(questData.reward_token, { type: 'string' }),
        nativeToScVal(questData.reward_amount, { type: 'string' }),
        nativeToScVal(questData.max_participants, { type: 'u64' }),
        nativeToScVal(questData.start_time, { type: 'u64' }),
        nativeToScVal(questData.end_time, { type: 'u64' }),
        nativeToScVal(questData.quest_type, { type: 'string' }),
        nativeToScVal(questData.conditions, { type: 'map' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        const questId = scValToNative(response.returnValue);
        Logger.info('Quest created successfully', { questId });
        return { success: true, result: questId };
      } else {
        Logger.error('Failed to create quest', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error creating quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getQuest(questId: number): Promise<ContractCallResult<Quest>> {
    try {
      Logger.debug('Getting quest', { questId });

      const response = await this.contract.call('get_quest', 
        nativeToScVal(questId, { type: 'u64' })
      );

      if (response) {
        const quest = scValToNative(response) as Quest;
        Logger.debug('Quest retrieved successfully', { questId });
        return { success: true, result: quest };
      } else {
        return { success: false, error: 'Quest not found' };
      }
    } catch (error) {
      Logger.error('Error getting quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getActiveQuests(): Promise<ContractCallResult<Quest[]>> {
    try {
      Logger.debug('Getting active quests');

      const response = await this.contract.call('get_active_quests');

      if (response) {
        const quests = scValToNative(response) as Quest[];
        Logger.debug('Active quests retrieved successfully', { count: quests.length });
        return { success: true, result: quests };
      } else {
        return { success: true, result: [] };
      }
    } catch (error) {
      Logger.error('Error getting active quests', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async registerUser(questId: number, userAddress: string): Promise<ContractCallResult<boolean>> {
    try {
      Logger.info('Registering user for quest', { questId, userAddress });

      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      
      const operation = this.contract.call(
        'register_user',
        nativeToScVal(questId, { type: 'u64' }),
        nativeToScVal(userAddress, { type: 'string' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        Logger.info('User registered successfully', { questId, userAddress });
        return { success: true, result: true };
      } else {
        Logger.error('Failed to register user', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error registering user', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async markUserEligible(questId: number, userAddress: string): Promise<ContractCallResult<boolean>> {
    try {
      Logger.info('Marking user as eligible', { questId, userAddress });

      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      
      const operation = this.contract.call(
        'mark_eligible',
        nativeToScVal(questId, { type: 'u64' }),
        nativeToScVal(userAddress, { type: 'string' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        Logger.info('User marked as eligible successfully', { questId, userAddress });
        return { success: true, result: true };
      } else {
        Logger.error('Failed to mark user as eligible', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error marking user as eligible', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async resolveQuest(questId: number): Promise<ContractCallResult<boolean>> {
    try {
      Logger.info('Resolving quest', { questId });

      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      
      const operation = this.contract.call(
        'resolve_quest',
        nativeToScVal(questId, { type: 'u64' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        Logger.info('Quest resolved successfully', { questId });
        return { success: true, result: true };
      } else {
        Logger.error('Failed to resolve quest', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error resolving quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async cancelQuest(questId: number): Promise<ContractCallResult<boolean>> {
    try {
      Logger.info('Cancelling quest', { questId });

      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      
      const operation = this.contract.call(
        'cancel_quest',
        nativeToScVal(questId, { type: 'u64' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        Logger.info('Quest cancelled successfully', { questId });
        return { success: true, result: true };
      } else {
        Logger.error('Failed to cancel quest', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error cancelling quest', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getQuestParticipants(questId: number): Promise<ContractCallResult<QuestParticipant[]>> {
    try {
      Logger.debug('Getting quest participants', { questId });

      const response = await this.contract.call('get_participants',
        nativeToScVal(questId, { type: 'u64' })
      );

      if (response) {
        const participants = scValToNative(response) as QuestParticipant[];
        Logger.debug('Quest participants retrieved successfully', { questId, count: participants.length });
        return { success: true, result: participants };
      } else {
        return { success: true, result: [] };
      }
    } catch (error) {
      Logger.error('Error getting quest participants', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async distributeRewards(questId: number): Promise<ContractCallResult<boolean>> {
    try {
      Logger.info('Distributing rewards for quest', { questId });

      const account = await this.server.getAccount(this.adminKeypair.publicKey());
      
      const operation = this.contract.call(
        'distribute_rewards',
        nativeToScVal(questId, { type: 'u64' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: sorobanClient.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      transaction.sign(this.adminKeypair);

      const response = await this.server.sendTransaction(transaction);
      
      if (response.status === 'SUCCESS') {
        Logger.info('Rewards distributed successfully', { questId });
        return { success: true, result: true };
      } else {
        Logger.error('Failed to distribute rewards', new Error(response.errorResult?.toString()));
        return { success: false, error: response.errorResult?.toString() };
      }
    } catch (error) {
      Logger.error('Error distributing rewards', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

export const questService = new QuestService();