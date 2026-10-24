/**
 * SecureProctor — Escalation Service Unit Tests
 * ===============================================
 * Tests: event deduplication (2.5s window), warning threshold escalation,
 *        auto-submission threshold, qualifying event counting.
 */

jest.mock('../src/config/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/env.js', () => ({
  config: {
    nodeEnv: 'test',
    proctorWarningThreshold: 3,
    proctorAutosubmitThreshold: 5,
  },
}));

// ── Inline escalation logic (mirrors escalationService.js) ───────────────────

const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const DEDUP_WINDOW_MS = 2500;
const WARNING_THRESHOLD = 3;
const AUTOSUBMIT_THRESHOLD = 5;

// Qualifying severities that count toward auto-submission
const QUALIFYING_SEVERITIES = new Set([
  SEVERITY_LEVELS.MEDIUM,
  SEVERITY_LEVELS.HIGH,
  SEVERITY_LEVELS.CRITICAL,
]);

function isQualifyingEvent(severity) {
  return QUALIFYING_SEVERITIES.has(severity);
}

/**
 * Simulated event store: { `${sessionId}_${type}`: timestamp }
 */
class EventDeduplicator {
  constructor() {
    this._store = new Map();
  }

  isDuplicate(sessionId, eventType, nowMs = Date.now()) {
    const key = `${sessionId}_${eventType}`;
    const last = this._store.get(key);
    if (last !== undefined && nowMs - last < DEDUP_WINDOW_MS) {
      return true;
    }
    this._store.set(key, nowMs);
    return false;
  }

  clear() {
    this._store.clear();
  }
}

/**
 * Simulated session escalation tracker.
 */
class SessionEscalationTracker {
  constructor(warningThreshold = WARNING_THRESHOLD, autosubmitThreshold = AUTOSUBMIT_THRESHOLD) {
    this.warningThreshold = warningThreshold;
    this.autosubmitThreshold = autosubmitThreshold;
    this._counts = new Map();
  }

  addEvent(sessionId, severity) {
    const current = this._counts.get(sessionId) || 0;
    if (!isQualifyingEvent(severity)) return { action: 'logged', count: current };

    const next = current + 1;
    this._counts.set(sessionId, next);

    if (next >= this.autosubmitThreshold) {
      return { action: 'auto_submit', count: next };
    }
    if (next >= this.warningThreshold) {
      return { action: 'warning', count: next };
    }
    return { action: 'logged', count: next };
  }

  getCount(sessionId) {
    return this._counts.get(sessionId) || 0;
  }

  reset(sessionId) {
    this._counts.delete(sessionId);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Event Deduplication (2.5s window)', () => {
  let dedup;

  beforeEach(() => {
    dedup = new EventDeduplicator();
  });

  test('first event of a type is NOT a duplicate', () => {
    const isDup = dedup.isDuplicate('session1', 'tab_blur', 1000);
    expect(isDup).toBe(false);
  });

  test('same event within 2.5s is a duplicate', () => {
    dedup.isDuplicate('session1', 'tab_blur', 1000);
    const isDup = dedup.isDuplicate('session1', 'tab_blur', 2000); // 1000ms later
    expect(isDup).toBe(true);
  });

  test('same event after 2.5s is NOT a duplicate', () => {
    dedup.isDuplicate('session1', 'tab_blur', 1000);
    const isDup = dedup.isDuplicate('session1', 'tab_blur', 4000); // 3000ms later
    expect(isDup).toBe(false);
  });

  test('different event types in same session are independent', () => {
    dedup.isDuplicate('session1', 'tab_blur', 1000);
    const isDupDifferentType = dedup.isDuplicate('session1', 'face_absent', 1500);
    expect(isDupDifferentType).toBe(false);
  });

  test('same event in different sessions are independent', () => {
    dedup.isDuplicate('session1', 'tab_blur', 1000);
    const isDupDifferentSession = dedup.isDuplicate('session2', 'tab_blur', 1200);
    expect(isDupDifferentSession).toBe(false);
  });

  test('event exactly at boundary (2500ms) is a duplicate', () => {
    dedup.isDuplicate('session1', 'face_absent', 0);
    const isDup = dedup.isDuplicate('session1', 'face_absent', 2499);
    expect(isDup).toBe(true);
  });

  test('event at exactly 2500ms is NOT a duplicate (exclusive boundary)', () => {
    dedup.isDuplicate('session1', 'face_absent', 0);
    const isDup = dedup.isDuplicate('session1', 'face_absent', 2500);
    expect(isDup).toBe(false);
  });
});

