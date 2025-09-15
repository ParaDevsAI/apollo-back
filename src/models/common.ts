export interface SorobanTransaction {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  gas_used?: string;
  error_message?: string;
}

export interface ContractCallResult<T = any> {
  success: boolean;
  result?: T;
  transaction?: SorobanTransaction;
  error?: string;
}

export interface NetworkInfo {
  network_passphrase: string;
  rpc_url: string;
  contract_id: string;
  latest_ledger: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    soroban_rpc: boolean;
    contract: boolean;
  };
  version: string;
}