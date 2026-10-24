import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { updateUserStatusSchema } from '../validators/authValidators.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.PROCTOR), userController.getUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id', userController.updateUser);
router.patch('/:id/status', authorize(ROLES.ADMIN), validate(updateUserStatusSchema), userController.updateUserStatus);

export default router;
