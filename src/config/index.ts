import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'apollo-quest-manager-secret-key',
  jwtExpiration: (process.env.JWT_EXPIRATION || '24h') as string,

  // Stellar Configuration
  stellar: {
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443',
    questManagerContractId: process.env.QUEST_MANAGER_CONTRACT_ID || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP por janela
  }
};

export default config;
