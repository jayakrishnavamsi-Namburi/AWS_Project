import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  schedule: z.object({
    startTime: z.string().or(z.date()),
    endTime: z.string().or(z.date())
  }),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  passingScore: z.number().min(0),
  questions: z.array(z.string()).optional(),
  questionRandomization: z.boolean().default(true),
  optionRandomization: z.boolean().default(true),
  negativeMarkingEnabled: z.boolean().default(false),
  maxAttempts: z.number().min(1).default(1),
  proctoringPolicy: z.object({
    webcamRequired: z.boolean().default(true),
    audioRequired: z.boolean().default(true),
    mobileCameraRequired: z.boolean().default(false),
    fullscreenRequired: z.boolean().default(true),
    tabBlurTolerance: z.number().default(3),
    warningThreshold: z.number().default(3),
    autoSubmitThreshold: z.number().default(5)
  }).optional(),
  publicationSettings: z.object({
    isPublished: z.boolean().default(false),
    resultReleasePolicy: z.enum(['immediate', 'after_exam_end', 'manual']).default('immediate')
  }).optional(),
  assignedStudents: z.array(z.string()).optional()
});

export const updateExamSchema = createExamSchema.partial();

export const assignStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student ID is required')
});
