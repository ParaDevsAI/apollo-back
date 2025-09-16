import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';

const router = Router();

// Generate challenge for wallet connection
router.post(
  '/challenge',
  [
    body('address')
      .isString()
      .matches(/^G[A-Z2-7]{55}$/)
      .withMessage('Endereço Stellar inválido'),
  ],
  AuthController.generateChallenge
);

// Verify wallet signature and authenticate
router.post(
  '/authenticate',
  [
    body('address')
      .isString()
      .matches(/^G[A-Z2-7]{55}$/)
      .withMessage('Endereço Stellar inválido'),
    body('signature')
      .isString()
      .notEmpty()
      .withMessage('Assinatura é obrigatória'),
    body('publicKey')
      .isString()
      .notEmpty()
      .withMessage('Chave pública é obrigatória'),
    body('walletType')
      .isIn(['freighter', 'albedo', 'rabet', 'lobstr', 'xbull'])
      .withMessage('Tipo de wallet inválido')
  ],
  AuthController.authenticate
);

// Verify token
router.get('/verify', AuthController.verify);

// Get supported wallets
router.get('/wallets', AuthController.getSupportedWallets);

export default router;
