# SecureProctor — REST API Reference

> **Base URL:** `https://<host>/api/v1`  
> **Content-Type:** `application/json` (unless noted)  
> **Authentication:** `Authorization: Bearer <accessToken>` header

---

## Table of Contents

1. [Conventions](#conventions)
2. [Health](#1-health)
3. [Auth](#2-auth)
4. [Users (Admin)](#3-users-admin)
5. [Questions (Admin)](#4-questions-admin)
6. [Exams](#5-exams)
7. [Sessions](#6-sessions)
8. [Proctoring](#7-proctoring)
9. [Results](#8-results)
10. [Analytics](#9-analytics)
11. [Recordings](#10-recordings)
12. [Error Reference](#error-reference)

---

## Conventions

### Access Levels

| Badge | Meaning |
|-------|---------|
| `Public` | No authentication required |
| `Auth` | Any authenticated user |
| `Student` | Role must be `student` |
| `Admin` | Role must be `admin` |
| `Proctor` | Role must be `proctor` |
| `Proctor+Admin` | Role must be `proctor` or `admin` |

### Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": [ ]
  }
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing / invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Resource Not Found |
| `409` | Conflict (duplicate resource) |
| `422` | Unprocessable Entity (Zod validation failure) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

---

## 1. Health

### `GET /health`

Check server and database connectivity.

**Access:** `Public`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12453.7,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "database": "connected",
    "version": "1.0.0"
  }
}
```

**Response `503`** (DB unreachable):
```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "database": "disconnected"
  }
}
```

---

## 2. Auth

### `POST /auth/register`

Register a new student account.

**Access:** `Public`

**Request Body:**
```json
{
  "name": "string, required, 2–100 chars",
  "email": "string, required, valid email",
  "password": "string, required, min 8 chars"
}
```

**Example:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secur3P@ss"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "student",
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `409` | Email already registered |
| `422` | Validation failure |

---

### `POST /auth/login`

Authenticate and receive tokens.

**Access:** `Public`

**Request Body:**
```json
{
  "email": "string, required",
  "password": "string, required"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "student",
      "isActive": true
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `401` | Invalid email or password |
| `403` | Account deactivated |
| `422` | Validation failure |
| `429` | Rate limit exceeded (10 req / 15 min) |

---

### `POST /auth/logout`

Invalidate the current refresh token.

**Access:** `Auth`

**Request Body:**
```json
{
  "refreshToken": "string, required"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /auth/forgot-password`

Send a password-reset email.

**Access:** `Public`

**Request Body:**
```json
{
  "email": "string, required, valid email"
}
```

**Response `200`** (always, to prevent email enumeration):
```json
{
  "success": true,
  "message": "If that email exists, a reset link has been sent."
}
```

---

### `POST /auth/reset-password`

Reset password using token from email.

**Access:** `Public`

**Request Body:**
```json
{
  "token": "string, required",
  "password": "string, required, min 8 chars"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Password reset successfully."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Token invalid or expired |
| `422` | Validation failure |

---

## 3. Users (Admin)

### `GET /users`

List all registered users with optional filters.

**Access:** `Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `role` | `string` | Filter by role: `student`, `proctor`, `admin` |
| `isActive` | `boolean` | Filter by account status |
| `search` | `string` | Partial match on name or email |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 20, max: 100) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef0",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "student",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00.000Z",
        "lastLogin": "2025-01-20T08:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 145,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

---

### `PUT /users/:id/status`

Activate or deactivate a user account.

**Access:** `Admin`

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | User ObjectId |

**Request Body:**
```json
{
  "isActive": "boolean, required"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "name": "Jane Doe",
      "isActive": false
    }
  },
  "message": "User deactivated successfully."
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `404` | User not found |
| `400` | Cannot deactivate own account |

---

## 4. Questions (Admin)

### `GET /questions`

List all questions in the question bank.

**Access:** `Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | `string` | `mcq` or `text` |
| `category` | `string` | Filter by category tag |
| `search` | `string` | Full-text search on question text |
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "_id": "64b2c3d4e5f67890abcdef01",
        "text": "What is the time complexity of binary search?",
        "type": "mcq",
        "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        "correctAnswer": "O(log n)",
        "marks": 2,
        "category": "Algorithms",
        "createdAt": "2025-01-10T09:00:00.000Z"
      }
    ],
    "pagination": { "total": 320, "page": 1, "limit": 20, "pages": 16 }
  }
}
```

---

### `POST /questions`

Create a new question.

**Access:** `Admin`

**Request Body:**
```json
{
  "text": "string, required",
  "type": "mcq | text, required",
  "options": ["array of strings, required if type=mcq, min 2 items"],
  "correctAnswer": "string, required if type=mcq",
  "marks": "number, required, min 1",
  "category": "string, optional"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "question": {
      "_id": "64b2c3d4e5f67890abcdef01",
      "text": "What is the time complexity of binary search?",
      "type": "mcq",
      "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      "correctAnswer": "O(log n)",
      "marks": 2,
      "category": "Algorithms"
    }
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `422` | Validation failure (e.g., MCQ without options) |

---

### `GET /questions/:id`

Get a single question by ID.

**Access:** `Admin`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "question": { "_id": "...", "text": "...", "type": "mcq", "options": [...], "correctAnswer": "...", "marks": 2, "category": "Algorithms" }
  }
}
```

**Errors:** `404` if not found.

---

### `PUT /questions/:id`

Update an existing question.

**Access:** `Admin`

**Request Body:** (all fields optional)
```json
{
  "text": "string",
  "options": ["array of strings"],
  "correctAnswer": "string",
  "marks": "number",
  "category": "string"
}
```

**Response `200`:** Updated question object.

**Errors:** `404` if not found; `422` validation failure.

---

### `DELETE /questions/:id`

Delete a question (soft-delete if referenced by exams).

**Access:** `Admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "Question deleted successfully."
}
```

**Errors:** `404` if not found; `409` if question is part of a published exam.

---

## 5. Exams

### `GET /exams`

List exams. Students see only their assigned exams; admins see all.

**Access:** `Auth`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | `string` | `draft`, `published`, `archived` |
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "exams": [
      {
        "_id": "64c3d4e5f67890abcdef0123",
        "title": "Data Structures Midterm",
        "description": "Covers arrays, linked lists, trees",
        "duration": 90,
        "totalMarks": 100,
        "passMark": 50,
        "questionCount": 40,
        "status": "published",
        "scheduledAt": "2025-02-01T09:00:00.000Z",
        "createdBy": { "_id": "...", "name": "Prof. Smith" }
      }
    ],
    "pagination": { "total": 12, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

### `POST /exams`

Create a new exam.

**Access:** `Admin`

**Request Body:**
```json
{
  "title": "string, required, 3–200 chars",
  "description": "string, optional",
  "questions": ["array of Question ObjectIds, required, min 1"],
  "duration": "number (minutes), required, min 5",
  "passMark": "number, required",
  "scheduledAt": "ISO 8601 datetime, optional",
  "proctorSettings": {
    "enableWebcam": "boolean, default true",
    "enableAudio": "boolean, default true",
    "enableSecondCamera": "boolean, default false",
    "maxViolations": "number, default 10"
  }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "exam": {
      "_id": "64c3d4e5f67890abcdef0123",
      "title": "Data Structures Midterm",
      "status": "draft",
      "totalMarks": 100,
      "questionCount": 40
    }
  }
}
```

---

### `GET /exams/:id`

Get exam details. Students receive questions without correct answers.

**Access:** `Auth`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "exam": {
      "_id": "64c3d4e5f67890abcdef0123",
      "title": "Data Structures Midterm",
      "duration": 90,
      "passMark": 50,
      "status": "published",
      "questions": [
        {
          "_id": "...",
          "text": "What is the time complexity of binary search?",
          "type": "mcq",
          "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
          "marks": 2
        }
      ],
      "proctorSettings": {
        "enableWebcam": true,
        "enableAudio": true,
        "enableSecondCamera": false,
        "maxViolations": 10
      }
    }
  }
}
```

