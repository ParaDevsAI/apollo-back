import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Stellar/Soroban Configuration
  stellar: {
    contractId: process.env.CONTRACT_ID || '',
    networkPassphrase: process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    rpcUrl: process.env.RPC_URL || 'https://soroban-testnet.stellar.org:443',
  },
  
  // Legacy config (keep for compatibility)
  contractId: process.env.CONTRACT_ID || '',
  networkPassphrase: process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  rpcUrl: process.env.RPC_URL || 'https://soroban-testnet.stellar.org:443',
  
  // Admin Configuration
  adminSecret: process.env.ADMIN_SECRET || '',
  adminPublicKey: process.env.ADMIN_PUBLIC_KEY || '',

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'apollo-secret-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',

  // API Configuration
  apiPrefix: '/api/v1',
  
  // Rate Limiting
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // Max requests per window

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Kale Passkey-Kit Configuration
  kale: {
    walletWasmHash: process.env.KALE_WALLET_WASM_HASH || '',
    timeoutInSeconds: parseInt(process.env.KALE_TIMEOUT_SECONDS || '30'),
    launchtubeUrl: process.env.KALE_LAUNCHTUBE_URL || '',
    launchtubeJwt: process.env.KALE_LAUNCHTUBE_JWT || '',
    mercuryProjectName: process.env.KALE_MERCURY_PROJECT_NAME || '',
    mercuryUrl: process.env.KALE_MERCURY_URL || '',
    mercuryJwt: process.env.KALE_MERCURY_JWT || '',
    mercuryKey: process.env.KALE_MERCURY_KEY || ''
  },

  // Legacy Mercury/Zephyr Configuration (deprecated)
  mercuryApiUrl: process.env.MERCURY_API_URL || 'https://api.mercury.org',
  mercuryApiKey: process.env.MERCURY_API_KEY || '',
  zephyrContractId: process.env.ZEPHYR_CONTRACT_ID || '',
  frontendDomain: process.env.FRONTEND_DOMAIN || 'localhost',
};

export default config;