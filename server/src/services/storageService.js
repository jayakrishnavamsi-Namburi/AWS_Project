import fs from 'fs';
import path from 'path';
import { VideoChunk } from '../models/VideoChunk.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export const saveVideoChunkRecord = async ({ sessionId, examId, studentId, file, chunkSequence }) => {
  const relativePath = path.relative(config.mediaStoragePath, file.path);

  const chunk = await VideoChunk.create({
    sessionId,
    examId,
    studentId,
    storageKey: file.filename,
    relativePath,
    chunkSequence: Number(chunkSequence) || 0,
    contentType: file.mimetype,
    sizeBytes: file.size,
    uploadTimestamp: new Date()
  });

  return chunk;
};

export const getSessionRecordings = async (sessionId) => {
  return VideoChunk.find({ sessionId }).sort({ chunkSequence: 1 });
};

export const deleteSessionRecordings = async (sessionId) => {
  const chunks = await VideoChunk.find({ sessionId });
  for (const chunk of chunks) {
    const fullPath = path.join(config.mediaStoragePath, chunk.relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        logger.error(`Failed to delete recording file ${fullPath}: ${err.message}`);
      }
    }
  }

  await VideoChunk.deleteMany({ sessionId });
  return { deletedCount: chunks.length };
};
