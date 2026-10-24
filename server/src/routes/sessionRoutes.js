import { Router } from 'express';
import * as sessionController from '../controllers/sessionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { startSessionSchema, saveAnswerSchema, submitSessionSchema } from '../validators/sessionValidators.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(startSessionSchema), sessionController.startSession);
router.get('/:id', sessionController.getSession);
router.put('/:id/answers/:questionId', validate(saveAnswerSchema), sessionController.saveAnswer);
router.post('/:id/heartbeat', sessionController.heartbeat);
router.post('/:id/submit', validate(submitSessionSchema), sessionController.submitSession);

export default router;
