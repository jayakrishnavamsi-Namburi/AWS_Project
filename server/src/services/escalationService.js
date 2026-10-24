import { ProctorEvent } from '../models/ProctorEvent.js';
import { ExamSession } from '../models/ExamSession.js';
import { Examination } from '../models/Examination.js';
import { SESSION_STATUS, TERMINATION_REASON, SEVERITY_LEVELS } from '../config/constants.js';
import { evaluateSession } from './evaluationService.js';
import { getIO } from '../sockets/socketManager.js';
import { logger } from '../config/logger.js';

export const recordProctorEvent = async (sessionId, studentId, { eventType, severity = SEVERITY_LEVELS.MEDIUM, metadata = {} }) => {
  const session = await ExamSession.findById(sessionId);
  if (!session) {
    const error = new Error('Exam session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== SESSION_STATUS.ACTIVE) {
    return {
      success: false,
      message: `Session is already ${session.status}`,
      sessionStatus: session.status
    };
  }

  // Deduplication: check if identical event occurred within last 2.5 seconds
  const recentDuplicate = await ProctorEvent.findOne({
    sessionId,
    eventType,
    timestamp: { $gte: new Date(Date.now() - 2500) }
  });

  if (recentDuplicate) {
    return {
      success: true,
      deduplicated: true,
      event: recentDuplicate,
      currentWarningsCount: session.warningsCount
    };
  }

  const exam = await Examination.findById(session.examId);
  const warningThreshold = exam?.proctoringPolicy?.warningThreshold || 3;
  const autoSubmitThreshold = exam?.proctoringPolicy?.autoSubmitThreshold || 5;

  const event = await ProctorEvent.create({
    sessionId: session._id,
    examId: session.examId,
    studentId,
    eventType,
    severity,
    metadata,
    timestamp: new Date()
  });

  // Calculate qualifying infractions (Medium, High, Critical)
  const qualifyingEventsCount = await ProctorEvent.countDocuments({
    sessionId: session._id,
    severity: { $in: [SEVERITY_LEVELS.MEDIUM, SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL] }
  });

  session.warningsCount = qualifyingEventsCount;
  await session.save();

  let autoSubmitted = false;
  let result = null;

  if (qualifyingEventsCount >= autoSubmitThreshold) {
    logger.warn(`Auto-submitting exam session ${session._id} due to exceeding violation threshold (${qualifyingEventsCount}/${autoSubmitThreshold})`);
    result = await evaluateSession(session, TERMINATION_REASON.AUTO_ESCALATION);
    autoSubmitted = true;
  }

  // Emit real-time updates via Socket.IO
  try {
    const io = getIO();
    if (io) {
      // Notify proctor room
      io.to(`exam:${session.examId}`).emit('proctor:event', {
        sessionId: session._id,
        studentId,
        event,
        warningsCount: session.warningsCount,
        autoSubmitted
      });

      // Notify student room
      io.to(`session:${session._id}`).emit('exam:warning', {
        eventType,
        severity,
        warningsCount: session.warningsCount,
        warningThreshold,
        autoSubmitThreshold,
        message: autoSubmitted
          ? 'Exam has been automatically submitted due to multiple policy violations.'
          : `Warning: ${eventType.replace('_', ' ')} detected. Please adhere to proctoring guidelines.`
      });

      if (autoSubmitted) {
        io.to(`session:${session._id}`).emit('exam:submitted', {
          reason: TERMINATION_REASON.AUTO_ESCALATION,
          result
        });
      }
    }
  } catch (socketErr) {
    logger.error(`Socket broadcast error in escalation: ${socketErr.message}`);
  }

  return {
    success: true,
    event,
    warningsCount: session.warningsCount,
    warningThreshold,
    autoSubmitThreshold,
    autoSubmitted,
    result
  };
};
