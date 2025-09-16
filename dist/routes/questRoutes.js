import { Router } from 'express';
import { body, param } from 'express-validator';
import { QuestController } from '../controllers/questController';
import { authenticateUser } from '../middleware/auth';
const router = Router();
// All quest routes require authentication
router.use(authenticateUser);
// Get all quests
router.get('/', QuestController.getAllQuests);
// Create new quest
router.post('/', [
    body('title')
        .isString()
        .isLength({ min: 3, max: 100 })
        .withMessage('Título deve ter entre 3 e 100 caracteres'),
    body('description')
        .isString()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
    body('questType')
        .isIn(['task', 'social', 'educational', 'creative'])
        .withMessage('Tipo de quest inválido'),
    body('distributionType')
        .isIn(['raffle', 'fcfs'])
        .withMessage('Tipo de distribuição inválido'),
    body('maxParticipants')
        .isInt({ min: 1, max: 10000 })
        .withMessage('Número máximo de participantes deve ser entre 1 e 10000'),
    body('rewardAmount')
        .isFloat({ min: 0 })
        .withMessage('Valor da recompensa deve ser positivo'),
    body('startDate')
        .isISO8601()
        .withMessage('Data de início inválida'),
    body('endDate')
        .isISO8601()
        .withMessage('Data de fim inválida'),
], QuestController.createQuest);
// Get specific quest
router.get('/:questId', QuestController.getQuest);
// Update quest
router.put('/:questId', [
    param('questId').isString().notEmpty().withMessage('ID da quest é obrigatório'),
    body('title')
        .optional()
        .isString()
        .isLength({ min: 3, max: 100 })
        .withMessage('Título deve ter entre 3 e 100 caracteres'),
    body('description')
        .optional()
        .isString()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
    body('maxParticipants')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Número máximo de participantes deve ser entre 1 e 10000'),
    body('rewardAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Valor da recompensa deve ser positivo'),
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Data de início inválida'),
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('Data de fim inválida'),
], QuestController.updateQuest);
// Delete quest
router.delete('/:questId', QuestController.deleteQuest);
// Register for quest
router.post('/:questId/register', QuestController.registerForQuest);
// Cancel quest registration
router.post('/:questId/cancel', QuestController.cancelQuest);
// Check if user is registered for quest
router.get('/:questId/registration', QuestController.checkUserRegistration);
// Get quest participants
router.get('/:questId/participants', QuestController.getQuestParticipants);
export default router;
//# sourceMappingURL=questRoutes.js.map