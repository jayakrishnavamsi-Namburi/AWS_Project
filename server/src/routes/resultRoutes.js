import { Router } from 'express';
import * as resultController from '../controllers/resultController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/', resultController.getResults);
router.get('/:id', resultController.getResultById);
router.get('/exam/:id', authorize(ROLES.ADMIN, ROLES.PROCTOR), resultController.getExamResults);

export default router;
