import mongoose from 'mongoose';
import { PROCTOR_EVENT_TYPES, SEVERITY_LEVELS } from '../config/constants.js';

const proctorEventSchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      enum: Object.values(PROCTOR_EVENT_TYPES),
      required: true
    },
    severity: {
      type: String,
      enum: Object.values(SEVERITY_LEVELS),
      default: SEVERITY_LEVELS.MEDIUM
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reviewStatus: {
      type: String,
      enum: ['unreviewed', 'reviewed_benign', 'reviewed_violation'],
      default: 'unreviewed'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNotes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

proctorEventSchema.index({ sessionId: 1, timestamp: -1 });
proctorEventSchema.index({ examId: 1, eventType: 1 });
proctorEventSchema.index({ reviewStatus: 1 });

export const ProctorEvent = mongoose.model('ProctorEvent', proctorEventSchema);
