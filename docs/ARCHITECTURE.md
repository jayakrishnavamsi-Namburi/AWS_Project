# SecureProctor — System Architecture

> **Version:** 1.0  
> **Last Updated:** 2025  
> **Stack:** React 18 · Node.js / Express · MongoDB · Socket.IO · WebRTC · MediaPipe

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Diagram](#2-component-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Real-Time Communication](#5-real-time-communication)
6. [WebRTC Signaling Flow](#6-webrtc-signaling-flow)
7. [Exam Session Data Flow](#7-exam-session-data-flow)
8. [File Storage Architecture](#8-file-storage-architecture)
9. [Security Layers](#9-security-layers)
10. [MediaPipe Integration](#10-mediapipe-integration)

---

## 1. System Overview

SecureProctor is a browser-based online examination platform with real-time AI-powered proctoring. It is deployed as a **four-service Docker Compose application**:

| Service | Image / Source | Role |
|---------|---------------|------|
| `nginx` | `nginx:alpine` | Reverse proxy, SSL termination, static asset serving |
| `client` | Custom React build | Single-page application served via Nginx |
| `server` | Custom Node.js image | REST API + Socket.IO server |
| `mongodb` | `mongo:7` | Primary data store |

All external traffic enters through Nginx on ports `80` / `443`. Nginx routes `/api/*` and `/socket.io/*` to the `server` container and all other paths to the `client` static bundle. Services communicate over the internal Docker bridge network `secureproctor-net`.

### Environment Tiers

| Tier | Description |
|------|-------------|
| `development` | `docker-compose.dev.yml` — hot-reload via volumes |
| `production` | `docker-compose.yml` — optimised multi-stage builds |

---

## 2. Component Diagram

```mermaid
flowchart LR
    subgraph External["External Clients"]
        B["Browser\n(Student / Admin)"]
        M["Mobile Browser\n(Secondary Camera)"]
    end

    subgraph Docker["Docker: secureproctor-net"]
        direction TB
        N["nginx:443\nReverse Proxy / SSL"]

        subgraph FE["client — React SPA"]
            R["React Router"]
            CTX["Context Providers"]
            PG["Pages"]
            HK["Custom Hooks"]
        end

        subgraph BE["server — Express + Socket.IO"]
            RT["Routes"]
            MW["Middleware Stack"]
            CTRL["Controllers"]
            SVC["Services"]
            MDL["Mongoose Models"]
            SIO["Socket.IO Server"]
        end

        DB[("mongodb:27017\nMongoDB 7")]
        FS["Local Disk\n/uploads"]
    end

    subgraph External2["External Services"]
        S3["AWS S3\n(future)"]
        MP["MediaPipe WASM\n(CDN)"]
        SMTP["SMTP\n(Email)"]
    end

    B -->|HTTPS| N
    M -->|HTTPS| N
    N -->|static| FE
    N -->|"/api/*"| RT
    N -->|"/socket.io/*"| SIO
    RT --> MW --> CTRL --> SVC --> MDL --> DB
    SVC --> FS
    FE <-->|"WebSocket"| SIO
    FE -->|"WebRTC P2P"| M
    FS -.->|"migration"| S3
    HK -->|"WASM fetch"| MP
    SVC -->|"nodemailer"| SMTP
```

---

## 3. Frontend Architecture

### 3.1 Technology Stack

| Concern | Library / Tool |
|---------|---------------|
| UI framework | React 18 (functional components) |
| Routing | React Router v6 |
| HTTP client | Axios (interceptors for JWT) |
| Real-time | `socket.io-client` |
| AI proctoring | MediaPipe Face Landmarker (WASM via CDN) |
| Video | WebRTC `getUserMedia`, `MediaRecorder` |
| State | React Context API + `useReducer` |
| Styling | CSS Modules / Tailwind CSS |
| Build | Vite |

### 3.2 Context Providers

```
<AuthProvider>               ← JWT token, user object, login/logout helpers
  <SocketProvider>           ← Single socket.io-client instance, reconnect logic
    <ExamSessionProvider>    ← Active exam state: question index, answers, timer
      <ProctorProvider>      ← Proctoring state: violation count, termination flag
        <App />
      </ProctorProvider>
    </ExamSessionProvider>
  </SocketProvider>
</AuthProvider>
```

Each provider exposes a typed context object consumed via a paired custom hook (e.g. `useAuth()`, `useSocket()`, `useExamSession()`).

### 3.3 Custom Hooks

#### `useWebcamProctoring`

Manages the primary webcam feed used for AI proctoring.

```
Responsibilities:
  • Request camera permission via getUserMedia({ video: true })
  • Pipe the stream to a <video> element ref
  • Start/stop the MediaPipe frame-analysis loop
  • Emit violation events via socket / API
  • Expose: { videoRef, isReady, violationCount, startProctoring, stopProctoring }
```

#### `useAudioMonitor`

Monitors the microphone for sustained audio that may indicate talking.

```
Responsibilities:
  • getUserMedia({ audio: true })
  • Create AudioContext + AnalyserNode
  • Poll RMS level on requestAnimationFrame
  • Debounce short spikes; emit "audio_violation" after threshold duration
  • Expose: { isTalking, audioLevel, startMonitor, stopMonitor }
```

#### `useBrowserSecurity`

Detects and reports browser-integrity violations.

```
Responsibilities:
  • Listen to: visibilitychange, blur, fullscreenchange, keydown (PrintScreen / Alt-Tab)
  • Count tab-switch events; emit after threshold
  • Request and monitor Fullscreen API; warn on exit
  • Disable right-click context menu and text selection
  • Expose: { tabSwitchCount, isFullscreen, lockBrowser, unlockBrowser }
```

#### `useWebRTC`

Manages peer-to-peer connection to the student's secondary mobile camera.

```
Responsibilities:
  • Create RTCPeerConnection with STUN/TURN config
  • Handle offer/answer exchange via Socket.IO signaling channel
  • Add ICE candidates incrementally
  • Expose remote MediaStream for display in proctor dashboard
  • Expose: { remoteStream, connectionState, initiateCall, hangUp }
```

### 3.4 Page Structure

```
src/
├── pages/
│   ├── auth/           Login, Register, ForgotPassword, ResetPassword
│   ├── student/        Dashboard, ExamLobby, ExamSession, Results
│   ├── admin/          Dashboard, ExamManager, QuestionBank, UserManager
│   └── proctor/        ProctorDashboard, SessionMonitor, ReviewEvents
├── components/
│   ├── exam/           QuestionCard, TimerDisplay, AnswerPanel
│   ├── proctoring/     WebcamPreview, ViolationLog, SecondaryCamera
│   └── ui/             Modal, Button, Alert, Spinner
├── hooks/              (custom hooks listed above)
├── context/            (providers listed above)
├── services/           api.js (Axios instance), socket.js
└── utils/              validators, formatters, constants
```

---

## 4. Backend Architecture

### 4.1 Technology Stack

| Concern | Library |
|---------|---------|
| Framework | Express 4 |
| ODM | Mongoose 8 |
| Authentication | JWT (`jsonwebtoken`) + `bcryptjs` |
| Real-time | Socket.IO 4 |
| Validation | Zod |
| File upload | Multer |
| Email | Nodemailer |
| Security | Helmet, cors, express-rate-limit |

### 4.2 Layer Architecture

```mermaid
flowchart LR
    REQ["HTTP Request"] --> RT["Router\n/api/v1/..."]
    RT --> MW["Middleware Chain\nHelmet · CORS · RateLimit\nauthMiddleware · roleMiddleware\nzodValidate"]
    MW --> CTRL["Controller\nParse req, call service,\nformat response"]
    CTRL --> SVC["Service\nBusiness logic,\norchestration"]
    SVC --> MDL["Mongoose Model\nSchema + methods"]
    MDL --> DB[("MongoDB")]
    SVC --> IO["Socket.IO\n(emit events)"]
    SVC --> FS["File System\n/uploads"]
```

### 4.3 Directory Structure

```
server/
├── src/
│   ├── config/         db.js, socket.js, multer.js, constants.js
│   ├── models/         User, Exam, Question, ExamSession, ProctoringEvent,
│   │                   VideoChunk, PairingToken
│   ├── routes/         auth, users, exams, questions, sessions,
│   │                   proctoring, results, analytics, recordings
│   ├── controllers/    (one per route file)
│   ├── services/       authService, examService, sessionService,
│   │                   proctoringService, analyticsService, recordingService
│   ├── middleware/     authMiddleware, roleMiddleware, validateRequest,
│   │                   errorHandler, rateLimiter
│   ├── utils/          ApiError.js, asyncHandler.js, jwtUtils.js, emailUtils.js
│   └── app.js          Express app factory
└── server.js           HTTP server + Socket.IO bootstrap
```

### 4.4 Mongoose Models

| Model | Key Fields |
|-------|-----------|
| `User` | `name, email, passwordHash, role (student/admin/proctor), isActive` |
| `Exam` | `title, description, questions[], duration, passMark, status, assignedStudents[]` |
| `Question` | `text, type (mcq/text), options[], correctAnswer, marks, category` |
| `ExamSession` | `exam, student, status, answers[], startTime, endTime, score, violations` |
| `ProctoringEvent` | `session, type, severity, timestamp, metadata, reviewStatus, reviewedBy` |
| `VideoChunk` | `session, chunkIndex, filename, size, uploadedAt, s3Key` |
| `PairingToken` | `session, token, expiresAt, usedAt, mobileSocketId` |

---

## 5. Real-Time Communication

### 5.1 Socket.IO Architecture

The Socket.IO server runs on the same HTTP server as Express. Namespaces and rooms provide isolation:

| Namespace | Purpose |
|-----------|---------|
| `/` (default) | General events; authenticated via JWT in `auth` handshake query |

### 5.2 Rooms

| Room Pattern | Members | Purpose |
|-------------|---------|---------|
| `exam-session-{sessionId}` | Student + all proctors monitoring that session | Bidirectional session events |
| `proctor-exam-{examId}` | All proctors assigned to an exam | Aggregate monitoring dashboard |
| `pairing-{sessionId}` | Student browser + mobile browser | WebRTC signaling channel |

### 5.3 Socket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-session` | `{ sessionId, token }` | Student joins exam room |
| `proctor-join` | `{ examId, token }` | Proctor joins exam monitoring room |
| `violation-event` | `{ sessionId, type, severity, metadata }` | Report a proctoring violation |
| `webrtc-offer` | `{ sessionId, offer }` | Student sends SDP offer to mobile |
| `webrtc-answer` | `{ sessionId, answer }` | Mobile sends SDP answer |
| `webrtc-ice-candidate` | `{ sessionId, candidate, target }` | Exchange ICE candidates |
| `pairing-request` | `{ sessionId, token }` | Mobile verifies pairing token |
| `heartbeat` | `{ sessionId }` | Keep session alive every 30 s |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `session-joined` | `{ sessionId, examTitle }` | Confirm room join |
| `violation-logged` | `{ event }` | Broadcast violation to proctor room |
| `session-terminated` | `{ reason }` | Force-end exam (proctor action) |
| `session-warning` | `{ message }` | Send warning to student |
| `webrtc-offer` | `{ offer }` | Relay offer to mobile peer |
| `webrtc-answer` | `{ answer }` | Relay answer to student |
| `webrtc-ice-candidate` | `{ candidate }` | Relay ICE candidate |
| `pairing-confirmed` | `{ mobileId }` | Notify student mobile connected |
| `time-warning` | `{ remainingSeconds }` | 10-min / 5-min exam timer warnings |
| `auto-submitted` | `{ sessionId }` | Server submitted exam on time expiry |

---

## 6. WebRTC Signaling Flow

Secondary camera support allows a student to connect their mobile phone as a secondary video feed that proctors can view.

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant SRV as Socket.IO Server
    participant M as Mobile Browser

    Note over S,M: Pairing Phase
    S->>SRV: POST /proctoring/sessions/:id/pairing-token
    SRV-->>S: { token, qrCodeUrl }
    M->>SRV: POST /proctoring/pair/verify { token }
    SRV-->>M: { valid: true, sessionId }
    M->>SRV: socket connect → join pairing-{sessionId}
    SRV-->>S: pairing-confirmed { mobileId }

    Note over S,M: WebRTC Negotiation
    S->>S: new RTCPeerConnection(iceConfig)
    S->>S: getUserMedia() → addTrack()
    S->>S: createOffer()
    S->>SRV: webrtc-offer { sessionId, offer }
    SRV->>M: webrtc-offer { offer }
    M->>M: setRemoteDescription(offer)
    M->>M: getUserMedia() → addTrack()
    M->>M: createAnswer()
    M->>SRV: webrtc-answer { sessionId, answer }
    SRV->>S: webrtc-answer { answer }
    S->>S: setRemoteDescription(answer)

    Note over S,M: ICE Exchange
    S->>SRV: webrtc-ice-candidate { candidate, target: mobile }
    SRV->>M: webrtc-ice-candidate { candidate }
    M->>SRV: webrtc-ice-candidate { candidate, target: student }
    SRV->>S: webrtc-ice-candidate { candidate }

    Note over S,M: Streaming
    M-->>S: MediaStream (P2P, direct)
    S->>S: Display remote stream in <video>
```

### ICE Server Configuration

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    {
      "urls": "turn:your-turn-server.example.com:3478",
      "username": "proctor",
      "credential": "<secret>"
    }
  ]
}
```

---

## 7. Exam Session Data Flow

```mermaid
flowchart TD
    A["Student: Dashboard\nGET /exams"] --> B["Click 'Start Exam'\nPOST /sessions/:id/start"]
    B --> C{Session created?\nstatus = in_progress}
    C -->|No: already started / not assigned| ERR1["400 / 403 Error"]
    C -->|Yes| D["Device Check Phase\nuseWebcamProctoring.startProctoring()\nuseAudioMonitor.startMonitor()\nuseBrowserSecurity.lockBrowser()"]
    D --> E["Active Exam Phase\nSocket: join-session\nTimer countdown begins"]
    E --> F["Answer Loop\nPOST /sessions/:id/answer\n{questionId, answer, timeSpent}"]
    F --> F
    F --> G{Exam ends?}
    G -->|Timer expires| H1["Server: auto-submit\nEmit: auto-submitted"]
    G -->|Student clicks Submit| H2["POST /sessions/:id/submit"]
    G -->|Proctor terminates| H3["PUT /proctoring/sessions/:id/terminate\nEmit: session-terminated"]
    H1 --> I["Evaluation Service\nScore MCQ answers\nMark text questions pending"]
    H2 --> I
    I --> J["Update ExamSession\nstatus = completed\nscore, passed"]
    J --> K["GET /results/session/:id\nDisplay result to student"]
    J --> L["Proctor Dashboard\nSee completed session"]
```

### Session Status State Machine

```
created → in_progress → completed
                      ↘ terminated
```

| Status | Trigger |
|--------|---------|
| `created` | Student enrolled in exam |
| `in_progress` | `POST /sessions/:id/start` called |
| `completed` | Student submitted or auto-submitted |
| `terminated` | Proctor action or critical violation threshold |

---

## 8. File Storage Architecture

### 8.1 Current: Local Disk via Multer

```mermaid
flowchart LR
    C["Client\nMediaRecorder Blob"] -->|"POST /recordings/sessions/:id/chunks\nmultipart/form-data"| MW["Multer Middleware\ndiskStorage"]
    MW --> DISK["Server File System\n/uploads/recordings/{sessionId}/chunk-{n}.webm"]
    MW --> DB["VideoChunk Model\n{ session, chunkIndex, filename, size }"]
```

**Multer configuration:**

```js
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('uploads', 'recordings', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `chunk-${Date.now()}.webm`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per chunk
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new ApiError(400, 'Only video files are accepted'));
  },
});
```

### 8.2 Future: AWS S3 Migration Path

```mermaid
flowchart LR
    C["Client Blob"] -->|"POST chunk"| MW["Multer memoryStorage"]
    MW --> SVC["Recording Service"]
    SVC -->|"s3.putObject()"| S3["AWS S3 Bucket\nsecureproctor-recordings"]
    SVC -->|"update s3Key"| DB["VideoChunk.s3Key"]
    S3 -->|"presigned URL"| PRO["Proctor Browser\nVideo Playback"]
```

**Migration steps:**

1. Replace `multer.diskStorage` with `multer.memoryStorage`.
2. Add `@aws-sdk/client-s3` and configure with env vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`).
3. Upload `req.file.buffer` using `PutObjectCommand`.
4. Store returned S3 key in `VideoChunk.s3Key`.
5. Generate presigned URLs with `GetObjectCommand` + `getSignedUrl` for playback.

---

## 9. Security Layers

Requests pass through a defence-in-depth security stack before reaching any business logic.

```mermaid
flowchart TD
    REQ["Incoming HTTPS Request"] --> NG["Layer 1: Nginx\n• SSL/TLS termination\n• Rate limit (limit_req_zone)\n• Hide server headers\n• Block non-API paths"]
    NG --> HLM["Layer 2: Helmet\n• Content-Security-Policy\n• X-Frame-Options: DENY\n• HSTS\n• X-Content-Type-Options"]
    HLM --> CRS["Layer 3: CORS\n• Origin whitelist from .env\n• Credentials: true\n• Preflight caching"]
    CRS --> RL["Layer 4: express-rate-limit\n• Global: 100 req / 15 min\n• Auth routes: 10 req / 15 min"]
    RL --> AUTH["Layer 5: authMiddleware\n• Extract Bearer token\n• Verify JWT signature + expiry\n• Attach req.user"]
    AUTH --> ROLE["Layer 6: roleMiddleware\n• Check req.user.role vs required roles\n• e.g. requireRole('admin','proctor')"]
    ROLE --> ZOD["Layer 7: Zod Validation\n• validateRequest(schema)\n• Type-coerce and sanitize body\n• Return 422 on failure"]
    ZOD --> CTRL["Controller / Business Logic"]
```

### JWT Strategy

| Property | Value |
|----------|-------|
| Algorithm | `HS256` |
| Access token TTL | `15m` |
| Refresh token TTL | `7d` |
| Storage (client) | `httpOnly` cookie (access) + localStorage refresh fallback |
| Rotation | Refresh token rotated on each use |

### Password Security

- Stored as `bcrypt` hash with **salt rounds = 12**.
- Reset tokens are `crypto.randomBytes(32)` hashed with `SHA-256` before DB storage.

---

## 10. MediaPipe Integration

### 10.1 Loading Strategy

MediaPipe WASM assets are loaded from the CDN at runtime to avoid bundling large binary files:

```js
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const filesetResolver = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
);

const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    delegate: 'GPU',  // falls back to CPU
  },
  outputFaceBlendshapes: true,
  runningMode: 'VIDEO',
  numFaces: 2,         // detect >1 face as violation
});
```

### 10.2 Frame Analysis Loop

```js
let lastVideoTime = -1;

const detectFrame = () => {
  if (videoRef.current.currentTime !== lastVideoTime) {
    lastVideoTime = videoRef.current.currentTime;

    const results = faceLandmarker.detectForVideo(
      videoRef.current,
      performance.now()
    );

    analyzeResults(results);
  }
  requestAnimationFrame(detectFrame);
};
```

### 10.3 Violation Detection Logic

```mermaid
flowchart TD
    RES["FaceLandmarker Results\nresults.faceLandmarks[]"] --> FC{Face count}
    FC -->|"0 faces"| VNF["Violation: NO_FACE\nstudent left frame"]
    FC -->|"> 1 face"| VMF["Violation: MULTIPLE_FACES\npossible impersonation"]
    FC -->|"1 face"| PH["Analyse head pose\nlandmarks: nose tip, chin,\nleft/right ear"]
    PH --> YAW{Yaw > 30°?}
    YAW -->|Yes| VLL["Violation: LOOKING_AWAY"]
    YAW -->|No| PITCH{Pitch > 20°?}
    PITCH -->|Yes| VLD["Violation: LOOKING_DOWN"]
    PITCH -->|No| OK["Frame OK — no violation"]
```

### 10.4 Violation Escalation

| Consecutive Violations | Action |
|-----------------------|--------|
| 1 – 2 | Log to `ProctoringEvent` (severity: `low`) |
| 3 – 5 | Emit `session-warning` via Socket.IO; log (severity: `medium`) |
| 6 – 9 | Emit second warning; log (severity: `high`) |
| ≥ 10 | Call `POST /proctoring/sessions/:id/terminate` automatically |

Head-pose angles are estimated from 3D landmark coordinates using a simplified PnP approximation (no external library required).
