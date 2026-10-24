import { Result } from '../models/Result.js';
import { Examination } from '../models/Examination.js';
import { Question } from '../models/Question.js';
import { Answer } from '../models/Answer.js';
import { SESSION_STATUS, TERMINATION_REASON, QUESTION_TYPES } from '../config/constants.js';

export const evaluateSession = async (session, terminationReason = TERMINATION_REASON.STUDENT_SUBMITTED) => {
  // Check if result already exists (idempotency)
  const existingResult = await Result.findOne({ sessionId: session._id });
  if (existingResult) {
    return existingResult;
  }

  const exam = await Examination.findById(session.examId);
  if (!exam) {
    throw new Error('Examination not found for evaluation');
  }

  const [questions, studentAnswers] = await Promise.all([
    Question.find({ _id: { $in: session.questionOrder || exam.questions } }),
    Answer.find({ sessionId: session._id })
  ]);

  const answersMap = new Map(studentAnswers.map((a) => [a.questionId.toString(), a]));

  let totalScore = 0;
  let maxMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const detailedBreakdown = [];

  for (const question of questions) {
    const qMarks = question.marks || 1;
    const qNeg = exam.negativeMarkingEnabled ? (question.negativeMarks || 0) : 0;
    maxMarks += qMarks;

    const answer = answersMap.get(question._id.toString());
    const studentResponse = answer ? answer.responseValue : null;
    const timeSpent = answer ? (answer.timeSpentSeconds || 0) : 0;

    let isCorrect = false;
    let marksAwarded = 0;
    let correctResponse = null;

    if (studentResponse === null || studentResponse === undefined || studentResponse === '') {
      unansweredCount++;
      marksAwarded = 0;
      isCorrect = false;
    } else {
      switch (question.type) {
        case QUESTION_TYPES.MCQ:
        case QUESTION_TYPES.TRUE_FALSE: {
          const correctOption = question.options.find((o) => o.isCorrect);
          correctResponse = correctOption ? correctOption.id : null;
          if (correctOption && String(studentResponse) === String(correctOption.id)) {
            isCorrect = true;
            marksAwarded = qMarks;
            correctCount++;
          } else {
            isCorrect = false;
            marksAwarded = -qNeg;
            incorrectCount++;
          }
          break;
        }

        case QUESTION_TYPES.MULTIPLE_SELECT: {
          const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => String(o.id)).sort();
          correctResponse = correctOptionIds;

          const studentSelected = Array.isArray(studentResponse)
            ? studentResponse.map(String).sort()
            : [String(studentResponse)];

          const isMatch =
            correctOptionIds.length === studentSelected.length &&
            correctOptionIds.every((val, index) => val === studentSelected[index]);

          if (isMatch) {
            isCorrect = true;
            marksAwarded = qMarks;
            correctCount++;
          } else {
            isCorrect = false;
            marksAwarded = -qNeg;
            incorrectCount++;
          }
          break;
        }

        case QUESTION_TYPES.SHORT_ANSWER: {
          correctResponse = question.shortAnswerAcceptedAnswers || [];
          const normalizedStudent = String(studentResponse).trim().toLowerCase();
          const matches = (question.shortAnswerAcceptedAnswers || []).some(
            (accepted) => accepted.trim().toLowerCase() === normalizedStudent
          );

          if (matches) {
            isCorrect = true;
            marksAwarded = qMarks;
            correctCount++;
          } else {
            isCorrect = false;
            marksAwarded = -qNeg;
            incorrectCount++;
          }
          break;
        }

        default:
          marksAwarded = 0;
          break;
      }
    }

    totalScore += marksAwarded;

    detailedBreakdown.push({
      questionId: question._id,
      questionText: question.text,
      questionType: question.type,
      studentResponse,
      correctResponse,
      maxMarks: qMarks,
      marksAwarded,
      isCorrect,
      explanation: question.explanation || '',
      timeSpentSeconds: timeSpent
    });
  }

  // Ensure totalScore is not below 0 if negative marking was heavy
  totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 10000) / 100 : 0;
  const isPassed = totalScore >= (exam.passingScore || 0);

  const result = await Result.create({
    sessionId: session._id,
    examId: exam._id,
    studentId: session.studentId,
    totalScore,
    maxMarks,
    percentage,
    isPassed,
    correctAnswersCount: correctCount,
    incorrectAnswersCount: incorrectCount,
    unansweredCount,
    detailedBreakdown,
    status: 'evaluated',
    isPublished: exam.publicationSettings?.isPublished ?? true,
    evaluatedAt: new Date()
  });

  // Update session status
  session.status =
    terminationReason === TERMINATION_REASON.PROCTOR_TERMINATED ||
    terminationReason === TERMINATION_REASON.AUTO_ESCALATION
      ? SESSION_STATUS.TERMINATED
      : SESSION_STATUS.COMPLETED;

  session.terminationReason = terminationReason;
  session.submissionTime = new Date();
  session.finalScore = totalScore;
  session.resultId = result._id;
  await session.save();

  return result;
};
