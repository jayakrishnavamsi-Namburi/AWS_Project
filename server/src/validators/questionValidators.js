import { z } from 'zod';
import { QUESTION_TYPES } from '../config/constants.js';

export const createQuestionSchema = z.object({
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  type: z.enum([
    QUESTION_TYPES.MCQ,
    QUESTION_TYPES.MULTIPLE_SELECT,
    QUESTION_TYPES.TRUE_FALSE,
    QUESTION_TYPES.SHORT_ANSWER
  ]),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, 'Option text is required'),
      isCorrect: z.boolean().default(false)
    })
  ).optional(),
  shortAnswerAcceptedAnswers: z.array(z.string()).optional(),
  marks: z.number().min(0.5).default(1),
  negativeMarks: z.number().min(0).default(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  category: z.string().default('General'),
  explanation: z.string().optional()
});

export const updateQuestionSchema = createQuestionSchema.partial();