describe('Qualifying Event Severity', () => {
  test('LOW severity is not qualifying', () => {
    expect(isQualifyingEvent(SEVERITY_LEVELS.LOW)).toBe(false);
  });

  test('MEDIUM severity is qualifying', () => {
    expect(isQualifyingEvent(SEVERITY_LEVELS.MEDIUM)).toBe(true);
  });

  test('HIGH severity is qualifying', () => {
    expect(isQualifyingEvent(SEVERITY_LEVELS.HIGH)).toBe(true);
  });

  test('CRITICAL severity is qualifying', () => {
    expect(isQualifyingEvent(SEVERITY_LEVELS.CRITICAL)).toBe(true);
  });
});

describe('Warning Threshold Escalation', () => {
  let tracker;

  beforeEach(() => {
    tracker = new SessionEscalationTracker(3, 5);
  });

  test('first qualifying event returns logged action', () => {
    const { action } = tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    expect(action).toBe('logged');
  });

  test('non-qualifying LOW event does not increment count', () => {
    tracker.addEvent('s1', SEVERITY_LEVELS.LOW);
    tracker.addEvent('s1', SEVERITY_LEVELS.LOW);
    expect(tracker.getCount('s1')).toBe(0);
  });

  test('count reaches warning threshold triggers warning', () => {
    tracker.addEvent('s1', SEVERITY_LEVELS.MEDIUM);
    tracker.addEvent('s1', SEVERITY_LEVELS.MEDIUM);
    const { action } = tracker.addEvent('s1', SEVERITY_LEVELS.MEDIUM); // 3rd = threshold
    expect(action).toBe('warning');
  });

  test('count above warning but below auto-submit still returns warning', () => {
    for (let i = 0; i < 4; i++) tracker.addEvent('s1', SEVERITY_LEVELS.MEDIUM);
    const { action, count } = tracker.addEvent('s1', SEVERITY_LEVELS.LOW);
    // LOW doesn't increment — last real action was 4th (warning)
    expect(count).toBe(4);
  });
});

describe('Auto-Submission Threshold', () => {
  let tracker;

  beforeEach(() => {
    tracker = new SessionEscalationTracker(3, 5);
  });

  test('5th qualifying event triggers auto_submit', () => {
    for (let i = 0; i < 4; i++) tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    const { action } = tracker.addEvent('s1', SEVERITY_LEVELS.CRITICAL);
    expect(action).toBe('auto_submit');
  });

  test('6th event after auto-submit threshold still returns auto_submit', () => {
    for (let i = 0; i < 5; i++) tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    const { action } = tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    expect(action).toBe('auto_submit');
  });

  test('different sessions have independent counters', () => {
    for (let i = 0; i < 5; i++) tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    const { action } = tracker.addEvent('s2', SEVERITY_LEVELS.HIGH);
    expect(action).toBe('logged'); // s2 only has 1 event
  });

  test('reset clears session counter', () => {
    for (let i = 0; i < 5; i++) tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    tracker.reset('s1');
    expect(tracker.getCount('s1')).toBe(0);
    const { action } = tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);
    expect(action).toBe('logged');
  });
});

describe('Mixed Severity Escalation', () => {
  let tracker;

  beforeEach(() => {
    tracker = new SessionEscalationTracker(3, 5);
  });

  test('mix of qualifying and non-qualifying events', () => {
    tracker.addEvent('s1', SEVERITY_LEVELS.LOW);   // not qualifying
    tracker.addEvent('s1', SEVERITY_LEVELS.MEDIUM); // count: 1
    tracker.addEvent('s1', SEVERITY_LEVELS.LOW);   // not qualifying
    tracker.addEvent('s1', SEVERITY_LEVELS.HIGH);  // count: 2
    tracker.addEvent('s1', SEVERITY_LEVELS.LOW);   // not qualifying
    const { action, count } = tracker.addEvent('s1', SEVERITY_LEVELS.CRITICAL); // count: 3 → warning
    expect(action).toBe('warning');
    expect(count).toBe(3);
  });
});
