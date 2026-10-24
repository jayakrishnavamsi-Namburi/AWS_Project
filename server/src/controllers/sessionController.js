import * as sessionService from '../services/sessionService.js';
import { logAudit } from '../services/auditService.js';
import { AUDIT_ACTIONS, TERMINATION_REASON } from '../config/constants.js';

export const startSession = async (req, res, next) => {
  try {
    const { examId, deviceCheck } = req.body;
    const result = await sessionService.startExamSession(
      examId,
      req.user,
      deviceCheck,
      req.ip
    );

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_SESSION_STARTED,
      targetResource: { resourceType: 'ExamSession', resourceId: result.session._id.toString() }
    });

    res.status(201).json({
      success: true,
      message: 'Exam session initialized',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const result = await sessionService.getSessionDetails(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (req, res, next) => {
  try {
    const { id: sessionId, questionId } = req.params;
    const answer = await sessionService.saveAnswer(
      sessionId,
      questionId,
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Answer saved',
      answer
    });
  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (req, res, next) => {
  try {
    const result = await sessionService.handleHeartbeat(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const submitSession = async (req, res, next) => {
  try {
    const { terminationReason = TERMINATION_REASON.STUDENT_SUBMITTED } = req.body;
    const result = await sessionService.submitExamSession(
      req.params.id,
      req.user._id,
      terminationReason
    );

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.EXAM_SESSION_SUBMITTED,
      targetResource: { resourceType: 'ExamSession', resourceId: req.params.id }
    });

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};
