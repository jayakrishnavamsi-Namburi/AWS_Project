import mongoose from 'mongoose';
import { QUESTION_TYPES } from '../config/constants.js';

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(QUESTION_TYPES),
      default: QUESTION_TYPES.MCQ,
      required: true
    },
    options: [optionSchema],
    shortAnswerAcceptedAnswers: [{ type: String, trim: true }],
    marks: {
      type: Number,
      default: 1,
      min: [0.5, 'Marks cannot be less than 0.5']
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be less than 0']
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    explanation: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

questionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
questionSchema.index({ createdBy: 1 });

export const Question = mongoose.model('Question', questionSchema);
