import { Router } from 'express';
import { body } from 'express-validator';
import { questController } from '../controllers';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Validation rules
const createQuestValidation = [
  body('title').isString().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').isString().isLength({ min: 1, max: 500 }).withMessage('Description must be 1-500 characters'),
  body('reward_token').isString().isLength({ min: 1 }).withMessage('Reward token is required'),
  body('reward_amount').isString().isLength({ min: 1 }).withMessage('Reward amount is required'),
  body('max_participants').isInt({ min: 1 }).withMessage('Max participants must be a positive integer'),
  body('start_time').isInt({ min: 0 }).withMessage('Start time must be a valid timestamp'),
  body('end_time').isInt({ min: 0 }).withMessage('End time must be a valid timestamp'),
  body('quest_type').isIn(['TRADING_VOLUME', 'LIQUIDITY_PROVISION', 'TOKEN_HOLDING', 'CUSTOM'])
    .withMessage('Invalid quest type'),
  body('conditions').isObject().withMessage('Conditions must be an object')
];

const registerUserValidation = [
  body('user_address').isString().isLength({ min: 56, max: 56 })
    .withMessage('User address must be exactly 56 characters')
];

const markEligibleValidation = [
  body('user_address').isString().isLength({ min: 56, max: 56 })
    .withMessage('User address must be exactly 56 characters')
];

// Routes

// GET /quests - Lista todas as quests ativas
router.get('/', questController.getQuests);

// GET /quests/:id - Detalhes de uma quest
router.get('/:id', questController.getQuestById);

// POST /quests - Cria uma nova quest (admin)
router.post('/', 
  authMiddleware, 
  adminMiddleware, 
  createQuestValidation, 
  questController.createQuest
);

// POST /quests/:id/register - Registra usuário em uma quest
router.post('/:id/register', 
  registerUserValidation, 
  questController.registerUser
);

// POST /quests/:id/eligible - Marca usuário como elegível (admin)
router.post('/:id/eligible', 
  authMiddleware, 
  adminMiddleware, 
  markEligibleValidation, 
  questController.markUserEligible
);

// POST /quests/:id/resolve - Resolve quest (admin)
router.post('/:id/resolve', 
  authMiddleware, 
  adminMiddleware, 
  questController.resolveQuest
);

// POST /quests/:id/cancel - Cancela quest (admin)
router.post('/:id/cancel', 
  authMiddleware, 
  adminMiddleware, 
  questController.cancelQuest
);

// GET /quests/:id/participants - Lista de participantes
router.get('/:id/participants', questController.getQuestParticipants);

// POST /quests/:id/distribute - Distribui prêmios (admin)
router.post('/:id/distribute', 
  authMiddleware, 
  adminMiddleware, 
  questController.distributeRewards
);

export default router;