---

### `PUT /exams/:id`

Update exam details (only allowed when status is `draft`).

**Access:** `Admin`

**Request Body:** (all fields optional — same schema as POST)

**Response `200`:** Updated exam object.

**Errors:** `404` not found; `409` cannot edit a published exam.

---

### `DELETE /exams/:id`

Delete an exam (only allowed when status is `draft`).

**Access:** `Admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "Exam deleted successfully."
}
```

**Errors:** `404` not found; `409` cannot delete a published exam with active sessions.

---

### `PUT /exams/:id/publish`

Publish a draft exam, making it visible to assigned students.

**Access:** `Admin`

**Request Body:** _(empty)_

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "exam": { "_id": "...", "status": "published" }
  },
  "message": "Exam published successfully."
}
```

**Errors:** `400` if exam has no questions; `404` not found.

---

### `POST /exams/:id/assign-students`

Assign one or more students to an exam.

**Access:** `Admin`

**Request Body:**
```json
{
  "studentIds": ["array of User ObjectIds, required, min 1"]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "assigned": 23,
    "skipped": 2,
    "message": "23 students assigned; 2 already assigned."
  }
}
```

**Errors:** `404` exam not found; `400` invalid student IDs.

---

## 6. Sessions

### `POST /sessions/:id/start`

Start an exam session for the authenticated student.

**Access:** `Student`

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Exam ObjectId |

**Request Body:** _(empty)_

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "64d4e5f6789abcdef012345",
      "exam": "64c3d4e5f67890abcdef0123",
      "student": "64a1b2c3d4e5f6789abcdef0",
      "status": "in_progress",
      "startTime": "2025-02-01T09:00:05.000Z",
      "endsAt": "2025-02-01T10:30:05.000Z",
      "remainingSeconds": 5400
    }
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `403` | Student not assigned to this exam |
| `409` | Session already started or completed |
| `404` | Exam not found |
| `400` | Exam not published |

---

### `GET /sessions/:id`

Get current state of an exam session.

**Access:** `Auth` (Student: own session; Proctor+Admin: any)

**Path Parameters:**

| Param | Description |
|-------|-------------|
| `id` | Session ObjectId |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "64d4e5f6789abcdef012345",
      "exam": { "_id": "...", "title": "Data Structures Midterm" },
      "student": { "_id": "...", "name": "Jane Doe" },
      "status": "in_progress",
      "startTime": "2025-02-01T09:00:05.000Z",
      "endsAt": "2025-02-01T10:30:05.000Z",
      "remainingSeconds": 4120,
      "answeredCount": 12,
      "violationCount": 2
    }
  }
}
```

