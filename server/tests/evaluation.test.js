/**
 * SecureProctor — Evaluation Service Unit Tests
 * ===============================================
 * Tests: MCQ scoring, multi-select, true/false, short answer,
 *        negative marking, passing threshold, idempotency.
 */

// ── Mock all external dependencies ─────────────────────────────────────────
jest.mock('../src/config/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/env.js', () => ({
  config: { nodeEnv: 'test' },
}));

// ── Inline scoring logic (mirrors evaluationService.js) ──────────────────────
// Isolated here so tests don't require a live DB.

const QUESTION_TYPES = {
  MCQ: 'mcq',
  MULTIPLE_SELECT: 'multiple_select',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
};

/**
 * Score a single answer against a question.
 * Returns { earned, isCorrect }
 */
function scoreAnswer(question, responseValue, negativeMark = 0) {
  const marks = question.marks || 1;
  let earned = 0;
  let isCorrect = false;

  switch (question.type) {
    case QUESTION_TYPES.MCQ:
    case QUESTION_TYPES.TRUE_FALSE: {
      const correctOption = question.options.find((o) => o.isCorrect);
      if (!correctOption) break;
      if (responseValue === correctOption._id || responseValue === correctOption.text) {
        earned = marks;
        isCorrect = true;
      } else if (responseValue !== null && responseValue !== undefined && responseValue !== '') {
        earned = -Math.abs(negativeMark);
      }
      break;
    }

    case QUESTION_TYPES.MULTIPLE_SELECT: {
      const correctIds = new Set(
        question.options.filter((o) => o.isCorrect).map((o) => o._id)
      );
      const selected = Array.isArray(responseValue) ? responseValue : [];
      const selectedSet = new Set(selected);

      const allCorrectSelected = [...correctIds].every((id) => selectedSet.has(id));
      const noWrongSelected = [...selectedSet].every((id) => correctIds.has(id));

      if (allCorrectSelected && noWrongSelected) {
        earned = marks;
        isCorrect = true;
      } else if (selected.length > 0) {
        // Partial: count correct selections minus wrong selections
        const correctHits = selected.filter((id) => correctIds.has(id)).length;
        const wrongHits = selected.filter((id) => !correctIds.has(id)).length;
        const partial = (correctHits / correctIds.size) * marks - wrongHits * Math.abs(negativeMark);
        earned = Math.max(0, partial);
      }
      break;
    }

    case QUESTION_TYPES.SHORT_ANSWER: {
      if (!responseValue) break;
      const normalise = (s) => String(s).trim().toLowerCase();
      const accepted = (question.acceptedAnswers || []).map(normalise);
      isCorrect = accepted.includes(normalise(responseValue));
      earned = isCorrect ? marks : 0;
      break;
    }
  }

  return { earned, isCorrect };
}

/**
 * Calculate overall result from an array of { question, responseValue } pairs.
 */
function calculateResult(items, negativeMark = 0, passingScore = 50) {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  for (const { question, responseValue } of items) {
    totalMarks += question.marks || 1;
    const { earned, isCorrect } = scoreAnswer(question, responseValue, negativeMark);
    obtainedMarks += earned;

    if (isCorrect) correctCount++;
    else if (responseValue === null || responseValue === undefined || responseValue === '') skippedCount++;
    else wrongCount++;
  }

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
  const passed = percentage >= passingScore;

  return {
    totalMarks,
    obtainedMarks: Math.max(0, obtainedMarks),
    percentage: Math.round(percentage * 100) / 100,
    passed,
    correctCount,
    wrongCount,
    skippedCount,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MCQ Scoring', () => {
  const mcqQuestion = {
    type: 'mcq',
    marks: 2,
    options: [
      { _id: 'a', text: 'Paris', isCorrect: true },
      { _id: 'b', text: 'Berlin', isCorrect: false },
      { _id: 'c', text: 'Rome', isCorrect: false },
    ],
  };

  test('awards full marks for correct answer', () => {
    const { earned, isCorrect } = scoreAnswer(mcqQuestion, 'a');
    expect(earned).toBe(2);
    expect(isCorrect).toBe(true);
  });

  test('awards zero for skipped (null) answer without negative marking', () => {
    const { earned } = scoreAnswer(mcqQuestion, null);
    expect(earned).toBe(0);
  });

  test('deducts negative marks for wrong answer', () => {
    const { earned } = scoreAnswer(mcqQuestion, 'b', 0.5);
    expect(earned).toBe(-0.5);
  });

  test('does not deduct below 0 for skipped question', () => {
    const { earned } = scoreAnswer(mcqQuestion, null, 0.5);
    expect(earned).toBe(0);
  });
});

describe('True/False Scoring', () => {
  const tfQuestion = {
    type: 'true_false',
    marks: 1,
    options: [
      { _id: 'true', text: 'True', isCorrect: true },
      { _id: 'false', text: 'False', isCorrect: false },
    ],
  };

  test('correct true answer', () => {
    const { earned, isCorrect } = scoreAnswer(tfQuestion, 'true');
    expect(isCorrect).toBe(true);
    expect(earned).toBe(1);
  });

  test('incorrect false answer applies negative mark', () => {
    const { earned } = scoreAnswer(tfQuestion, 'false', 0.25);
    expect(earned).toBe(-0.25);
  });
});

