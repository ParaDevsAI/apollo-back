import { Router } from 'express';
import { userController } from '../controllers';

const router = Router();

// GET /users/:address/quests - Quests em que o usuário participa
router.get('/:address/quests', userController.getUserQuests);

// GET /users/:address/stats - Estatísticas do usuário
router.get('/:address/stats', userController.getUserStats);

export default router;