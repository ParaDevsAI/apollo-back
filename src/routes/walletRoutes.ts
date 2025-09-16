import { Router, Request, Response } from 'express';
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
  (req: Request, res: Response) => authController.connectWallet(req, res)
);

// POST /auth/wallet/disconnect
// Desconectar de uma carteira Stellar
router.post('/wallet/disconnect',
  [
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.disconnectWallet(req, res)
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
  (req: Request, res: Response) => authController.buildQuestRegistrationTransaction(req, res)
);

// POST /auth/wallet/quest/:questId/register
// Submeter transação assinada de registro para quest
router.post('/wallet/quest/:questId/register',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('signedTransactionXdr').notEmpty().withMessage('Signed transaction XDR is required'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.registerForQuestWithWallet(req, res)
);

// POST /auth/wallet/quest/:questId/build-claim
// Construir transação de reivindicação de recompensas (frontend assina depois)
router.post('/wallet/quest/:questId/build-claim',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.buildClaimRewardsTransaction(req, res)
);

// POST /auth/wallet/quest/:questId/claim-rewards
// Submeter transação assinada de reivindicação de recompensas
router.post('/wallet/quest/:questId/claim-rewards',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('signedTransactionXdr').notEmpty().withMessage('Signed transaction XDR is required'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.claimRewardsWithWallet(req, res)
);

/**
 * WALLET INFORMATION ROUTES
 */

// GET /auth/wallet/supported
// Obter carteiras suportadas
router.get('/wallet/supported', (req: Request, res: Response) => authController.getSupportedWallets(req, res));

// GET /auth/wallet/health
// Verificar a saúde do serviço de carteira
router.get('/wallet/health', (req: Request, res: Response) => authController.walletServiceHealth(req, res));

// GET /auth/wallet/info
// Obter informações sobre o serviço de carteira
router.get('/wallet/info', (req: Request, res: Response) => authController.getWalletServiceInfo(req, res));

/**
 * QUEST INFORMATION ROUTES
 */

// GET /auth/wallet/quests/active
// Obter todas as quests ativas disponíveis para registro
router.get('/wallet/quests/active', (req: Request, res: Response) => authController.getActiveQuests(req, res));

/**
 * QUEST VERIFICATION AND STATUS ROUTES
 */

// POST /auth/wallet/quest/:questId/verify
// Verificar se o usuário completou a tarefa
router.post('/wallet/quest/:questId/verify',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.verifyQuestCompletion(req, res)
);

// GET /auth/wallet/quest/:questId/status
// Obter o status do usuário em uma quest
router.get('/wallet/quest/:questId/status',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer')
  ],
  (req: Request, res: Response) => authController.getQuestStatus(req, res)
);

// POST /auth/wallet/quest/:questId/claim
// Claim rewards for a completed quest (admin action)
router.post('/wallet/quest/:questId/claim',
  [
    param('questId').isInt({ min: 1 }).withMessage('Quest ID must be a positive integer'),
    body('publicKey').notEmpty().withMessage('Public key is required')
  ],
  (req: Request, res: Response) => authController.claimQuestRewards(req, res)
);

export default router;