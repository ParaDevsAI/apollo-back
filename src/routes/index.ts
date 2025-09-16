import { Router } from 'express';
import authRoutes from './authRoutes.js';
import questRoutes from './questRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Protected quest routes
router.use('/quests', questRoutes);

export default router;
