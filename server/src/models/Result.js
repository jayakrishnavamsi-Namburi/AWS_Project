import mongoose from 'mongoose';

const questionBreakdownSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionText: String,
    questionType: String,
    studentResponse: mongoose.Schema.Types.Mixed,
    correctResponse: mongoose.Schema.Types.Mixed,
    maxMarks: Number,
    marksAwarded: Number,
    isCorrect: Boolean,
    explanation: String,
    timeSpentSeconds: Number
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true,
      unique: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0
    },
    maxMarks: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true,
      default: 0
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false
    },
    correctAnswersCount: {
      type: Number,
      default: 0
    },
    incorrectAnswersCount: {
      type: Number,
      default: 0
    },
    unansweredCount: {
      type: Number,
      default: 0
    },
    detailedBreakdown: [questionBreakdownSchema],
    status: {
      type: String,
      enum: ['evaluated', 'pending_review'],
      default: 'evaluated'
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

resultSchema.index({ examId: 1, studentId: 1 });
resultSchema.index({ studentId: 1 });

export const Result = mongoose.model('Result', resultSchema);
