import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authController } from '../controllers';

const router = Router();

// Validation rules
const userIdentifierValidation = [
  body('userIdentifier')
    .isLength({ min: 3, max: 100 })
    .withMessage('User identifier must be between 3-100 characters')
    .matches(/^[a-zA-Z0-9@._-]+$/)
    .withMessage('User identifier contains invalid characters')
];

const passkeyResponseValidation = [
  body('passkeyResponse').isObject().withMessage('Passkey response must be an object'),
  body('passkeyResponse.credentialId').notEmpty().withMessage('Credential ID is required'),
  body('passkeyResponse.clientDataJSON').notEmpty().withMessage('Client data is required'),
  body('passkeyResponse.authenticatorData').notEmpty().withMessage('Authenticator data is required'),
  body('passkeyResponse.signature').notEmpty().withMessage('Signature is required')
];

const sessionIdValidation = [
  body('sessionId')
    .isLength({ min: 10 })
    .withMessage('Valid session ID is required')
];

const questIdValidation = [
  param('questId')
    .isInt({ min: 1 })
    .withMessage('Quest ID must be a positive integer')
];

/**
 * KALE PASSKEY WALLET ROUTES
 */

// POST /auth/passkey/register
// Create wallet with passkey using Kale PasskeyKit
router.post('/passkey/register', 
  [
    body('appName').optional().isLength({ min: 3, max: 50 }).withMessage('App name must be between 3-50 characters'),
    body('userName').notEmpty().withMessage('User name is required'),
    body('rpId').optional().isLength({ min: 3 }).withMessage('RP ID must be at least 3 characters')
  ],
  authController.createPasskeyWallet
);

// POST /auth/passkey/connect
// Connect to existing wallet with passkey
router.post('/passkey/connect',
  [
    body('keyId').optional().isString().withMessage('Key ID must be a string'),
    body('contractId').optional().isLength({ min: 56, max: 56 }).withMessage('Contract ID must be 56 characters'),
    body('rpId').optional().isString().withMessage('RP ID must be a string')
  ],
  authController.connectPasskeyWallet
);

/**
 * KALE PASSKEY TRANSACTION ROUTES
 */

// POST /auth/passkey/quest/:questId/register
// Register for quest using Kale passkey wallet
router.post('/passkey/quest/:questId/register',
  [
    ...questIdValidation,
    body('contractId').notEmpty().withMessage('Contract ID is required')
  ],
  authController.registerForQuestWithPasskey
);

// POST /auth/passkey/quest/:questId/claim-rewards
// Claim rewards using Kale passkey wallet
router.post('/passkey/quest/:questId/claim-rewards',
  [
    ...questIdValidation,
    body('contractId').notEmpty().withMessage('Contract ID is required')
  ],
  authController.claimRewardsWithPasskey
);

/**
 * WALLET MANAGEMENT ROUTES
 */

// GET /auth/signers/:contractId
// Get signers for a wallet contract
router.get('/signers/:contractId',
  [
    param('contractId').isLength({ min: 56, max: 56 }).withMessage('Contract ID must be 56 characters')
  ],
  authController.getWalletSigners
);

/**
 * INFORMATION ROUTES
 */

// GET /auth/info
// Information about available authentication methods
router.get('/info', (req, res) => {
  res.json({
    name: 'Apollo Authentication API',
    version: '2.0.0',
    supportedMethods: ['passkey', 'wallet', 'jwt'],
    passkeyFeatures: [
      'Biometric authentication via WebAuthn',
      'Smart wallet creation on Stellar',
      'Direct contract transactions',
      'Multi-device passkey support'
    ],
    endpoints: {
      wallet: {
        create: 'POST /auth/passkey/register',
        connect: 'POST /auth/passkey/connect'
      },
      transactions: {
        questRegister: 'POST /auth/passkey/quest/:questId/register',
        claimRewards: 'POST /auth/passkey/quest/:questId/claim-rewards'
      },
      management: {
        getSigners: 'GET /auth/signers/:contractId'
      }
    },
    integrations: {
      kale: 'Passkey-kit for smart wallet management',
      stellar: 'Blockchain and smart contract interaction',
      webauthn: 'Native browser passkey authentication'
    }
  });
});

// GET /auth/health
// Health check específico para autenticação
router.get('/health', async (req, res) => {
  try {
    // Em uma implementação real, você testaria a conectividade com Mercury
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mercury: true, // Test Mercury API connectivity
        zephyr: true,  // Test Zephyr service
        passkey: true  // Test WebAuthn support
      },
      capabilities: [
        'passkey_registration',
        'passkey_authentication', 
        'smart_wallet_creation',
        'gasless_transactions'
      ]
    };

    const isHealthy = Object.values(healthStatus.services).every(service => service);
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

export default router;