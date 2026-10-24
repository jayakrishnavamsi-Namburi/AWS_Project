import * as storageService from '../services/storageService.js';
import { ExamSession } from '../models/ExamSession.js';
import { logAudit } from '../services/auditService.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const uploadChunk = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const { chunkSequence } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Exam session not found' });
    }

    const chunk = await storageService.saveVideoChunkRecord({
      sessionId: session._id,
      examId: session.examId,
      studentId: req.user._id,
      file: req.file,
      chunkSequence
    });

    res.status(201).json({
      success: true,
      message: 'Video chunk uploaded successfully',
      chunk
    });
  } catch (error) {
    next(error);
  }
};

export const getRecordings = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const recordings = await storageService.getSessionRecordings(sessionId);

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.RECORDING_ACCESSED,
      targetResource: { resourceType: 'ExamSession', resourceId: sessionId }
    });

    res.status(200).json({
      success: true,
      recordings
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRecordings = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const result = await storageService.deleteSessionRecordings(sessionId);

    res.status(200).json({
      success: true,
      message: 'Recordings deleted successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};
