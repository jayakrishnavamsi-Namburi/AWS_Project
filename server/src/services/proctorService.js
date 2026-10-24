import crypto from 'crypto';
import { MobileCameraSession } from '../models/MobileCameraSession.js';
import { ExamSession } from '../models/ExamSession.js';
import { ProctorEvent } from '../models/ProctorEvent.js';
import { TERMINATION_REASON, SESSION_STATUS } from '../config/constants.js';
import { evaluateSession } from './evaluationService.js';
import { config } from '../config/env.js';

export const createMobilePairingToken = async (sessionId, studentId) => {
  const session = await ExamSession.findById(sessionId);
  if (!session) {
    const error = new Error('Exam session not found');
    error.statusCode = 404;
    throw error;
  }

  const rawToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await MobileCameraSession.findOneAndUpdate(
    { sessionId: session._id },
    {
      examId: session.examId,
      studentId,
      pairingToken: rawToken,
      tokenExpiresAt: expiresAt,
      connectionState: 'pending'
    },
    { upsert: true, new: true }
  );

  const pairingUrl = `${config.clientUrl}/mobile-camera/${rawToken}`;
  return {
    pairingToken: rawToken,
    pairingUrl,
    expiresAt
  };
};

export const verifyMobilePairing = async (pairingToken, deviceInfo = {}) => {
  const mobileSession = await MobileCameraSession.findOne({
    pairingToken,
    tokenExpiresAt: { $gt: new Date() }
  }).populate('sessionId examId studentId');

  if (!mobileSession) {
    const error = new Error('Pairing token is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  if (mobileSession.sessionId.status !== SESSION_STATUS.ACTIVE) {
    const error = new Error(`Cannot pair: Exam session is ${mobileSession.sessionId.status}`);
    error.statusCode = 400;
    throw error;
  }

  mobileSession.connectionState = 'connected';
  mobileSession.deviceInfo = deviceInfo;
  mobileSession.pairedAt = new Date();
  await mobileSession.save();

  return {
    sessionId: mobileSession.sessionId._id,
    examId: mobileSession.examId._id,
    examTitle: mobileSession.examId.title,
    studentName: mobileSession.studentId.name,
    studentEmail: mobileSession.studentId.email
  };
};

export const getLiveProctorSessions = async (examId) => {
  const query = examId ? { examId } : {};
  const sessions = await ExamSession.find(query)
    .populate('studentId', 'name email studentId department profilePicture')
    .populate('examId', 'title durationMinutes proctoringPolicy')
    .sort({ startTime: -1 })
    .limit(50);

  const sessionIds = sessions.map((s) => s._id);

  const [recentEvents, mobileSessions] = await Promise.all([
    ProctorEvent.find({ sessionId: { $in: sessionIds } })
      .sort({ timestamp: -1 })
      .limit(100),
    MobileCameraSession.find({ sessionId: { $in: sessionIds } })
  ]);

  const mobileMap = new Map(mobileSessions.map((m) => [m.sessionId.toString(), m]));
  const eventsMap = new Map();

  for (const ev of recentEvents) {
    const sid = ev.sessionId.toString();
    if (!eventsMap.has(sid)) {
      eventsMap.set(sid, []);
    }
    eventsMap.get(sid).push(ev);
  }

  return sessions.map((s) => {
    const sid = s._id.toString();
    const mobile = mobileMap.get(sid);
    const events = eventsMap.get(sid) || [];

    return {
      session: s,
      mobileState: mobile ? mobile.connectionState : 'not_paired',
      recentEvents: events.slice(0, 5),
      totalViolations: s.warningsCount
    };
  });
};

export const getSessionEvents = async (sessionId) => {
  const events = await ProctorEvent.find({ sessionId })
    .populate('reviewedBy', 'name email')
    .sort({ timestamp: -1 });

  return events;
};

export const reviewProctorEvent = async (eventId, reviewerId, reviewStatus, reviewNotes) => {
  const event = await ProctorEvent.findByIdAndUpdate(
    eventId,
    {
      reviewStatus,
      reviewedBy: reviewerId,
      reviewNotes
    },
    { new: true }
  ).populate('reviewedBy', 'name email');

  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  return event;
};

export const terminateSessionByProctor = async (sessionId, reviewerId, reason) => {
  const session = await ExamSession.findById(sessionId);
  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await evaluateSession(session, TERMINATION_REASON.PROCTOR_TERMINATED);
  return { session, result };
};
