import mongoose from 'mongoose';
import { SESSION_STATUS, TERMINATION_REASON } from '../config/constants.js';

const examSessionSchema = new mongoose.Schema(
  {
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
    attemptNumber: {
      type: Number,
      default: 1
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    serverDeadline: {
      type: Date,
      required: true
    },
    submissionTime: {
      type: Date
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.INITIALIZED
    },
    terminationReason: {
      type: String,
      enum: Object.values(TERMINATION_REASON)
    },
    deviceCheckDetails: {
      cameraVerified: { type: Boolean, default: false },
      micVerified: { type: Boolean, default: false },
      fullscreenVerified: { type: Boolean, default: false },
      browserInfo: { type: String }
    },
    questionOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      }
    ],
    clientIp: {
      type: String
    },
    warningsCount: {
      type: Number,
      default: 0
    },
    finalScore: {
      type: Number
    },
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result'
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

examSessionSchema.index({ examId: 1, studentId: 1 });
examSessionSchema.index({ status: 1 });

export const ExamSession = mongoose.model('ExamSession', examSessionSchema);
