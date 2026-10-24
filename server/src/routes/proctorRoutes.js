import { Router } from 'express';
import * as proctorController from '../controllers/proctorController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { examEventLimiter } from '../middleware/rateLimiter.js';
import {
  createProctorEventSchema,
  reviewProctorEventSchema,
  verifyPairingSchema
} from '../validators/sessionValidators.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// QR Pairing verification from mobile phone
router.post('/pair/verify', validate(verifyPairingSchema), proctorController.verifyPairing);

// Authenticated session proctoring
router.use(authenticate);

// Student creates pairing token or submits telemetry event
router.post('/sessions/:id/pair', proctorController.createPairingToken);
router.post('/sessions/:id/events', examEventLimiter, validate(createProctorEventSchema), proctorController.recordEvent);

// Proctor & Admin monitoring endpoints
router.get('/live', authorize(ROLES.ADMIN, ROLES.PROCTOR), proctorController.getLiveSessions);
router.get('/sessions/:id/events', authorize(ROLES.ADMIN, ROLES.PROCTOR), proctorController.getSessionEvents);
router.patch('/events/:eventId/review', authorize(ROLES.ADMIN, ROLES.PROCTOR), validate(reviewProctorEventSchema), proctorController.reviewEvent);
router.post('/sessions/:id/terminate', authorize(ROLES.ADMIN, ROLES.PROCTOR), proctorController.terminateSession);

export default router;
