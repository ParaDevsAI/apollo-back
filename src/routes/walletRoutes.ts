import { Router } from 'express';
import { body, param } from 'express-validator';
import { authController } from '../controllers/authControllerWallet';

const router = Router();

/**
 * STELLAR WALLET ROUTES
 */

// POST /auth/wallet/connect
// Autenticar usuário com chave pública da carteira (conexão feita no frontend)
router.post('/wallet/connect', 
  [
    body('publicKey').notEmpty().withMessage('Public key is required'),
    body('userName').optional().isLength({ min: 3, max: 100 }).withMessage('User name must be between 3-100 characters'),
    body('signedMessage').optional().isString().withMessage('Signed message must be a string')
  ],
  authController.connectWallet
);

// POST /auth/wallet/disconnect
// Desconectar de uma carteira Stellar
router.post('/wallet/disconnect',
  [
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  authController.disconnectWallet
);

/**
 * STELLAR WALLET TRANSACTION ROUTES
 */

// POST /auth/wallet/quest/:questId/build-register
// Construir transação de registro para quest (frontend assina depois)
router.post('/wallet/quest/:questId/build-register',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  authController.buildQuestRegistrationTransaction
);

// POST /auth/wallet/quest/:questId/register
// Submeter transação assinada de registro para quest
router.post('/wallet/quest/:questId/register',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('signedTransactionXdr').notEmpty().withMessage('Signed transaction XDR is required'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  authController.registerForQuestWithWallet
);

// POST /auth/wallet/quest/:questId/build-claim
// Construir transação de reivindicação de recompensas (frontend assina depois)
router.post('/wallet/quest/:questId/build-claim',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  authController.buildClaimRewardsTransaction
);

// POST /auth/wallet/quest/:questId/claim-rewards
// Submeter transação assinada de reivindicação de recompensas
router.post('/wallet/quest/:questId/claim-rewards',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('signedTransactionXdr').notEmpty().withMessage('Signed transaction XDR is required'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  authController.claimRewardsWithWallet
);

/**
 * WALLET INFORMATION ROUTES
 */

// GET /auth/wallet/supported
// Obter carteiras suportadas
router.get('/wallet/supported', authController.getSupportedWallets);

// GET /auth/wallet/health
// Verificar a saúde do serviço de carteira
router.get('/wallet/health', authController.walletServiceHealth);

// GET /auth/wallet/info
// Obter informações sobre o serviço de carteira
router.get('/wallet/info', authController.getWalletServiceInfo);

export default router;