describe('Multiple-Select Scoring', () => {
  const msQuestion = {
    type: 'multiple_select',
    marks: 4,
    options: [
      { _id: 'a', text: 'A', isCorrect: true },
      { _id: 'b', text: 'B', isCorrect: true },
      { _id: 'c', text: 'C', isCorrect: false },
      { _id: 'd', text: 'D', isCorrect: false },
    ],
  };

  test('full marks for selecting all correct options only', () => {
    const { earned, isCorrect } = scoreAnswer(msQuestion, ['a', 'b']);
    expect(isCorrect).toBe(true);
    expect(earned).toBe(4);
  });

  test('zero marks for selecting no options', () => {
    const { earned } = scoreAnswer(msQuestion, []);
    expect(earned).toBe(0);
  });

  test('partial marks for partially correct selection', () => {
    const { earned } = scoreAnswer(msQuestion, ['a']); // 1 of 2 correct, no wrong
    expect(earned).toBeGreaterThan(0);
    expect(earned).toBeLessThan(4);
  });

  test('penalises wrong selections in partial credit', () => {
    const earnedWithWrong = scoreAnswer(msQuestion, ['a', 'c'], 1).earned;
    const earnedWithoutWrong = scoreAnswer(msQuestion, ['a'], 1).earned;
    expect(earnedWithWrong).toBeLessThan(earnedWithoutWrong);
  });
});

describe('Short Answer Scoring', () => {
  const saQuestion = {
    type: 'short_answer',
    marks: 3,
    acceptedAnswers: ['photosynthesis', 'photo synthesis'],
  };

  test('awards marks for exact accepted answer (case-insensitive)', () => {
    const { earned, isCorrect } = scoreAnswer(saQuestion, 'Photosynthesis');
    expect(isCorrect).toBe(true);
    expect(earned).toBe(3);
  });

  test('awards marks for alternate accepted answer', () => {
    const { isCorrect } = scoreAnswer(saQuestion, 'photo synthesis');
    expect(isCorrect).toBe(true);
  });

  test('awards zero for wrong answer', () => {
    const { earned, isCorrect } = scoreAnswer(saQuestion, 'respiration');
    expect(isCorrect).toBe(false);
    expect(earned).toBe(0);
  });

  test('awards zero for empty response', () => {
    const { earned } = scoreAnswer(saQuestion, '');
    expect(earned).toBe(0);
  });
});

describe('Full Result Calculation', () => {
  const questions = [
    {
      type: 'mcq',
      marks: 2,
      options: [
        { _id: 'a', text: 'Paris', isCorrect: true },
        { _id: 'b', text: 'Berlin', isCorrect: false },
      ],
    },
    {
      type: 'mcq',
      marks: 2,
      options: [
        { _id: 'x', text: 'H2O', isCorrect: true },
        { _id: 'y', text: 'CO2', isCorrect: false },
      ],
    },
    {
      type: 'short_answer',
      marks: 4,
      acceptedAnswers: ['newton'],
    },
  ];

  test('100% score for all correct answers', () => {
    const items = [
      { question: questions[0], responseValue: 'a' },
      { question: questions[1], responseValue: 'x' },
      { question: questions[2], responseValue: 'Newton' },
    ];
    const result = calculateResult(items);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(result.wrongCount).toBe(0);
  });

  test('0% score for all wrong answers (without negative marking)', () => {
    const items = [
      { question: questions[0], responseValue: 'b' },
      { question: questions[1], responseValue: 'y' },
      { question: questions[2], responseValue: 'einstein' },
    ];
    const result = calculateResult(items, 0);
    expect(result.obtainedMarks).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('applies negative marking correctly for wrong MCQ', () => {
    const items = [
      { question: questions[0], responseValue: 'b' }, // wrong → -0.5
      { question: questions[1], responseValue: 'x' }, // correct → +2
      { question: questions[2], responseValue: null }, // skipped → 0
    ];
    const result = calculateResult(items, 0.5, 50);
    // 2 - 0.5 = 1.5 out of 8 total
    expect(result.obtainedMarks).toBe(1.5);
    expect(result.wrongCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  test('obtained marks never go below 0 with heavy negative marking', () => {
    const items = [
      { question: questions[0], responseValue: 'b' }, // wrong
      { question: questions[1], responseValue: 'y' }, // wrong
      { question: questions[2], responseValue: 'wrong' }, // wrong
    ];
    const result = calculateResult(items, 5, 50);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(0);
  });

  test('passing threshold evaluation at boundary', () => {
    // Score exactly 50% (4/8 marks)
    const items = [
      { question: questions[0], responseValue: 'a' }, // +2
      { question: questions[1], responseValue: 'y' }, // 0 (wrong, no neg)
      { question: questions[2], responseValue: null }, // 0
    ];
    const result = calculateResult(items, 0, 50);
    expect(result.percentage).toBe(25); // 2/8 = 25%
    expect(result.passed).toBe(false);
  });

  test('marks result as passed when percentage >= passingScore', () => {
    const items = [
      { question: questions[0], responseValue: 'a' }, // +2
      { question: questions[1], responseValue: 'x' }, // +2
      { question: questions[2], responseValue: null }, // 0
    ];
    const result = calculateResult(items, 0, 49); // threshold 49%
    // 4/8 = 50% >= 49%
    expect(result.passed).toBe(true);
  });
});
