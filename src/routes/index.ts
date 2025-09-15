import { Router } from 'express';
import questRoutes from './questRoutes';
import userRoutes from './userRoutes';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/quests', questRoutes);
router.use('/users', userRoutes);
router.use('/', healthRoutes);

export default router;