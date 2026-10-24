import { Router } from 'express';
import * as examController from '../controllers/examController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createExamSchema, updateExamSchema, assignStudentsSchema } from '../validators/examValidators.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/', examController.getExams);
router.post('/', authorize(ROLES.ADMIN), validate(createExamSchema), examController.createExam);
router.get('/:id', examController.getExamById);
router.patch('/:id', authorize(ROLES.ADMIN), validate(updateExamSchema), examController.updateExam);
router.delete('/:id', authorize(ROLES.ADMIN), examController.deleteExam);
router.post('/:id/publish', authorize(ROLES.ADMIN), examController.publishExam);
router.post('/:id/assign', authorize(ROLES.ADMIN), validate(assignStudentsSchema), examController.assignStudents);

export default router;