---

### `POST /sessions/:id/answer`

Save or update the student's answer for a question.

**Access:** `Student`

**Request Body:**
```json
{
  "questionId": "string, required, ObjectId",
  "answer": "string, required",
  "timeSpent": "number (seconds), optional"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "savedAt": "2025-02-01T09:15:00.000Z",
    "answeredCount": 13
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `403` | Session belongs to another student |
| `400` | Session not in progress |
| `404` | Question not in this exam |

---

### `POST /sessions/:id/heartbeat`

Confirm the student is still active. Must be called every 30 seconds. Server auto-submits if heartbeat is missed for > 2 minutes.

**Access:** `Student`

**Request Body:** _(empty)_

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "remainingSeconds": 3980
  }
}
```

---

### `POST /sessions/:id/submit`

Submit the exam session.

**Access:** `Student`

**Request Body:** _(empty)_

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "64d4e5f6789abcdef012345",
      "status": "completed",
      "score": 74,
      "totalMarks": 100,
      "passed": true,
      "submittedAt": "2025-02-01T10:15:00.000Z"
    }
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Session already completed or terminated |
| `403` | Not the session owner |

---

## 7. Proctoring

### `GET /proctoring/sessions`

List all proctored sessions with filtering options.

**Access:** `Proctor+Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `examId` | `string` | Filter by exam |
| `status` | `string` | `in_progress`, `completed`, `terminated` |
| `hasViolations` | `boolean` | Only sessions with ≥ 1 violation |
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "64d4e5f6789abcdef012345",
        "exam": { "_id": "...", "title": "Data Structures Midterm" },
        "student": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com" },
        "status": "in_progress",
        "startTime": "2025-02-01T09:00:05.000Z",
        "violationCount": 3,
        "highSeverityCount": 1
      }
    ],
    "pagination": { "total": 45, "page": 1, "limit": 20, "pages": 3 }
  }
}
```

