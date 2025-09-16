import jwt from 'jsonwebtoken';
import config from '../config/index.js';
export class AuthHelper {
    static generateToken(payload) {
        return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
    }
    static verifyToken(token) {
        return jwt.verify(token, config.jwtSecret);
    }
    static extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    static generateChallenge() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    static validateStellarAddress(address) {
        // Validação básica de endereço Stellar
        return /^G[A-Z2-7]{55}$/.test(address);
    }
}
//# sourceMappingURL=auth.js.map