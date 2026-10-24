import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  }
});

export const examEventLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120, // allows high frequency telemetry while bounding abuse
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Event submission limit exceeded. Please throttle telemetry frequency.'
  }
});
