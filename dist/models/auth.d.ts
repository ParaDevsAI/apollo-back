export interface StellarWallet {
    publicKey: string;
    address: string;
    walletType: 'freighter' | 'albedo' | 'rabet' | 'lobstr' | 'xbull';
}
export interface WalletInfo {
    id: string;
    name: string;
    description: string;
    icon: string;
    downloadUrl: string;
}
export interface AuthRequest {
    address: string;
    signature: string;
    publicKey: string;
    walletType: string;
    challenge?: string;
}
export interface AuthResponse {
    success: boolean;
    token?: string;
    address?: string;
    expiresAt?: number;
    error?: string;
    user?: any;
}
export interface JwtPayload {
    address: string;
    publicKey: string;
    walletType: string;
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=auth.d.ts.map