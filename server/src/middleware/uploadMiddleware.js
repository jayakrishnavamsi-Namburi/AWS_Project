import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure media storage directory exists
if (!fs.existsSync(config.mediaStoragePath)) {
  fs.mkdirSync(config.mediaStoragePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionDir = path.join(config.mediaStoragePath, req.params.id || 'general');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sequence = req.body.chunkSequence || '0';
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `chunk_${sequence}_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/webm', 'video/mp4', 'audio/webm', 'application/octet-stream'];
  if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.webm') || file.originalname.endsWith('.mp4')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

export const uploadVideoChunk = multer({
  storage,
  limits: {
    fileSize: config.maxUploadSize
  },
  fileFilter
});
