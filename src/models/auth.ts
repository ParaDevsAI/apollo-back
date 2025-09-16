// Kale passkey-kit models

export interface PasskeyCredentials {
  keyId: string;
  keyIdBase64: string;
  publicKey: string;
  contractId: string;
  rawResponse?: any;
}

export interface PasskeyWalletOptions {
  rpcUrl: string;
  networkPassphrase: string;
  walletWasmHash: string;
  timeoutInSeconds?: number;
}

export interface PasskeyServerOptions {
  rpcUrl?: string;
  launchtubeUrl?: string;
  launchtubeJwt?: string;
  launchtubeHeaders?: Record<string, string>;
  mercuryProjectName?: string;
  mercuryUrl?: string;
  mercuryJwt?: string;
  mercuryKey?: string;
}

export interface PasskeyUser {
  id: string;
  contractId: string;
  publicKey: string;
  keyId: string;
  keyIdBase64: string;
  createdAt: Date;
  lastLoginAt?: Date;
  appName?: string;
  userName?: string;
}

export interface PasskeyAuthResult {
  success: boolean;
  user: PasskeyUser;
  credentials: PasskeyCredentials;
  signedTransaction?: string;
}

export interface SignerConfig {
  tag: 'Secp256r1' | 'Ed25519' | 'Policy';
  keyId?: string | Uint8Array;
  publicKey?: string | Uint8Array;
  policy?: string;
  limits?: SignerLimits;
  store?: 'Persistent' | 'Temporary';
  expiration?: number;
}

export interface SignerLimits {
  [contractAddress: string]: SignerKey[] | undefined;
}

export interface SignerKey {
  tag: 'Policy' | 'Ed25519' | 'Secp256r1';
  value: string;
}

export interface PasskeyRegistrationRequest {
  appName: string;
  userName: string;
  rpId?: string;
}

export interface PasskeyAuthenticationRequest {
  keyId?: string;
  contractId?: string;
  rpId?: string;
}

export interface PasskeyTransactionRequest {
  contractId: string;
  operation: string;
  params?: any;
  keyId?: string;
  rpId?: string;
}

// -----------------------------------------
// Stellar Wallets Kit models
// -----------------------------------------

/**
 * Tipos de carteira suportados pelo Stellar Wallets Kit
 */
export enum WalletType {
  ALBEDO = 'albedo',
  FREIGHTER = 'freighter',
  XBULL = 'xbull',
  RABET = 'rabet',
  WALLET_CONNECT = 'walletconnect',
  LEDGER = 'ledger',
  TREZOR = 'trezor',
  PRIVATE_KEY = 'privatekey',
  PASSKEY = 'passkey'
}

/**
 * Parâmetros para conexão com carteira
 */
export interface StellarWalletConnection {
  walletType: WalletType;
  userName?: string;
  params?: Record<string, any>;
}

/**
 * Informações da carteira conectada
 */
export interface StellarWallet {
  publicKey: string;
  type: WalletType;
  network: string;
}

/**
 * Usuário autenticado com carteira Stellar
 */
export interface WalletUser {
  id: string;
  userName?: string;
  publicKey: string;
  walletType: WalletType;
  connectedAt: Date;
}

/**
 * Resultado da autenticação com carteira
 */
export interface WalletAuthResult {
  success: boolean;
  user: WalletUser;
  wallet: StellarWallet;
  error?: string;
}

/**
 * Resultado de uma transação com carteira
 */
export interface WalletTransactionResult {
  success: boolean;
  hash?: string;
  ledger?: number;
  createdAt?: Date;
  error?: string;
}