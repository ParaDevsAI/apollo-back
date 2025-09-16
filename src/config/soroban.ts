import { Keypair, Contract, rpc, Networks } from '@stellar/stellar-sdk';
import config from './index';

export class SorobanClient {
  private contract: Contract;
  private server: rpc.Server;
  private adminKeypair: Keypair;

  constructor() {
    this.server = new rpc.Server(config.rpcUrl);
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

  getServer(): rpc.Server {
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