---

### `POST /proctoring/sessions/:id/events`

Log a proctoring violation event for a session.

**Access:** `Auth` (Student via hook; Proctor+Admin)

**Request Body:**
```json
{
  "type": "string, required — NO_FACE | MULTIPLE_FACES | LOOKING_AWAY | LOOKING_DOWN | TAB_SWITCH | FULLSCREEN_EXIT | AUDIO_DETECTED | PHONE_DETECTED | MANUAL",
  "severity": "string, required — low | medium | high | critical",
  "metadata": {
    "description": "string, optional",
    "screenshotUrl": "string, optional",
    "durationMs": "number, optional"
  }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "event": {
      "_id": "64e5f6789abcdef01234567",
      "session": "64d4e5f6789abcdef012345",
      "type": "LOOKING_AWAY",
      "severity": "medium",
      "timestamp": "2025-02-01T09:22:10.000Z",
      "reviewStatus": "pending"
    }
  }
}
```

---

### `GET /proctoring/sessions/:id/events`

Get all proctoring events for a session.

**Access:** `Proctor+Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `severity` | `string` | Filter: `low`, `medium`, `high`, `critical` |
| `reviewStatus` | `string` | `pending`, `reviewed`, `dismissed` |
| `type` | `string` | Event type filter |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "64e5f6789abcdef01234567",
        "type": "LOOKING_AWAY",
        "severity": "medium",
        "timestamp": "2025-02-01T09:22:10.000Z",
        "metadata": { "description": "Face turned > 30° for 3 seconds" },
        "reviewStatus": "pending",
        "reviewedBy": null
      }
    ],
    "summary": {
      "total": 8,
      "bySeverity": { "low": 4, "medium": 3, "high": 1, "critical": 0 }
    }
  }
}
```

---

### `PUT /proctoring/events/:eventId/review`

Mark a proctoring event as reviewed or dismissed.

**Access:** `Proctor+Admin`

**Request Body:**
```json
{
  "reviewStatus": "reviewed | dismissed, required",
  "reviewNote": "string, optional"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "event": {
      "_id": "64e5f6789abcdef01234567",
      "reviewStatus": "reviewed",
      "reviewedBy": { "_id": "...", "name": "Proctor Mark" },
      "reviewedAt": "2025-02-01T11:00:00.000Z",
      "reviewNote": "Student appeared to be reading question carefully."
    }
  }
}
```

---

### `POST /proctoring/sessions/:id/terminate`

Forcefully terminate an active exam session.

**Access:** `Proctor+Admin`

**Request Body:**
```json
{
  "reason": "string, required — explanation for termination"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "64d4e5f6789abcdef012345",
      "status": "terminated",
      "terminatedAt": "2025-02-01T09:45:00.000Z",
      "terminationReason": "Repeated violations detected."
    }
  }
}
```

**Errors:** `400` session not in progress; `404` session not found.

---

### `POST /proctoring/sessions/:id/pairing-token`

Generate a QR / token for pairing a secondary mobile camera to the session.

**Access:** `Student` (own session only)

