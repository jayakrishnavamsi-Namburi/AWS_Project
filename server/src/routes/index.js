import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import examRoutes from './examRoutes.js';
import questionRoutes from './questionRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import proctorRoutes from './proctorRoutes.js';
import recordingRoutes from './recordingRoutes.js';
import resultRoutes from './resultRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/exam-sessions', sessionRoutes);
router.use('/proctoring', proctorRoutes);
router.use('/recordings', recordingRoutes);
router.use('/results', resultRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
