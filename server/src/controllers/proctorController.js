import * as proctorService from '../services/proctorService.js';
import * as escalationService from '../services/escalationService.js';
import { logAudit } from '../services/auditService.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const createPairingToken = async (req, res, next) => {
  try {
    const result = await proctorService.createMobilePairingToken(
      req.params.id,
      req.user._id
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPairing = async (req, res, next) => {
  try {
    const { pairingToken, deviceInfo } = req.body;
    const result = await proctorService.verifyMobilePairing(pairingToken, deviceInfo);

    await logAudit({
      actor: { name: 'Mobile Device', email: 'mobile-agent', role: 'student', ipAddress: req.ip },
      action: AUDIT_ACTIONS.MOBILE_PAIRED,
      targetResource: { resourceType: 'ExamSession', resourceId: result.sessionId.toString() }
    });

    res.status(200).json({
      success: true,
      message: 'Mobile camera paired successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const recordEvent = async (req, res, next) => {
  try {
    const result = await escalationService.recordProctorEvent(
      req.params.id,
      req.user._id,
      req.body
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getLiveSessions = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const sessions = await proctorService.getLiveProctorSessions(examId);

    res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionEvents = async (req, res, next) => {
  try {
    const events = await proctorService.getSessionEvents(req.params.id);
    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    next(error);
  }
};

export const reviewEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { reviewStatus, reviewNotes } = req.body;
    const event = await proctorService.reviewProctorEvent(
      eventId,
      req.user._id,
      reviewStatus,
      reviewNotes
    );

    res.status(200).json({
      success: true,
      message: 'Event review updated',
      event
    });
  } catch (error) {
    next(error);
  }
};

export const terminateSession = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await proctorService.terminateSessionByProctor(
      req.params.id,
      req.user._id,
      reason
    );

    await logAudit({
      actor: { ...req.user.toJSON(), ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      action: AUDIT_ACTIONS.PROCTOR_TERMINATION,
      targetResource: { resourceType: 'ExamSession', resourceId: req.params.id },
      details: { reason }
    });

    res.status(200).json({
      success: true,
      message: 'Exam session terminated by proctor',
      ...result
    });
  } catch (error) {
    next(error);
  }
};
