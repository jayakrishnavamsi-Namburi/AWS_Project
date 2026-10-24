import { Router } from 'express';
import * as recordingController from '../controllers/recordingController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { uploadVideoChunk } from '../middleware/uploadMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// Video chunk upload from student exam session
router.post('/sessions/:id/chunks', uploadVideoChunk.single('chunk'), recordingController.uploadChunk);

// Proctor / Admin access to session recordings
router.get('/sessions/:id', authorize(ROLES.ADMIN, ROLES.PROCTOR), recordingController.getRecordings);
router.delete('/sessions/:id', authorize(ROLES.ADMIN), recordingController.deleteRecordings);

export default router;
