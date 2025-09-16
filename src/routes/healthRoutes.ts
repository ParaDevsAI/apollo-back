import { Router } from 'express';
import { HealthController } from '../controllers/healthController';

const router = Router();

// Basic health check
router.get('/', HealthController.check);

// Detailed health check with service status
router.get('/detailed', HealthController.detailedCheck);

export default router;
