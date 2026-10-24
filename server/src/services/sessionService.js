// import { ExamSession } from '../models/ExamSession.js';
// import { Examination } from '../models/Examination.js';
// import { Question } from '../models/Question.js';
// import { Answer } from '../models/Answer.js';
// import { SESSION_STATUS, EXAM_STATUS, TERMINATION_REASON } from '../config/constants.js';
// import { evaluateSession } from './evaluationService.js';

// export const startExamSession = async (examId, student, deviceCheck, ipAddress) => {
//   const exam = await Examination.findById(examId);
//   if (!exam) {
//     const error = new Error('Examination not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (exam.status !== EXAM_STATUS.PUBLISHED) {
//     const error = new Error('This examination is not open for attempts.');
//     error.statusCode = 403;
//     throw error;
//   }

//   const now = new Date();
//   if (exam.schedule && exam.schedule.startTime && new Date(exam.schedule.startTime) > now) {
//     const error = new Error('This examination has not started yet.');
//     error.statusCode = 403;
//     throw error;
//   }

//   if (exam.schedule && exam.schedule.endTime && new Date(exam.schedule.endTime) < now) {
//     const error = new Error('This examination has already ended.');
//     error.statusCode = 403;
//     throw error;
//   }

//   // Check existing attempts
//   const existingAttempts = await ExamSession.find({ examId, studentId: student._id });
//   console.log('DEBUG examId:', examId.toString());
// console.log('DEBUG studentId:', student._id.toString());
// console.log(
//   'DEBUG existing attempts:',
//   existingAttempts.map((s) => ({
//     id: s._id.toString(),
//     examId: s.examId.toString(),
//     studentId: s.studentId.toString(),
//     status: s.status,
//     attemptNumber: s.attemptNumber
//   }))
// );
// console.log('DEBUG maxAttempts:', exam.maxAttempts);
//   const completedAttempts = existingAttempts.filter((s) =>
//     [SESSION_STATUS.COMPLETED, SESSION_STATUS.TERMINATED].includes(s.status)
//   );

//   if (completedAttempts.length >= exam.maxAttempts) {
//     const error = new Error(`Maximum attempts (${exam.maxAttempts}) reached for this examination.`);
//     error.statusCode = 403;
//     throw error;
//   }

//   // Check if there is an existing active session
//   const activeSession = existingAttempts.find((s) => s.status === SESSION_STATUS.ACTIVE);
//   console.log('Active session found:', !!activeSession);

// if (activeSession) {
//   console.log('Active session ID:', activeSession._id.toString());
//   console.log('Server deadline:', activeSession.serverDeadline);
//   console.log('Current time:', new Date());
//   console.log(
//     'Deadline expired:',
//     new Date() >= new Date(activeSession.serverDeadline)
//   );
// }

//   // Authoritative server deadline
//   const calculatedDeadline = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
//   const examWindowEnd = exam.schedule?.endTime ? new Date(exam.schedule.endTime) : calculatedDeadline;
//   const serverDeadline = calculatedDeadline < examWindowEnd ? calculatedDeadline : examWindowEnd;

//   // Question selection and randomization
//   let questionIds = [...exam.questions];
//   if (exam.questionRandomization) {
//     for (let i = questionIds.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
//     }
//   }

//   const session = await ExamSession.create({
//     examId: exam._id,
//     studentId: student._id,
//     attemptNumber: completedAttempts.length + 1,
//     startTime: now,
//     serverDeadline,
//     status: SESSION_STATUS.ACTIVE,
//     deviceCheckDetails: deviceCheck,
//     questionOrder: questionIds,
//     clientIp: ipAddress
//   });

//   return getSessionDetails(session._id, student._id);
// };

// export const getSessionDetails = async (sessionId, studentId) => {
//   const session = await ExamSession.findById(sessionId).populate('examId');
//   if (!session) {
//     const error = new Error('Exam session not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (studentId && session.studentId.toString() !== studentId.toString()) {
//     const error = new Error('Unauthorized session access.');
//     error.statusCode = 403;
//     throw error;
//   }

//   // Fetch ordered questions with sanitized options (no isCorrect / answers exposed)
//   const questionsRaw = await Question.find({ _id: { $in: session.questionOrder } });
//   const questionMap = new Map(questionsRaw.map((q) => [q._id.toString(), q]));

//   const sanitizedQuestions = session.questionOrder.map((qId) => {
//     const q = questionMap.get(qId.toString());
//     if (!q) return null;

//     let options = q.options ? q.options.map((opt) => ({ id: opt.id, text: opt.text })) : [];
//     if (session.examId?.optionRandomization && options.length > 0) {
//       // Deterministic or standard shuffle for options
//       options = [...options].sort(() => Math.random() - 0.5);
//     }

