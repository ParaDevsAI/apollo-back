import { Keypair, Contract, SorobanRpc, Networks } from '@stellar/stellar-sdk';
import config from './index';

export class SorobanClient {
  private contract: Contract;
  private server: SorobanRpc.Server;
  private adminKeypair: Keypair;

  constructor() {
    this.server = new SorobanRpc.Server(config.rpcUrl);
    this.contract = new Contract(config.contractId);
    
    if (config.adminSecret) {
      this.adminKeypair = Keypair.fromSecret(config.adminSecret);
    } else {
      throw new Error('Admin secret key not configured');
    }
  }

  getContract(): Contract {
    return this.contract;
  }

  getServer(): SorobanRpc.Server {
    return this.server;
  }

  getAdminKeypair(): Keypair {
    return this.adminKeypair;
  }

  getNetworkPassphrase(): string {
    return config.networkPassphrase;
  }
}

export const sorobanClient = new SorobanClient();