**Request Body:** _(empty)_

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "token": "abc123xyz789",
    "expiresAt": "2025-02-01T09:15:00.000Z",
    "qrCodeUrl": "/api/v1/proctoring/pair/qr?token=abc123xyz789",
    "pairingUrl": "https://secureproctor.example.com/pair?token=abc123xyz789"
  }
}
```

**Errors:** `400` mobile pairing not enabled for this exam; `409` already paired.

---

### `POST /proctoring/pair/verify`

Verify a pairing token from the mobile browser.

**Access:** `Public` (token acts as credential)

**Request Body:**
```json
{
  "token": "string, required"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessionId": "64d4e5f6789abcdef012345",
    "examTitle": "Data Structures Midterm",
    "studentName": "Jane Doe",
    "socketRoom": "pairing-64d4e5f6789abcdef012345"
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | Token invalid, expired, or already used |

---

## 8. Results

### `GET /results/session/:id`

Get detailed results for a single exam session.

**Access:** `Auth` (Student: own session; Proctor+Admin: any)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "result": {
      "session": {
        "_id": "64d4e5f6789abcdef012345",
        "status": "completed",
        "startTime": "2025-02-01T09:00:05.000Z",
        "submittedAt": "2025-02-01T10:12:00.000Z",
        "duration": 4315
      },
      "exam": { "_id": "...", "title": "Data Structures Midterm", "passMark": 50 },
      "student": { "_id": "...", "name": "Jane Doe" },
      "scoring": {
        "score": 74,
        "totalMarks": 100,
        "percentage": 74.0,
        "passed": true,
        "grade": "B"
      },
      "answers": [
        {
          "question": { "_id": "...", "text": "...", "marks": 2 },
          "studentAnswer": "O(log n)",
          "correctAnswer": "O(log n)",
          "isCorrect": true,
          "marksAwarded": 2
        }
      ],
      "proctoring": {
        "violationCount": 3,
        "terminated": false
      }
    }
  }
}
```

---

### `GET /results/exam/:id`

Get aggregated results for all sessions of an exam.

**Access:** `Proctor+Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number |
| `limit` | `number` | Results per page |
| `sort` | `string` | `score_asc`, `score_desc`, `name_asc` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "exam": { "_id": "...", "title": "Data Structures Midterm" },
    "summary": {
      "totalSessions": 45,
      "completed": 42,
      "terminated": 2,
      "inProgress": 1,
      "averageScore": 68.4,
      "highestScore": 98,
      "lowestScore": 12,
      "passRate": 82.2
    },
    "results": [
      {
        "student": { "_id": "...", "name": "Jane Doe" },
        "score": 74,
        "percentage": 74.0,
        "passed": true,
        "submittedAt": "2025-02-01T10:12:00.000Z",
        "violationCount": 3
      }
    ],
    "pagination": { "total": 42, "page": 1, "limit": 20, "pages": 3 }
  }
}
```

---

## 9. Analytics

### `GET /analytics/dashboard`

Get system-wide admin dashboard statistics.

**Access:** `Admin`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "users": 512,
      "activeStudents": 480,
      "exams": 34,
      "publishedExams": 18,
      "sessionsToday": 127,
      "violationsToday": 43
    },
    "recentExams": [
      {
        "_id": "...",
        "title": "Data Structures Midterm",
        "status": "published",
        "sessionCount": 45,
        "passRate": 82.2
      }
    ],
    "violationTrend": [
      { "date": "2025-01-14", "count": 38 },
      { "date": "2025-01-15", "count": 43 }
    ]
  }
}
```

---

### `GET /analytics/exams/:id`

Get detailed analytics for a specific exam.

**Access:** `Admin`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "exam": { "_id": "...", "title": "Data Structures Midterm" },
    "participation": {
      "assigned": 50,
      "started": 45,
      "completed": 42,
      "notStarted": 5
    },
    "scoring": {
      "average": 68.4,
      "median": 71.0,
      "standardDeviation": 14.2,
      "distribution": [
        { "range": "0–10", "count": 1 },
        { "range": "11–20", "count": 0 },
        { "range": "91–100", "count": 3 }
      ]
    },
    "questionAnalytics": [
      {
        "question": { "_id": "...", "text": "What is time complexity of binary search?" },
        "correctRate": 78.5,
        "averageTimeSpent": 42
      }
    ],
    "proctoring": {
      "totalViolations": 89,
      "byType": {
        "NO_FACE": 12,
        "LOOKING_AWAY": 34,
        "TAB_SWITCH": 28,
        "AUDIO_DETECTED": 15
      },
      "terminatedSessions": 2
    }
  }
}
```

---

### `GET /analytics/exams/:id/export`

Export exam results as a CSV file.

**Access:** `Admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `format` | `string` | `csv` (default) or `json` |