//     return {
//       _id: q._id,
//       text: q.text,
//       type: q.type,
//       options,
//       marks: q.marks,
//       difficulty: q.difficulty,
//       category: q.category
//     };
//   }).filter(Boolean);

//   // Fetch saved answers
//   const savedAnswers = await Answer.find({ sessionId: session._id });

//   const remainingSeconds = Math.max(
//     0,
//     Math.floor((new Date(session.serverDeadline).getTime() - Date.now()) / 1000)
//   );

//   return {
//     session: {
//       _id: session._id,
//       examId: session.examId._id,
//       examTitle: session.examId.title,
//       instructions: session.examId.instructions,
//       proctoringPolicy: session.examId.proctoringPolicy,
//       startTime: session.startTime,
//       serverDeadline: session.serverDeadline,
//       remainingSeconds,
//       status: session.status,
//       warningsCount: session.warningsCount,
//       attemptNumber: session.attemptNumber
//     },
//     questions: sanitizedQuestions,
//     savedAnswers: savedAnswers.map((a) => ({
//       questionId: a.questionId,
//       responseValue: a.responseValue,
//       isMarkedForReview: a.isMarkedForReview,
//       timeSpentSeconds: a.timeSpentSeconds,
//       lastSavedAt: a.lastSavedAt
//     }))
//   };
// };

// export const saveAnswer = async (sessionId, questionId, studentId, { responseValue, isMarkedForReview, timeSpentSeconds }) => {
//   const session = await ExamSession.findById(sessionId);
//   if (!session) {
//     const error = new Error('Exam session not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (session.studentId.toString() !== studentId.toString()) {
//     const error = new Error('Unauthorized session access.');
//     error.statusCode = 403;
//     throw error;
//   }

//   if (session.status !== SESSION_STATUS.ACTIVE) {
//     const error = new Error(`Cannot save answer: Exam session is ${session.status}`);
//     error.statusCode = 400;
//     throw error;
//   }

//   // Grace period of 10 seconds for latency
//   if (Date.now() > new Date(session.serverDeadline).getTime() + 10000) {
//     await evaluateSession(session, TERMINATION_REASON.TIME_EXPIRED);
//     const error = new Error('Examination time has expired. Your exam was submitted.');
//     error.statusCode = 400;
//     throw error;
//   }

//   const answer = await Answer.findOneAndUpdate(
//     { sessionId: session._id, questionId },
//     {
//       examId: session.examId,
//       studentId,
//       responseValue,
//       ...(isMarkedForReview !== undefined && { isMarkedForReview }),
//       ...(timeSpentSeconds !== undefined && { $inc: { timeSpentSeconds: Number(timeSpentSeconds) || 0 } }),
//       $inc: { revisionCount: 1 },
//       lastSavedAt: new Date()
//     },
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   );

//   return answer;
// };

// export const handleHeartbeat = async (sessionId, studentId) => {
//   const session = await ExamSession.findById(sessionId);
//   if (!session) {
//     const error = new Error('Session not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (session.studentId.toString() !== studentId.toString()) {
//     const error = new Error('Unauthorized session access.');
//     error.statusCode = 403;
//     throw error;
//   }

//   const now = Date.now();
//   const deadline = new Date(session.serverDeadline).getTime();
//   const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

//   if (session.status === SESSION_STATUS.ACTIVE && remainingSeconds <= 0) {
//     const result = await evaluateSession(session, TERMINATION_REASON.TIME_EXPIRED);
//     return {
//       status: SESSION_STATUS.COMPLETED,
//       remainingSeconds: 0,
//       isExpired: true,
//       result
//     };
//   }

//   session.lastHeartbeat = new Date();
//   await session.save();

//   return {
//     status: session.status,
//     remainingSeconds,
//     warningsCount: session.warningsCount,
//     isExpired: false
//   };
// };

// export const submitExamSession = async (sessionId, studentId, terminationReason = TERMINATION_REASON.STUDENT_SUBMITTED) => {
//   const session = await ExamSession.findById(sessionId);
//   if (!session) {
//     const error = new Error('Exam session not found');
//     error.statusCode = 404;
//     throw error;
//   }

//   if (studentId && session.studentId.toString() !== studentId.toString()) {
//     const error = new Error('Unauthorized session access.');
//     error.statusCode = 403;
//     throw error;
//   }

//   if ([SESSION_STATUS.COMPLETED, SESSION_STATUS.TERMINATED].includes(session.status)) {
//     // Idempotent: return existing result
//     const result = await evaluateSession(session, session.terminationReason);
//     return { session, result, alreadySubmitted: true };
//   }

