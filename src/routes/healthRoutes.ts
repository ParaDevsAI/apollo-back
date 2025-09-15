import { Router } from 'express';
import { healthController } from '../controllers';

const router = Router();

// GET /health - Health check endpoint
router.get('/health', healthController.getHealth);

// GET /info - API information
router.get('/info', healthController.getInfo);

export default router;