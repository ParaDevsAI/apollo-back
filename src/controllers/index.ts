export * from './questController';
export * from './userController';
export * from './healthController';

// Deprecated AuthController - now handled by Stellar Wallets Kit
export class AuthController {
  async createPasskeyWallet() { throw new Error('Deprecated: Use Stellar Wallets Kit'); }
  async connectPasskeyWallet() { throw new Error('Deprecated: Use Stellar Wallets Kit'); }
  async registerForQuestWithPasskey() { throw new Error('Deprecated: Use Stellar Wallets Kit'); }
  async claimRewardsWithPasskey() { throw new Error('Deprecated: Use Stellar Wallets Kit'); }
  async getWalletSigners() { throw new Error('Deprecated: Use Stellar Wallets Kit'); }
}

export const authController = new AuthController();