//   const result = await evaluateSession(session, terminationReason);
//   return { session, result, alreadySubmitted: false };
// };





import { ExamSession } from '../models/ExamSession.js';
import { Examination } from '../models/Examination.js';
import { Question } from '../models/Question.js';
import { Answer } from '../models/Answer.js';
import {
  SESSION_STATUS,
  EXAM_STATUS,
  TERMINATION_REASON
} from '../config/constants.js';
import { evaluateSession } from './evaluationService.js';

export const startExamSession = async (
  examId,
  student,
  deviceCheck,
  ipAddress
) => {
  const exam = await Examination.findById(examId);

  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }

  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    const error = new Error('This examination is not open for attempts.');
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();

  if (
    exam.schedule?.startTime &&
    new Date(exam.schedule.startTime) > now
  ) {
    const error = new Error('This examination has not started yet.');
    error.statusCode = 403;
    throw error;
  }

  if (
    exam.schedule?.endTime &&
    new Date(exam.schedule.endTime) < now
  ) {
    const error = new Error('This examination has already ended.');
    error.statusCode = 403;
    throw error;
  }

  // Load this student's sessions for this exam.
  const existingAttempts = await ExamSession.find({
    examId: exam._id,
    studentId: student._id
  });

  // First, resume a valid active session.
  const activeSession = existingAttempts.find(
    (session) => session.status === SESSION_STATUS.ACTIVE
  );

  if (activeSession) {
    const deadline = new Date(activeSession.serverDeadline).getTime();

    if (deadline > now.getTime()) {
      return getSessionDetails(activeSession._id, student._id);
    }

    // The active session has expired. Finalize it before
    // deciding whether another attempt is permitted.
    // Finalize the expired session before checking attempts.
await evaluateSession(
  activeSession,
  TERMINATION_REASON.TIME_EXPIRED
);
  }

  // Count completed and terminated attempts after finalization.
  const refreshedAttempts = await ExamSession.find({
    examId: exam._id,
    studentId: student._id
  });

  const completedAttempts = refreshedAttempts.filter((session) =>
    [
      SESSION_STATUS.COMPLETED,
      SESSION_STATUS.TERMINATED
    ].includes(session.status)
  );

  const maxAttempts = Number(exam.maxAttempts ?? 1);

  if (completedAttempts.length >= maxAttempts) {
    const error = new Error(
      `Maximum attempts (${maxAttempts}) reached for this examination.`
    );
    error.statusCode = 403;
    throw error;
  }

  // Prepare the question order.
  let questionIds = [...exam.questions];

  if (exam.questionRandomization) {
    for (let i = questionIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionIds[i], questionIds[j]] = [
        questionIds[j],
        questionIds[i]
      ];
    }
  }

  if (questionIds.length === 0) {
    const error = new Error(
      'This examination does not contain any questions.'
    );
    error.statusCode = 400;
    throw error;
  }

  // Calculate the authoritative server deadline.
  const calculatedDeadline = new Date(
    now.getTime() + exam.durationMinutes * 60 * 1000
  );

  const examWindowEnd = exam.schedule?.endTime
    ? new Date(exam.schedule.endTime)
    : calculatedDeadline;

  const serverDeadline =
    calculatedDeadline < examWindowEnd
      ? calculatedDeadline
      : examWindowEnd;

  // Create the new session.
  const session = await ExamSession.create({
    examId: exam._id,
    studentId: student._id,
    attemptNumber: completedAttempts.length + 1,
    startTime: now,
    serverDeadline,
    status: SESSION_STATUS.ACTIVE,
    deviceCheckDetails: deviceCheck,
    questionOrder: questionIds,
    clientIp: ipAddress
  });

  return getSessionDetails(session._id, student._id);
};

