import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSession',
      required: true
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
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    // responseValue can be an optionId (string), an array of optionIds (for multiple select), or text (for short answer)
    responseValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isMarkedForReview: {
      type: Boolean,
      default: false
    },
    revisionCount: {
      type: Number,
      default: 0
    },
    timeSpentSeconds: {
      type: Number,
      default: 0
    },
    firstViewedAt: {
      type: Date,
      default: Date.now
    },
    lastSavedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

answerSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });
answerSchema.index({ examId: 1, studentId: 1 });

export const Answer = mongoose.model('Answer', answerSchema);
