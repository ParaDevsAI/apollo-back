import { JwtPayload } from '../models/auth.js';
export declare class AuthHelper {
    static generateToken(payload: JwtPayload): string;
    static verifyToken(token: string): JwtPayload;
    static extractTokenFromHeader(authHeader?: string): string | null;
    static generateChallenge(): string;
    static validateStellarAddress(address: string): boolean;
}
//# sourceMappingURL=auth.d.ts.map