export const getSessionDetails = async (sessionId, studentId) => {
  const session = await ExamSession.findById(sessionId).populate('examId');

  if (!session) {
    const error = new Error('Exam session not found');
    error.statusCode = 404;
    throw error;
  }

  if (
    studentId &&
    session.studentId.toString() !== studentId.toString()
  ) {
    const error = new Error('Unauthorized session access.');
    error.statusCode = 403;
    throw error;
  }

  if (!session.examId) {
    const error = new Error('Associated examination not found.');
    error.statusCode = 404;
    throw error;
  }

  const questionsRaw = await Question.find({
    _id: { $in: session.questionOrder }
  });

  const questionMap = new Map(
    questionsRaw.map((question) => [
      question._id.toString(),
      question
    ])
  );

  const sanitizedQuestions = session.questionOrder
    .map((questionId) => {
      const question = questionMap.get(questionId.toString());

      if (!question) return null;

      let options = question.options
        ? question.options.map((option) => ({
            id: option.id,
            text: option.text
          }))
        : [];

      if (
        session.examId.optionRandomization &&
        options.length > 0
      ) {
        options = [...options].sort(() => Math.random() - 0.5);
      }

      return {
        _id: question._id,
        text: question.text,
        type: question.type,
        options,
        marks: question.marks,
        difficulty: question.difficulty,
        category: question.category
      };
    })
    .filter(Boolean);

  const savedAnswers = await Answer.find({
    sessionId: session._id
  });

  const remainingSeconds = Math.max(
    0,
    Math.floor(
      (new Date(session.serverDeadline).getTime() - Date.now()) / 1000
    )
  );

  return {
    session: {
      _id: session._id,
      examId: session.examId._id,
      examTitle: session.examId.title,
      instructions: session.examId.instructions,
      proctoringPolicy: session.examId.proctoringPolicy,
      startTime: session.startTime,
      serverDeadline: session.serverDeadline,
      remainingSeconds,
      status: session.status,
      warningsCount: session.warningsCount,
      attemptNumber: session.attemptNumber
    },
    questions: sanitizedQuestions,
    savedAnswers: savedAnswers.map((answer) => ({
      questionId: answer.questionId,
      responseValue: answer.responseValue,
      isMarkedForReview: answer.isMarkedForReview,
      timeSpentSeconds: answer.timeSpentSeconds,
      lastSavedAt: answer.lastSavedAt
    }))
  };
};

export const saveAnswer = async (
  sessionId,
  questionId,
  studentId,
  { responseValue, isMarkedForReview, timeSpentSeconds }
) => {
  const session = await ExamSession.findById(sessionId);

  if (!session) {
    const error = new Error('Exam session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.studentId.toString() !== studentId.toString()) {
    const error = new Error('Unauthorized session access.');
    error.statusCode = 403;
    throw error;
  }

  if (session.status !== SESSION_STATUS.ACTIVE) {
    const error = new Error(
      `Cannot save answer: Exam session is ${session.status}`
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    Date.now() >
    new Date(session.serverDeadline).getTime() + 10000
  ) {
    await evaluateSession(session, TERMINATION_REASON.TIME_EXPIRED);

    const error = new Error(
      'Examination time has expired. Your exam was submitted.'
    );
    error.statusCode = 400;
    throw error;
  }

  const update = {
    examId: session.examId,
    studentId,
    responseValue,
    $inc: { revisionCount: 1 },
    lastSavedAt: new Date()
  };

  if (isMarkedForReview !== undefined) {
    update.isMarkedForReview = isMarkedForReview;
  }

  if (timeSpentSeconds !== undefined) {
    update.$inc.timeSpentSeconds =
      Number(timeSpentSeconds) || 0;
  }

  return Answer.findOneAndUpdate(
    { sessionId: session._id, questionId },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const handleHeartbeat = async (sessionId, studentId) => {
  const session = await ExamSession.findById(sessionId);

  if (!session) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  if (session.studentId.toString() !== studentId.toString()) {
    const error = new Error('Unauthorized session access.');
    error.statusCode = 403;
    throw error;
  }

  const now = Date.now();
  const deadline = new Date(session.serverDeadline).getTime();
  const remainingSeconds = Math.max(
    0,
    Math.floor((deadline - now) / 1000)
  );

  if (
    session.status === SESSION_STATUS.ACTIVE &&
    remainingSeconds <= 0
  ) {
    const result = await evaluateSession(
      session,
      TERMINATION_REASON.TIME_EXPIRED
    );

    return {
      status: SESSION_STATUS.COMPLETED,
      remainingSeconds: 0,
      isExpired: true,
      result
    };
  }

  session.lastHeartbeat = new Date();
  await session.save();

  return {
    status: session.status,
    remainingSeconds,
    warningsCount: session.warningsCount,
    isExpired: false
  };
};

export const submitExamSession = async (
  sessionId,
  studentId,
  terminationReason = TERMINATION_REASON.STUDENT_SUBMITTED
) => {
  const session = await ExamSession.findById(sessionId);

  if (!session) {
    const error = new Error('Exam session not found');
    error.statusCode = 404;
    throw error;
  }

  if (
    studentId &&
    session.studentId.toString() !== studentId.toString()
  ) {
    const error = new Error('Unauthorized session access.');
    error.statusCode = 403;
    throw error;
  }

  if (
    [
      SESSION_STATUS.COMPLETED,
      SESSION_STATUS.TERMINATED
    ].includes(session.status)
  ) {
    const result = await evaluateSession(
      session,
      session.terminationReason
    );

    return { session, result, alreadySubmitted: true };
  }

  const result = await evaluateSession(session, terminationReason);

  return { session, result, alreadySubmitted: false };
};
