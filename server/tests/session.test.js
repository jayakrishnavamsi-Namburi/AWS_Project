/**
 * SecureProctor — Session Service Unit Tests
 * ==========================================
 * Tests: server deadline enforcement, duplicate submission protection,
 *        answer grace period, session state transitions.
 */

jest.mock('../src/config/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/env.js', () => ({
  config: { nodeEnv: 'test' },
}));

// ── Session deadline helpers (mirrored from sessionService.js) ────────────────

const SESSION_STATUS = {
  INITIALIZED: 'initialized',
  DEVICE_CHECK: 'device_check',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
};

const GRACE_PERIOD_MS = 10_000; // 10 seconds

function isDeadlinePassed(serverDeadline, graceMs = GRACE_PERIOD_MS) {
  return Date.now() > new Date(serverDeadline).getTime() + graceMs;
}

function canSaveAnswer(session) {
  if (session.status !== SESSION_STATUS.ACTIVE) {
    return { allowed: false, reason: 'Session is not active' };
  }
  if (isDeadlinePassed(session.serverDeadline)) {
    return { allowed: false, reason: 'Exam deadline has passed' };
  }
  return { allowed: true };
}

function canSubmit(session) {
  if (session.status === SESSION_STATUS.COMPLETED) {
    return { allowed: false, reason: 'Already submitted', idempotent: true };
  }
  if (session.status === SESSION_STATUS.TERMINATED) {
    return { allowed: false, reason: 'Session terminated' };
  }
  if (session.status !== SESSION_STATUS.ACTIVE) {
    return { allowed: false, reason: 'Session not active' };
  }
  return { allowed: true };
}

function computeQuestionOrder(questionIds, randomize = false) {
  if (!randomize) return [...questionIds];
  const arr = [...questionIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Server Deadline Enforcement', () => {
  test('allows saving when deadline is in the future', () => {
    const session = {
      status: SESSION_STATUS.ACTIVE,
      serverDeadline: new Date(Date.now() + 60_000), // 1 minute ahead
    };
    const result = canSaveAnswer(session);
    expect(result.allowed).toBe(true);
  });

  test('allows saving within 10-second grace period after deadline', () => {
    const session = {
      status: SESSION_STATUS.ACTIVE,
      serverDeadline: new Date(Date.now() - 5_000), // 5s ago, inside grace
    };
    const result = canSaveAnswer(session);
    expect(result.allowed).toBe(true);
  });

  test('blocks saving after grace period (>10s after deadline)', () => {
    const session = {
      status: SESSION_STATUS.ACTIVE,
      serverDeadline: new Date(Date.now() - 20_000), // 20s ago, outside grace
    };
    const result = canSaveAnswer(session);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/deadline/i);
  });

  test('blocks saving if session is not active', () => {
    const session = {
      status: SESSION_STATUS.COMPLETED,
      serverDeadline: new Date(Date.now() + 60_000),
    };
    const result = canSaveAnswer(session);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not active/i);
  });

  test('blocks saving if session is terminated', () => {
    const session = {
      status: SESSION_STATUS.TERMINATED,
      serverDeadline: new Date(Date.now() + 60_000),
    };
    const result = canSaveAnswer(session);
    expect(result.allowed).toBe(false);
  });
});

describe('Duplicate Submission Protection', () => {
  test('allows submission when session is active', () => {
    const session = { status: SESSION_STATUS.ACTIVE };
    const result = canSubmit(session);
    expect(result.allowed).toBe(true);
  });

  test('blocks duplicate submission — marks as idempotent', () => {
    const session = { status: SESSION_STATUS.COMPLETED };
    const result = canSubmit(session);
    expect(result.allowed).toBe(false);
    expect(result.idempotent).toBe(true);
  });

  test('blocks submission of terminated session', () => {
    const session = { status: SESSION_STATUS.TERMINATED };
    const result = canSubmit(session);
    expect(result.allowed).toBe(false);
    expect(result.idempotent).toBeUndefined();
  });

  test('blocks submission of unstarted (initialized) session', () => {
    const session = { status: SESSION_STATUS.INITIALIZED };
    const result = canSubmit(session);
    expect(result.allowed).toBe(false);
  });
});

describe('Question Order Randomization', () => {
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5'];

  test('non-randomized order preserves original order', () => {
    const order = computeQuestionOrder(ids, false);
    expect(order).toEqual(ids);
  });

  test('randomized order contains same elements', () => {
    const order = computeQuestionOrder(ids, true);
    expect(order.sort()).toEqual([...ids].sort());
  });

  test('randomized order has same length as input', () => {
    const order = computeQuestionOrder(ids, true);
    expect(order).toHaveLength(ids.length);
  });

  test('randomization produces different order (probabilistic)', () => {
    // Run 20 times and expect at least one different permutation
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(JSON.stringify(computeQuestionOrder(ids, true)));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  test('does not mutate the original array', () => {
    const original = [...ids];
    computeQuestionOrder(ids, true);
    expect(ids).toEqual(original);
  });
});

describe('Session State Machine', () => {
  const validTransitions = {
    [SESSION_STATUS.INITIALIZED]: [SESSION_STATUS.DEVICE_CHECK],
    [SESSION_STATUS.DEVICE_CHECK]: [SESSION_STATUS.ACTIVE],
    [SESSION_STATUS.ACTIVE]: [SESSION_STATUS.COMPLETED, SESSION_STATUS.TERMINATED],
    [SESSION_STATUS.COMPLETED]: [],
    [SESSION_STATUS.TERMINATED]: [],
  };

  function canTransition(from, to) {
    return (validTransitions[from] || []).includes(to);
  }

  test('initialized → device_check is valid', () => {
    expect(canTransition(SESSION_STATUS.INITIALIZED, SESSION_STATUS.DEVICE_CHECK)).toBe(true);
  });

  test('device_check → active is valid', () => {
    expect(canTransition(SESSION_STATUS.DEVICE_CHECK, SESSION_STATUS.ACTIVE)).toBe(true);
  });

  test('active → completed is valid', () => {
    expect(canTransition(SESSION_STATUS.ACTIVE, SESSION_STATUS.COMPLETED)).toBe(true);
  });

  test('active → terminated is valid (proctor action)', () => {
    expect(canTransition(SESSION_STATUS.ACTIVE, SESSION_STATUS.TERMINATED)).toBe(true);
  });

  test('completed → active is invalid (no re-opening)', () => {
    expect(canTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ACTIVE)).toBe(false);
  });

  test('terminated → completed is invalid', () => {
    expect(canTransition(SESSION_STATUS.TERMINATED, SESSION_STATUS.COMPLETED)).toBe(false);
  });

  test('initialized → active skipping device check is invalid', () => {
    expect(canTransition(SESSION_STATUS.INITIALIZED, SESSION_STATUS.ACTIVE)).toBe(false);
  });
});
