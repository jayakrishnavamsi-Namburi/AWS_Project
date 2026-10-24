import mongoose from 'mongoose';
import { EXAM_STATUS } from '../config/constants.js';

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Examination title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      default: 'Please maintain a quiet environment. Stay in fullscreen mode at all times. Do not switch tabs or use external resources.'
    },
    schedule: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true }
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: [1, 'Duration must be at least 1 minute']
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 0
    },
    passingScore: {
      type: Number,
      required: true,
      default: 0
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      }
    ],
    questionRandomization: {
      type: Boolean,
      default: true
    },
    optionRandomization: {
      type: Boolean,
      default: true
    },
    negativeMarkingEnabled: {
      type: Boolean,
      default: false
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    proctoringPolicy: {
      webcamRequired: { type: Boolean, default: true },
      audioRequired: { type: Boolean, default: true },
      mobileCameraRequired: { type: Boolean, default: false },
      fullscreenRequired: { type: Boolean, default: true },
      tabBlurTolerance: { type: Number, default: 3 },
      warningThreshold: { type: Number, default: 3 },
      autoSubmitThreshold: { type: Number, default: 5 }
    },
    publicationSettings: {
      isPublished: { type: Boolean, default: false },
      resultReleasePolicy: {
        type: String,
        enum: ['immediate', 'after_exam_end', 'manual'],
        default: 'immediate'
      }
    },
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(EXAM_STATUS),
      default: EXAM_STATUS.DRAFT
    }
  },
  {
    timestamps: true
  }
);

examinationSchema.index({ status: 1, 'schedule.startTime': 1, 'schedule.endTime': 1 });
examinationSchema.index({ createdBy: 1 });

export const Examination = mongoose.model('Examination', examinationSchema);
