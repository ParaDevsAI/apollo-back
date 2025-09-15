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
 * PASSKEY REGISTRATION ROUTES
 */

// POST /auth/passkey/register/init
// Inicia o processo de registro de passkey
router.post('/passkey/register/init', 
  userIdentifierValidation,
  authController.initiatePasskeyRegistration
);

// POST /auth/passkey/register/complete  
// Completa o registro de passkey e cria smart contract
router.post('/passkey/register/complete',
  [
    ...sessionIdValidation,
    ...passkeyResponseValidation
  ],
  authController.completePasskeyRegistration
);

/**
 * PASSKEY AUTHENTICATION ROUTES
 */

// GET /auth/passkey/challenge
// Gera challenge para autenticação
router.get('/passkey/challenge',
  [
    query('contractAddress')
      .optional()
      .isLength({ min: 56, max: 56 })
      .withMessage('Contract address must be 56 characters if provided')
  ],
  authController.getAuthenticationChallenge
);

// POST /auth/passkey/login
// Autentica usuário com passkey e cria sessão Zephyr
router.post('/passkey/login',
  [
    ...passkeyResponseValidation,
    body('contractAddress')
      .optional()
      .isLength({ min: 56, max: 56 })
      .withMessage('Contract address must be 56 characters if provided')
  ],
  authController.loginWithPasskey
);

/**
 * ZEPHYR TRANSACTION ROUTES (Passkey-powered)
 */

// POST /auth/passkey/quest/:questId/register
// Registra usuário em quest via Zephyr (sem assinaturas manuais)
router.post('/passkey/quest/:questId/register',
  [
    ...questIdValidation,
    body('sessionId').notEmpty().withMessage('Zephyr session ID is required')
  ],
  authController.registerForQuestWithPasskey
);

// POST /auth/passkey/quest/:questId/claim-rewards
// Reivindica recompensas via Zephyr
router.post('/passkey/quest/:questId/claim-rewards',
  [
    ...questIdValidation,
    body('sessionId').notEmpty().withMessage('Zephyr session ID is required')
  ],
  authController.claimRewardsWithPasskey
);

/**
 * SESSION MANAGEMENT ROUTES
 */

// GET /auth/session/validate
// Valida sessão Zephyr atual
router.get('/session/validate',
  [
    query('sessionId').notEmpty().withMessage('Session ID is required')
  ],
  authController.validateSession
);

/**
 * INFORMATION ROUTES
 */

// GET /auth/info
// Informações sobre métodos de autenticação disponíveis
router.get('/info', (req, res) => {
  res.json({
    name: 'Apollo Authentication API',
    version: '1.0.0',
    supportedMethods: ['passkey', 'wallet', 'jwt'],
    passkeyFeatures: [
      'Biometric authentication',
      'Smart wallet creation',
      'Gasless transactions via Zephyr',
      'Multi-device support'
    ],
    endpoints: {
      registration: {
        init: 'POST /auth/passkey/register/init',
        complete: 'POST /auth/passkey/register/complete'
      },
      authentication: {
        challenge: 'GET /auth/passkey/challenge',
        login: 'POST /auth/passkey/login'
      },
      transactions: {
        questRegister: 'POST /auth/passkey/quest/:questId/register',
        claimRewards: 'POST /auth/passkey/quest/:questId/claim-rewards'
      },
      session: {
        validate: 'GET /auth/session/validate'
      }
    },
    integrations: {
      mercury: 'Passkey management and smart wallet creation',
      zephyr: 'Gasless transaction execution',
      stellar: 'Blockchain interaction layer'
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
      error: error.message
    });
  }
});

export default router;