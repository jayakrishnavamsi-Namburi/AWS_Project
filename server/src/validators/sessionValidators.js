import { z } from 'zod';
import { PROCTOR_EVENT_TYPES, SEVERITY_LEVELS } from '../config/constants.js';

export const startSessionSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  deviceCheck: z.object({
    cameraVerified: z.boolean(),
    micVerified: z.boolean(),
    fullscreenVerified: z.boolean(),
    browserInfo: z.string().optional()
  })
});

export const saveAnswerSchema = z.object({
  responseValue: z.any(),
  isMarkedForReview: z.boolean().optional(),
  timeSpentSeconds: z.number().min(0).optional()
});

export const submitSessionSchema = z.object({
  terminationReason: z.string().optional()
});

export const createProctorEventSchema = z.object({
  eventType: z.enum([
    PROCTOR_EVENT_TYPES.FULLSCREEN_EXIT,
    PROCTOR_EVENT_TYPES.TAB_BLUR,
    PROCTOR_EVENT_TYPES.PAGE_HIDDEN,
    PROCTOR_EVENT_TYPES.CLIPBOARD_ACTION,
    PROCTOR_EVENT_TYPES.DEVTOOLS_OPEN_ATTEMPT,
    PROCTOR_EVENT_TYPES.KEYBOARD_SHORTCUT,
    PROCTOR_EVENT_TYPES.FACE_ABSENT,
    PROCTOR_EVENT_TYPES.MULTIPLE_FACES,
    PROCTOR_EVENT_TYPES.HEAD_DEVIATION,
    PROCTOR_EVENT_TYPES.AUDIO_SPIKE,
    PROCTOR_EVENT_TYPES.MOBILE_DISCONNECTED,
    PROCTOR_EVENT_TYPES.SUSPICIOUS_INTERVAL,
    PROCTOR_EVENT_TYPES.SCREEN_SHARE_STOPPED
  ]),
  severity: z.enum([
    SEVERITY_LEVELS.LOW,
    SEVERITY_LEVELS.MEDIUM,
    SEVERITY_LEVELS.HIGH,
    SEVERITY_LEVELS.CRITICAL
  ]).optional(),
  metadata: z.record(z.any()).optional()
});

export const reviewProctorEventSchema = z.object({
  reviewStatus: z.enum(['reviewed_benign', 'reviewed_violation']),
  reviewNotes: z.string().optional()
});

export const verifyPairingSchema = z.object({
  pairingToken: z.string().min(1, 'Pairing token is required'),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    screenResolution: z.string().optional()
  }).optional()
});
