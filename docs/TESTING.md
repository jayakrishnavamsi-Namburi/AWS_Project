# Testing Guide — SecureProctor

This document describes the testing strategy, test suites, and how to run, extend, and integrate tests for the SecureProctor platform.

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Test Suites](#unit-test-suites)
3. [Running Unit Tests](#running-unit-tests)
4. [Persistence Integration Test](#persistence-integration-test)
5. [Manual Testing Checklist](#manual-testing-checklist)
6. [Adding New Tests](#adding-new-tests)
7. [CI/CD Integration](#cicd-integration)

---

## Testing Strategy

SecureProctor uses a **three-layer testing approach**:

| Layer | Tool | Scope | Location |
|---|---|---|---|
| **Unit Tests** | Jest | Pure logic — auth, grading, session state, escalation | `server/src/tests/` |
| **Integration Tests** | Custom Node script | Database + filesystem I/O | `server/scripts/test-persistence.js` |
| **Manual E2E** | Browser | Full user flows across all roles | Checklist below |

> [!NOTE]
> There is currently no automated browser-based E2E suite (Playwright / Cypress). The manual checklist below serves as the E2E test plan. Contributions adding automated E2E coverage are welcome.

### Design Principles

- **Unit tests are isolated** — all database calls, file I/O, and external services are mocked using Jest's module mock system. Tests must run without a running MongoDB instance.
- **Integration tests are destructive** — the persistence script writes and deletes real data. Run it against a dedicated test database, never against production.
- **Tests document behaviour** — test descriptions are written as plain English specifications so the test suite doubles as living documentation.

---

## Unit Test Suites

All unit test files live in `server/src/tests/`.

---

### `auth.test.js`

Tests the authentication subsystem in isolation.

| Test Group | What Is Verified |
|---|---|
| **Password hashing** | `bcrypt.hash` produces a hash; `bcrypt.compare` returns `true` for correct password and `false` for wrong password |
| **JWT issuance** | `generateToken` returns a signed token containing the expected `userId` and `role` claims |
| **JWT verification** | `verifyToken` decodes a valid token correctly; throws on expired token; throws on tampered signature |
| **Zod schema validation** | Registration schema rejects missing fields, short passwords, invalid email formats; login schema rejects empty credentials |
| **Refresh token rotation** | Issuing a new access token invalidates the old refresh token (one-time use) |

---

### `evaluation.test.js`

Tests the exam grading engine — the most critical business logic in the platform.

| Test Group | What Is Verified |
|---|---|
| **MCQ (single correct)** | Correct answer scores full marks; wrong answer scores zero (or negative with negative marking) |
| **Multi-select** | Partial credit when subset of correct options selected; full credit only when all correct options and no wrong options selected |
| **True / False** | Treated as a two-option MCQ; scoring follows the same rules |
| **Short answer** | Case-insensitive exact match; optional whitespace trimming; no match scores zero |
| **Negative marking** | Deduction applied correctly for wrong answers; skipped questions are not penalised |
| **Result calculation** | `calculateResult` aggregates per-question scores correctly; percentage calculation; pass/fail determination against configurable threshold |
| **Edge cases** | All questions skipped → zero score; all questions answered correctly → full marks; floating-point rounding |

---

### `session.test.js`

Tests the exam session lifecycle state machine.

| Test Group | What Is Verified |
|---|---|
| **Deadline enforcement** | Submission rejected if received after `endTime`; accepted if received exactly at `endTime` (boundary) |
| **Grace period** | Submissions within the configured grace window (e.g., 30 s after deadline) are accepted and flagged |
| **Duplicate submission** | Second submission for the same `sessionId` returns a `409 Conflict` error without overwriting the first |
| **Question randomisation** | Randomised question order differs from the original order (statistical check); all questions are present after shuffling; fixed seed produces deterministic order |
| **Answer auto-save** | Partial answers persist correctly; subsequent auto-saves merge with existing answers (not overwrite) |
| **State machine transitions** | Valid transitions: `NOT_STARTED → IN_PROGRESS → SUBMITTED`; invalid transitions are rejected (e.g., `SUBMITTED → IN_PROGRESS`) |

---

### `escalation.test.js`

Tests the automated proctoring violation detection and escalation engine.

| Test Group | What Is Verified |
|---|---|
| **Event deduplication** | Identical violation events fired within the debounce window are collapsed into a single event |
| **Severity qualification** | Each violation type maps to the correct severity level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| **Warning thresholds** | Correct number of warnings issued before auto-submit is triggered; warning count resets on new session |
| **Auto-submit trigger** | Session is auto-submitted when the `CRITICAL` violation count exceeds the configured threshold |
| **Violation log integrity** | All events (including deduplicated ones) are stored in the audit log with timestamps and metadata |
| **Tab-switch cooldown** | Tab-switch events are rate-limited; rapid switching counts as one event per cooldown window |

---

## Running Unit Tests

All commands are run from the `server/` directory.

### Run All Tests

```bash
cd server
npm test
```

### Run Tests in Watch Mode (during development)

```bash
npm run test:watch
```

### Run a Specific Test File

```bash
npx jest src/tests/evaluation.test.js
```

### Run Tests Matching a Name Pattern

```bash
npx jest -t "negative marking"
```

### Generate Coverage Report

```bash
npm run test:coverage
```

This produces a coverage report in `server/coverage/`. Open `coverage/lcov-report/index.html` in a browser for the full interactive report.

> [!TIP]
> Aim to keep unit test coverage above **80%** for files in `src/utils/`, `src/services/`, and `src/middleware/`. Coverage for route handlers is lower by design — those are covered by manual E2E testing.

### Example Output

```
 PASS  src/tests/auth.test.js
 PASS  src/tests/evaluation.test.js
 PASS  src/tests/session.test.js
 PASS  src/tests/escalation.test.js

Test Suites: 4 passed, 4 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        3.241 s
Coverage summary:
  Statements : 84.2%
  Branches   : 79.6%
  Functions  : 88.1%
  Lines      : 84.5%
```

---

## Persistence Integration Test

The persistence integration test exercises the full I/O stack — MongoDB read/write/update/delete and local filesystem operations.

### When to Run

- After any change to database models or repository layer
- After a Docker infrastructure change
- Before a production release

### How to Run

```bash
# From the project root (requires a running MongoDB instance)
node server/scripts/test-persistence.js
```

Or inside Docker:

```bash
docker compose exec server node scripts/test-persistence.js
```

### What It Tests

| Step | Operation | Verified |
|---|---|---|
| 1 | **MongoDB connect** | Connection string resolves; authentication succeeds |
| 2 | **Write** | Document inserted into test collection; returns `insertedId` |
| 3 | **Read** | Document retrieved by `_id`; fields match what was written |
| 4 | **Update** | Field updated via `$set`; subsequent read returns new value |
| 5 | **Delete** | Document deleted by `_id`; subsequent read returns `null` |
| 6 | **Filesystem write** | Temp file written to the uploads directory |
| 7 | **Filesystem read** | Temp file read back; content matches |
| 8 | **Filesystem delete** | Temp file deleted; `fs.existsSync` returns `false` |
| 9 | **Cleanup** | Test collection dropped; no residual test data |

### Example Output

```
[PERSIST] Connecting to MongoDB...        ✔ connected
[PERSIST] Writing test document...        ✔ inserted _id: 65f3a...
[PERSIST] Reading document...             ✔ data matches
[PERSIST] Updating document...            ✔ updated
[PERSIST] Deleting document...            ✔ deleted
[PERSIST] Writing temp file...            ✔ written to /uploads/test-1234.tmp
[PERSIST] Reading temp file...            ✔ content matches
[PERSIST] Deleting temp file...           ✔ deleted
[PERSIST] Cleaning up test collection... ✔ dropped
[PERSIST] All checks passed ✅
```

If any step fails, the script exits with a non-zero code and prints the error, leaving the test collection in place for inspection.

---

## Manual Testing Checklist

Use this checklist for release sign-off. Test in a staging environment that mirrors production.

### 👤 Student Flows

- [ ] **Registration** — Student registers with valid details; email validation works; duplicate email rejected
- [ ] **Login** — Student logs in; JWT cookie set; redirect to student dashboard
- [ ] **Exam access** — Student sees only assigned exams; accessing an unassigned exam URL returns 403
- [ ] **Exam start** — Timer begins immediately; questions display with correct types (MCQ, multi-select, T/F, short answer)
- [ ] **Auto-save** — Answer selections persist after browser refresh within the same session
- [ ] **Timer display** — Countdown is accurate; warning shown at configurable threshold (e.g., 5 minutes remaining)
- [ ] **Exam submission** — Submit button works; confirmation dialog appears; submission recorded in database
- [ ] **Auto-submit on timeout** — Timer reaches zero; exam auto-submits; student sees result page
- [ ] **Result display** — Score, percentage, pass/fail, and per-question breakdown displayed correctly

### 🎓 Admin Flows

- [ ] **Exam creation** — Admin creates exam with title, duration, and passing score
- [ ] **Question builder** — Admin adds all question types; correct answers marked; negative marking configured
- [ ] **Exam scheduling** — Start/end datetime set; exam appears to assigned students only in the correct window
- [ ] **Student assignment** — Assign students to exam individually and by bulk CSV upload
- [ ] **Proctoring settings** — Configure violation thresholds, auto-submit count, grace period

### 🔍 Proctoring Flows

- [ ] **Violation recording** — Tab switch, window blur, copy/paste, and fullscreen exit events are captured and stored
- [ ] **Live proctor dashboard** — Proctor sees all active sessions; violation count updates in real time via Socket.IO
- [ ] **Escalation warnings** — Warning toast shown to student on violation; count displayed in proctor dashboard
- [ ] **Auto-submit trigger** — Student session auto-submits when critical violation threshold is reached; proctor dashboard reflects this

### 📊 Analytics & Export

- [ ] **Exam analytics** — Admin views pass rate, average score, score distribution chart
- [ ] **Student report** — Per-student result visible; violation log displayed
- [ ] **CSV export** — Results exported as valid CSV; all fields present; file downloads correctly

### 📱 Mobile QR Pairing

- [ ] **QR code display** — QR code shown on student exam page
- [ ] **Mobile camera scan** — QR scanned on mobile device; secondary device joins the session
- [ ] **Secondary device feed** — Proctor dashboard shows the secondary camera feed alongside the primary session

---

## Adding New Tests

### File Location

Place new test files in `server/src/tests/`. File names must match the pattern `*.test.js` to be picked up by Jest.

```
server/src/tests/
├── auth.test.js
├── evaluation.test.js
├── escalation.test.js
├── session.test.js
└── yourFeature.test.js   ← new file here
```

### Conventions

- **Describe blocks** group related tests: `describe('Feature Name', () => { ... })`
- **Test names** read as specifications: `it('should reject submission after deadline', ...)`
- **Arrange-Act-Assert** pattern — set up inputs, call the function, assert the output
- **No test interdependence** — each `it` block must be independently runnable (use `beforeEach` for setup)

### Mock Patterns Used

**Mocking a module (e.g., mongoose model):**

```js
jest.mock('../../models/Session', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
```

**Mocking a utility function:**

```js
import * as jwtUtils from '../../utils/jwt';
jest.spyOn(jwtUtils, 'verifyToken').mockReturnValue({ userId: 'abc123', role: 'student' });
```

**Resetting mocks between tests:**

```js
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Testing async functions:**

```js
it('should return 409 on duplicate submission', async () => {
  SessionModel.findById.mockResolvedValue({ status: 'SUBMITTED' });
  const result = await submitSession('session-id-123', answers);
  expect(result.error).toBe('ALREADY_SUBMITTED');
});
```

### Jest Configuration

Jest is configured in `server/package.json` under the `"jest"` key. Key settings:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/tests/**",
      "!src/scripts/**"
    ]
  }
}
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml` in the repository root:

```yaml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: server

      - name: Run unit tests with coverage
        run: npm run test:coverage
        working-directory: server

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: server/coverage/lcov-report/

  integration-tests:
    name: Persistence Integration Test
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: testadmin
          MONGO_INITDB_ROOT_PASSWORD: testpassword
        options: >-
          --health-cmd "mongosh --eval \"db.adminCommand('ping')\""
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: server

      - name: Run persistence integration test
        run: node scripts/test-persistence.js
        working-directory: server
        env:
          MONGO_URI: mongodb://testadmin:testpassword@localhost:27017/secureproctor_test?authSource=admin
          UPLOAD_DIR: /tmp/secureproctor-test-uploads
```

> [!TIP]
> Add a **coverage gate** by setting `coverageThreshold` in the Jest config to fail the CI run if coverage drops below the required percentage:
> ```json
> "coverageThreshold": {
>   "global": {
>     "statements": 80,
>     "branches": 75,
>     "functions": 85,
>     "lines": 80
>   }
> }
> ```

### Branch Protection Recommendation

Configure the following **required status checks** on the `main` branch in GitHub repository settings:

- `Unit Tests`
- `Persistence Integration Test`

This prevents merging code that breaks existing tests.

---

*For deployment information, see [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md). For the full project overview, see the [README](../README.md).*
