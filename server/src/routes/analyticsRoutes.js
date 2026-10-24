import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.PROCTOR));

router.get('/dashboard', analyticsController.getAdminStats);
router.get('/exams/:id', analyticsController.getExamAnalytics);
router.get('/exams/:id/export', analyticsController.exportExamCSV);

export default router;