**Response `200`:**

Content-Type: `text/csv; charset=utf-8`

```
student_name,email,score,total_marks,percentage,passed,submitted_at,violation_count
Jane Doe,jane@example.com,74,100,74.00,true,2025-02-01T10:12:00.000Z,3
John Smith,john@example.com,52,100,52.00,true,2025-02-01T10:28:00.000Z,1
```

**Errors:** `404` exam not found; `400` no completed sessions to export.

---

## 10. Recordings

### `POST /recordings/sessions/:id/chunks`

Upload a video recording chunk for an exam session.

**Access:** `Student` (own session only)

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `chunk` | `File` | Video blob (WebM format, max 10 MB) |
| `chunkIndex` | `number` | Zero-based chunk sequence number |
| `totalChunks` | `number` | Total expected chunks (optional) |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "chunk": {
      "_id": "64f6789abcdef012345678",
      "session": "64d4e5f6789abcdef012345",
      "chunkIndex": 4,
      "filename": "chunk-1706779200000.webm",
      "size": 2457600,
      "uploadedAt": "2025-02-01T09:20:00.000Z"
    }
  }
}
```

**Errors:**
| Code | Condition |
|------|-----------|
| `400` | No file uploaded or invalid MIME type |
| `413` | File exceeds 10 MB limit |
| `403` | Session belongs to another student |
| `404` | Session not found |

---

### `GET /recordings/sessions/:id`

Get the list of video chunks recorded for a session.

**Access:** `Proctor+Admin`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "64d4e5f6789abcdef012345",
      "student": { "_id": "...", "name": "Jane Doe" }
    },
    "chunks": [
      {
        "_id": "64f6789abcdef012345678",
        "chunkIndex": 0,
        "filename": "chunk-1706779200000.webm",
        "size": 2457600,
        "uploadedAt": "2025-02-01T09:05:00.000Z",
        "downloadUrl": "/uploads/recordings/64d4e5f6789abcdef012345/chunk-1706779200000.webm"
      }
    ],
    "totalChunks": 18,
    "totalSize": 44236800
  }
}
```

---

## Error Reference

### Error Codes

| Code String | HTTP Status | Description |
|------------|------------|-------------|
| `VALIDATION_ERROR` | `422` | Zod schema validation failed; `details` array contains field errors |
| `AUTH_MISSING_TOKEN` | `401` | Authorization header not present |
| `AUTH_INVALID_TOKEN` | `401` | JWT signature invalid or malformed |
| `AUTH_TOKEN_EXPIRED` | `401` | JWT access token has expired |
| `FORBIDDEN` | `403` | Authenticated but insufficient role |
| `NOT_FOUND` | `404` | Requested resource does not exist |
| `CONFLICT` | `409` | Operation conflicts with current resource state |
| `RATE_LIMITED` | `429` | Request rate limit exceeded |
| `SESSION_NOT_ACTIVE` | `400` | Exam session is not in `in_progress` status |
| `EXAM_NOT_PUBLISHED` | `400` | Exam is in `draft` or `archived` state |
| `STUDENT_NOT_ASSIGNED` | `403` | Student is not assigned to this exam |
| `SESSION_ALREADY_EXISTS` | `409` | Student already has an active session for this exam |
| `TOKEN_EXPIRED` | `400` | Pairing or password-reset token has expired |
| `INTERNAL_ERROR` | `500` | Unexpected server error |

### Validation Error Detail Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      },
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```
