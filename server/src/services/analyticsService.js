import { User } from '../models/User.js';
import { Examination } from '../models/Examination.js';
import { ExamSession } from '../models/ExamSession.js';
import { Result } from '../models/Result.js';
import { ProctorEvent } from '../models/ProctorEvent.js';
import { ROLES, EXAM_STATUS, SESSION_STATUS } from '../config/constants.js';

export const getAdminDashboardStats = async () => {
  const [
    totalStudents,
    totalProctors,
    totalExams,
    activeExams,
    activeSessionsCount,
    completedSessionsCount,
    recentSessions,
    recentEvents,
    scoreStats
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.STUDENT }),
    User.countDocuments({ role: ROLES.PROCTOR }),
    Examination.countDocuments({ status: { $ne: EXAM_STATUS.CANCELLED } }),
    Examination.countDocuments({ status: EXAM_STATUS.PUBLISHED }),
    ExamSession.countDocuments({ status: SESSION_STATUS.ACTIVE }),
    ExamSession.countDocuments({ status: SESSION_STATUS.COMPLETED }),
    ExamSession.find()
      .populate('studentId', 'name email studentId')
      .populate('examId', 'title')
      .sort({ createdAt: -1 })
      .limit(8),
    ProctorEvent.find()
      .populate('studentId', 'name email')
      .populate('examId', 'title')
      .sort({ timestamp: -1 })
      .limit(10),
    Result.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$percentage' },
          passCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
          totalCount: { $sum: 1 }
        }
      }
    ])
  ]);

  // Violation distribution by type
  const eventDistribution = await ProctorEvent.aggregate([
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const stats = scoreStats[0] || { avgScore: 0, passCount: 0, totalCount: 0 };
  const passRate = stats.totalCount > 0 ? Math.round((stats.passCount / stats.totalCount) * 100) : 0;

  return {
    overview: {
      totalStudents,
      totalProctors,
      totalExams,
      activeExams,
      activeSessions: activeSessionsCount,
      completedSessions: completedSessionsCount,
      avgScore: Math.round((stats.avgScore || 0) * 10) / 10,
      passRate
    },
    eventDistribution: eventDistribution.map((item) => ({
      type: item._id,
      count: item.count
    })),
    recentSessions,
    recentEvents
  };
};

export const getExamAnalytics = async (examId) => {
  const exam = await Examination.findById(examId);
  if (!exam) {
    const error = new Error('Examination not found');
    error.statusCode = 404;
    throw error;
  }

  const [results, sessions, events] = await Promise.all([
    Result.find({ examId }).populate('studentId', 'name email studentId department'),
    ExamSession.find({ examId }).populate('studentId', 'name email studentId'),
    ProctorEvent.find({ examId })
  ]);

  const totalAttempts = sessions.length;
  const completedAttempts = results.length;
  const passedAttempts = results.filter((r) => r.isPassed).length;
  const avgScore = results.length > 0
    ? results.reduce((acc, r) => acc + r.percentage, 0) / results.length
    : 0;

  // Score distribution brackets [0-20, 21-40, 41-60, 61-80, 81-100]
  const brackets = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 }
  ];

  for (const res of results) {
    const pct = res.percentage;
    if (pct <= 20) brackets[0].count++;
    else if (pct <= 40) brackets[1].count++;
    else if (pct <= 60) brackets[2].count++;
    else if (pct <= 80) brackets[3].count++;
    else brackets[4].count++;
  }

  return {
    exam: {
      _id: exam._id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingScore: exam.passingScore
    },
    metrics: {
      totalAttempts,
      completedAttempts,
      passedAttempts,
      passRate: completedAttempts > 0 ? Math.round((passedAttempts / completedAttempts) * 100) : 0,
      averagePercentage: Math.round(avgScore * 10) / 10,
      totalProctorEvents: events.length
    },
    scoreDistribution: brackets,
    results
  };
};

export const exportExamResultsCSV = async (examId) => {
  const [exam, results, sessions] = await Promise.all([
    Examination.findById(examId),
    Result.find({ examId }).populate('studentId', 'name email studentId department'),
    ExamSession.find({ examId })
  ]);

  if (!exam) {
    throw new Error('Exam not found for export');
  }

  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));

  const headers = ['Student Name', 'Email', 'Student ID', 'Department', 'Score', 'Max Marks', 'Percentage', 'Passed', 'Violations', 'Submission Time'];
  const rows = results.map((r) => {
    const session = sessionMap.get(r.sessionId.toString());
    return [
      `"${r.studentId?.name || 'N/A'}"`,
      `"${r.studentId?.email || 'N/A'}"`,
      `"${r.studentId?.studentId || 'N/A'}"`,
      `"${r.studentId?.department || 'N/A'}"`,
      r.totalScore,
      r.maxMarks,
      `${r.percentage}%`,
      r.isPassed ? 'YES' : 'NO',
      session?.warningsCount || 0,
      `"${r.evaluatedAt ? new Date(r.evaluatedAt).toISOString() : 'N/A'}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
