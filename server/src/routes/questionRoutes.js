import { Router } from 'express';
import * as questionController from '../controllers/questionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createQuestionSchema, updateQuestionSchema } from '../validators/questionValidators.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// Question bank management (Admin & Proctor)
router.get('/', authorize(ROLES.ADMIN, ROLES.PROCTOR), questionController.getQuestions);
router.post('/', authorize(ROLES.ADMIN), validate(createQuestionSchema), questionController.createQuestion);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.PROCTOR), questionController.getQuestionById);
router.patch('/:id', authorize(ROLES.ADMIN), validate(updateQuestionSchema), questionController.updateQuestion);
router.delete('/:id', authorize(ROLES.ADMIN), questionController.deleteQuestion);

export default router;
