import { SorobanRpc, Keypair, TransactionBuilder, Contract, Address, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';
import config from '../config/index.js';
import { Logger } from '../utils/logger.js';
import { DistributionType } from '../models/quest.js';
export class QuestManagerService {
    server;
    contract;
    networkPassphrase;
    constructor() {
        this.networkPassphrase = config.stellar.networkPassphrase;
        this.server = new SorobanRpc.Server(config.stellar.rpcUrl);
        this.contract = new Contract(config.stellar.questManagerContractId);
    }
    /**
     * Cria uma nova quest
     */
    async createQuest(adminSecret, questData) {
        try {
            const adminKeypair = Keypair.fromSecret(adminSecret);
            const adminAddress = adminKeypair.publicKey();
            // Preparar parâmetros do contrato
            const params = [
                new Address(adminAddress).toScVal(),
                new Address(questData.reward_token).toScVal(),
                nativeToScVal(questData.reward_per_winner, { type: 'u128' }),
                nativeToScVal(questData.max_winners, { type: 'u32' }),
                this.distributionTypeToScVal(questData.distribution),
                this.questTypeToScVal(questData.quest_type),
                nativeToScVal(questData.end_timestamp, { type: 'u64' }),
                nativeToScVal(questData.total_reward_pool, { type: 'u128' }),
                nativeToScVal(questData.title, { type: 'string' }),
                nativeToScVal(questData.description, { type: 'string' })
            ];
            const operation = this.contract.call('create_quest', ...params);
            const account = await this.server.getAccount(adminAddress);
            const transaction = new TransactionBuilder(account, {
                fee: '100000',
                networkPassphrase: this.networkPassphrase
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();
            transaction.sign(adminKeypair);
            const response = await this.server.sendTransaction(transaction);
            if (response.status === 'PENDING') {
                // Aguardar confirmação
                const finalResult = await this.server.getTransaction(response.hash);
                if (finalResult.status === 'SUCCESS') {
                    // Extrair o ID da quest do resultado
                    const questId = this.extractQuestIdFromResult(finalResult);
                    Logger.info('Quest criada com sucesso', { questId, admin: adminAddress });
                    return { success: true, questId };
                }
            }
            throw new Error(`Transaction failed: ${response.status}`);
        }
        catch (error) {
            Logger.error('Erro ao criar quest', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Registra um usuário em uma quest
     */
    async registerForQuest(userSecret, questId) {
        try {
            const userKeypair = Keypair.fromSecret(userSecret);
            const userAddress = userKeypair.publicKey();
            const operation = this.contract.call('register', nativeToScVal(questId, { type: 'u64' }), new Address(userAddress).toScVal());
            const account = await this.server.getAccount(userAddress);
            const transaction = new TransactionBuilder(account, {
                fee: '100000',
                networkPassphrase: this.networkPassphrase
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();
            transaction.sign(userKeypair);
            const response = await this.server.sendTransaction(transaction);
            if (response.status === 'PENDING') {
                Logger.info('Usuário registrado na quest', { questId, user: userAddress });
                return { success: true };
            }
            throw new Error(`Registration failed: ${response.status}`);
        }
        catch (error) {
            Logger.error('Erro ao registrar usuário na quest', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Busca uma quest por ID
     */
    async getQuest(questId) {
        try {
            const operation = this.contract.call('get_quest', nativeToScVal(questId, { type: 'u64' }));
            // Simular a chamada (read-only)
            const account = await this.server.getAccount(config.stellar.questManagerContractId);
            const transaction = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: this.networkPassphrase
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();
            const response = await this.server.simulateTransaction(transaction);
            // Simplificação temporária - retornar mock data para desenvolvimento
            if (response.error) {
                throw new Error(response.error);
            }
            // TODO: Implementar parsing correto do resultado
            return this.getMockQuest(questId);
        }
        catch (error) {
            Logger.error('Erro ao buscar quest', error);
            return null;
        }
    }
    /**
     * Lista quests ativas
     */
    async getActiveQuests() {
        try {
            const operation = this.contract.call('get_active_quests');
            const account = await this.server.getAccount(config.stellar.questManagerContractId);
            const transaction = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: this.networkPassphrase
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();
            const response = await this.server.simulateTransaction(transaction);
            if (response.results && response.results[0]) {
                const questsData = scValToNative(response.results[0].xdr);
                return questsData.map((quest) => this.formatQuestData(quest));
            }
            return [];
        }
        catch (error) {
            Logger.error('Erro ao buscar quests ativas', error);
            return [];
        }
    }
    /**
     * Verifica se usuário está registrado em uma quest
     */
    async isUserRegistered(questId, userAddress) {
        try {
            const operation = this.contract.call('is_user_registered', nativeToScVal(questId, { type: 'u64' }), new Address(userAddress).toScVal());
            const account = await this.server.getAccount(config.stellar.questManagerContractId);
            const transaction = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: this.networkPassphrase
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();
            const response = await this.server.simulateTransaction(transaction);
            if (response.results && response.results[0]) {
                return scValToNative(response.results[0].xdr);
            }
            return false;
        }
        catch (error) {
            Logger.error('Erro ao verificar registro do usuário', error);
            return false;
        }
    }
    // Métodos auxiliares privados
    distributionTypeToScVal(distribution) {
        switch (distribution) {
            case DistributionType.RAFFLE:
                return nativeToScVal('Raffle', { type: 'symbol' });
            case DistributionType.FCFS:
                return nativeToScVal('Fcfs', { type: 'symbol' });
            default:
                throw new Error(`Tipo de distribuição não suportado: ${distribution}`);
        }
    }
    questTypeToScVal(questType) {
        switch (questType.type) {
            case 'TradeVolume':
                return nativeToScVal(['TradeVolume', questType.value], { type: 'instance' });
            case 'PoolPosition':
                return nativeToScVal(['PoolPosition', questType.value], { type: 'instance' });
            case 'TokenHold':
                return nativeToScVal(['TokenHold', questType.tokenAddress, questType.amount], { type: 'instance' });
            default:
                throw new Error(`Tipo de quest não suportado: ${questType.type}`);
        }
    }
    formatQuestData(questData) {
        return {
            id: questData.id.toString(),
            admin: questData.admin,
            reward_token: questData.reward_token,
            reward_per_winner: questData.reward_per_winner.toString(),
            max_winners: questData.max_winners,
            distribution: questData.distribution === 'Raffle' ? DistributionType.RAFFLE : DistributionType.FCFS,
            quest_type: this.formatQuestType(questData.quest_type),
            end_timestamp: questData.end_timestamp,
            is_active: questData.is_active,
            total_reward_pool: questData.total_reward_pool.toString(),
            title: questData.title,
            description: questData.description
        };
    }
    formatQuestType(questTypeData) {
        const [type, ...params] = questTypeData;
        switch (type) {
            case 'TradeVolume':
                return { type: 'TradeVolume', value: params[0]?.toString() };
            case 'PoolPosition':
                return { type: 'PoolPosition', value: params[0]?.toString() };
            case 'TokenHold':
                return {
                    type: 'TokenHold',
                    tokenAddress: params[0],
                    amount: params[1]?.toString()
                };
            default:
                throw new Error(`Tipo de quest desconhecido: ${type}`);
        }
    }
    extractQuestIdFromResult(result) {
        // Implementação simplificada - extrair do resultado da transação
        try {
            // O ID da quest geralmente está no evento ou retorno da função
            return result.id || Math.random().toString();
        }
        catch {
            return Math.random().toString();
        }
    }
}
//# sourceMappingURL=questManagerService.js.map