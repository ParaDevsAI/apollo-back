import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { JwtPayload } from '../models/auth.js';

export class AuthHelper {
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static generateChallenge(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  static validateStellarAddress(address: string): boolean {
    // Validação básica de endereço Stellar
    return /^G[A-Z2-7]{55}$/.test(address);
  }
}
