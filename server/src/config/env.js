import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const requiredVars = ['JWT_SECRET'];

export const validateEnv = () => {
  const missing = requiredVars.filter(key => !process.env[key]);
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL: Missing mandatory environment variables: ${missing.join(', ')}`);
  }
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/secureproctor_db',
  jwtSecret: process.env.JWT_SECRET || 'dev_fallback_jwt_secret_change_in_production_min32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'dev_fallback_cookie_secret_change_in_production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH || path.resolve(__dirname, '../../uploads'),
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 50 * 1024 * 1024,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300
  },
  webrtc: {
    stunServer: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302',
    turnServer: process.env.TURN_SERVER_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnCredential: process.env.TURN_CREDENTIAL || ''
  },
  proctoring: {
    defaultWarningThreshold: parseInt(process.env.PROCTOR_WARNING_THRESHOLD, 10) || 3,
    defaultAutoSubmitThreshold: parseInt(process.env.PROCTOR_AUTOSUBMIT_THRESHOLD, 10) || 5,
    faceAbsentSecs: parseInt(process.env.PROCTOR_FACE_ABSENT_SECS, 10) || 5,
    multipleFacesSecs: parseInt(process.env.PROCTOR_MULTIPLE_FACES_SECS, 10) || 3,
    headDeviationSecs: parseInt(process.env.PROCTOR_HEAD_DEVIATION_SECS, 10) || 4,
    audioNoiseThreshold: parseFloat(process.env.PROCTOR_AUDIO_NOISE_THRESHOLD) || 0.35
  }
};
