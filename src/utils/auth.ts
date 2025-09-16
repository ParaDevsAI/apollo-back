import jwt from 'jsonwebtoken';
import config from '../config';

export interface JwtPayload {
  address: string;
  role: 'user' | 'admin';
  authMethod?: 'passkey' | 'wallet' | 'jwt';
  contractAddress?: string;
  publicKey?: string;
  sessionId?: string;
}

export class AuthHelper {
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration
    } as jwt.SignOptions);
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
}