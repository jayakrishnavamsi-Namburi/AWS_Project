# SecureProctor MERN

## Enterprise-Grade AI-Proctored Online Examination System

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

SecureProctor MERN is a production-oriented, full-stack online examination platform with AI-powered proctoring, real-time monitoring, and enterprise-grade security. Inspired by platforms like TCS NQT, Mercer Mettl, and Cognizant Assessments.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Quick Start — Local Development](#quick-start--local-development)
5. [Quick Start — Docker](#quick-start--docker)
6. [Environment Variables](#environment-variables)
7. [Initial Setup — Bootstrap Admin](#initial-setup--bootstrap-admin)
8. [Seeding Demo Data](#seeding-demo-data)
9. [Running Tests](#running-tests)
10. [Persistence Verification](#persistence-verification)
11. [API Overview](#api-overview)
12. [Architecture Overview](#architecture-overview)
13. [Proctoring Capabilities](#proctoring-capabilities)
14. [Security Considerations](#security-considerations)
15. [Docker Deployment](#docker-deployment)
16. [Documentation](#documentation)

---

## Features

### Core Examination
- **Multi-type questions**: MCQ, Multiple Select, True/False, Short Answer
- **Configurable exams**: Duration, scheduling, negative marking, randomization
- **Auto-save**: Answers saved every 30 seconds and on change
- **Server-side deadline enforcement** with 10-second grace period for network latency
- **Idempotent submission**: Safe to submit multiple times (only first is evaluated)
- **Results and analytics**: Per-question breakdown, pass/fail, time spent

### AI Proctoring
- **Face detection** via Google MediaPipe Face Landmarker (WebAssembly, runs in-browser)
- **Face absence detection**: Alerts when no face is detected for > 5 seconds
- **Multiple face detection**: Flags when more than one face is visible
- **Head pose estimation**: Detects excessive looking away from screen
- **Audio monitoring**: Web Audio API RMS analysis, sustained noise spike detection
- **Browser security**: Fullscreen enforcement, tab-blur, clipboard interception, devtools prevention
- **Real-time violation escalation**: Warning → Auto-Submit pipeline (configurable thresholds)
- **Event deduplication**: Prevents event spam with 2.5-second cooldown per event type

### Real-Time Monitoring
- **Proctor dashboard**: Live candidate cards with webcam status, violation counts, event timeline
- **Socket.IO**: Real-time event broadcasting to proctors
- **Secondary camera**: QR-paired mobile device streams rear camera via WebRTC
- **Proctor controls**: Terminate sessions, review events, dismiss false positives

### Administration
- **Role-based access**: `admin`, `proctor`, `student` with full backend enforcement
- **Exam management**: Create, publish, archive, assign students
- **Question bank**: Full CRUD with type-specific validators
- **Analytics**: Exam performance charts, score distribution, CSV export
- **User management**: Status toggle, student listing

### Security
- **JWT authentication** (Bearer token + HttpOnly cookie)
- **bcrypt password hashing** (cost factor 12)
- **Rate limiting**: Auth endpoints (25 req/15min), global (300 req/15min)
- **Helmet** security headers
- **Zod** request validation on all endpoints
- **Role + resource ownership** checks on every protected endpoint

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router 6 |
| State | Context API (Auth, Socket) |
| HTTP Client | Axios |
| Real-time | Socket.IO Client |
| AI/ML | Google MediaPipe Face Landmarker (WASM) |
| Audio | Web Audio API |
| Video | WebRTC, getUserMedia |
| QR Pairing | qrcode.react |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js 20, Express 4 |
| Database | MongoDB 7 with Mongoose 8 |
| Authentication | JWT + bcryptjs |
| Real-time Server | Socket.IO 4 |
| Validation | Zod |
| Logging | Pino + Pino-Pretty |
| Security | Helmet, express-rate-limit, CORS |
| File Storage | Multer + local disk (S3-compatible interface) |
| Testing | Jest 29, Supertest |
| DevOps | Docker, Docker Compose, Nginx |

---

## Project Structure

```
SecureProctor-MERN/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Button, Input, Card, Badge, Modal
│   │   │   ├── layout/         # Navbar, Sidebar, Layout, ProtectedRoute
│   │   │   ├── exam/           # Timer, Navigator, QuestionCard, Summary
│   │   │   ├── proctoring/     # WebcamMonitor, AudioVisualizer, PolicyModal
│   │   │   ├── camera/         # MobileQRModal, SecondaryCameraStream
│   │   │   └── charts/         # ScoreDistribution, ViolationDistribution
│   │   ├── pages/
│   │   │   ├── public/         # Landing, Features, Login, Register, etc.
│   │   │   ├── student/        # Dashboard, ExamFlow, LiveExam, Result
│   │   │   ├── admin/          # Dashboard, ExamMgmt, QuestionBank, etc.
│   │   │   ├── proctor/        # ProctorDashboard
│   │   │   └── mobile/         # MobileCameraBroadcaster
│   │   ├── hooks/              # useWebcamProctoring, useAudioMonitor, etc.
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── services/           # Axios API wrappers
│   │   └── routes/             # AppRoutes.jsx
│   ├── Dockerfile
│   └── package.json
│
├── server/                     # Express backend API
│   ├── src/
│   │   ├── config/             # env, logger, database, constants
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # auth, roles, validate, ratelimit, error
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # Express routers
│   │   ├── services/           # Business logic
│   │   ├── sockets/            # Socket.IO event managers
│   │   ├── validators/         # Zod schemas
│   │   ├── scripts/            # bootstrapAdmin, seedDemoData
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # HTTP + Socket.IO server entrypoint
│   ├── tests/                  # Jest unit tests
│   ├── uploads/                # Persisted file storage (Docker volume)
│   ├── Dockerfile
│   └── package.json
│
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.conf
│   └── ssl/                    # TLS certificates (not committed)
│
├── scripts/                    # Operational scripts
│   └── test-persistence.js     # MongoDB + filesystem persistence test
│
├── docs/                       # Technical documentation
│
├── docker-compose.yml          # Production Compose
├── docker-compose.dev.yml      # Development Compose override
├── .env.example                # Environment variable template
└── README.md
```

---

## Quick Start — Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB 7 running locally on port 27017

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/secureproctor-mern.git
cd secureproctor-mern
npm install          # installs root workspace
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# Server configuration (already pre-filled for dev)
cp .env.example server/.env
# Edit server/.env — update JWT_SECRET and COOKIE_SECRET
```

### 3. Bootstrap the admin account

```bash
cd server
node src/scripts/bootstrapAdmin.js
```

Follow the prompts to create the first admin user.

### 4. (Optional) Seed demo data

```bash
node src/scripts/seedDemoData.js
```

Creates:
- admin@secureproctor.com / Password@123
- proctor@secureproctor.com / Password@123
- student1@university.edu / Password@123
- student2@university.edu / Password@123
- 5 sample questions + 1 published exam

### 5. Start the server

```bash
cd server
npm run dev
# → http://localhost:5000/api/v1/health
```

### 6. Start the client

```bash
cd client
npm run dev
# → http://localhost:5173
```

---

## Quick Start — Docker

### Prerequisites

- Docker 24+
- Docker Compose V2

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET, COOKIE_SECRET, MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD
```

**Required variables for production Docker:**
```env
JWT_SECRET=<at-least-32-random-chars>
COOKIE_SECRET=<at-least-32-random-chars>
MONGO_ROOT_USERNAME=mongoadmin
MONGO_ROOT_PASSWORD=<strong-password>
```

### 2. Build and start

```bash
docker compose up -d --build
```

Services start in order: `mongodb` → `server` → `client` → `nginx`.

### 3. Verify health

```bash
curl http://localhost/api/v1/health
# {"status":"healthy","timestamp":"...","environment":"production"}
```

### 4. Bootstrap admin inside container

```bash
docker compose exec server node src/scripts/bootstrapAdmin.js
```

### 5. Seed demo data (optional)

```bash
docker compose exec server node src/scripts/seedDemoData.js
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full reference. Key variables:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `5000` | Backend API port |
| `MONGODB_URI` | `mongodb://localhost:27017/secureproctor_db` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | HS256 signing key — min 32 chars |
| `COOKIE_SECRET` | *(required)* | Cookie signing key — min 32 chars |
| `JWT_EXPIRES_IN` | `7d` | Token TTL |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `MEDIA_STORAGE_PATH` | `./uploads` | Upload directory |
| `PROCTOR_WARNING_THRESHOLD` | `3` | Events before first warning |
| `PROCTOR_AUTOSUBMIT_THRESHOLD` | `5` | Events before auto-submission |

---

## Initial Setup — Bootstrap Admin

The platform has no default admin account. Create one securely:

```bash
# Local
cd server && node src/scripts/bootstrapAdmin.js

# Docker
docker compose exec server node src/scripts/bootstrapAdmin.js
```

The script will:
1. Check for an existing admin account
2. Prompt for name, email, and password interactively (no hardcoded defaults)
3. Validate the password meets complexity requirements
4. Hash with bcrypt (cost 12) and save

> **Never commit credentials.** The bootstrap script refuses to run if env variables look like development defaults in production mode.

---

## Seeding Demo Data

```bash
# Local
cd server && node src/scripts/seedDemoData.js

# Docker
docker compose exec server node src/scripts/seedDemoData.js
```

> ⚠️ Use for development and demo only. Do not seed demo data in production.

---

## Running Tests

```bash
cd server

# Run all unit tests
npm test

# Run with coverage report
npm run test:coverage
```

Test suites:
- `tests/auth.test.js` — bcrypt hashing, JWT signing/verification, Zod schema validation
- `tests/evaluation.test.js` — MCQ, multiple-select, true/false, short-answer scoring, negative marking
- `tests/session.test.js` — deadline enforcement, grace period, duplicate submission protection, state machine
- `tests/escalation.test.js` — event deduplication, warning threshold, auto-submit threshold

---

## Persistence Verification

Verifies MongoDB write/read and the uploads filesystem are working:

```bash
# Local (MongoDB must be running)
node scripts/test-persistence.js

# Against Docker stack
MONGODB_URI=mongodb://mongoadmin:password@localhost:27017/secureproctor_db?authSource=admin \
  node scripts/test-persistence.js
```

---

## API Overview

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| POST | `/auth/register` | Public | Student registration |
| POST | `/auth/login` | Public | Login (all roles) |
| POST | `/auth/logout` | Auth | Logout |
| POST | `/auth/forgot-password` | Public | Request reset email |
| POST | `/auth/reset-password` | Public | Reset with token |
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id/status` | Admin | Enable/disable account |
| GET | `/questions` | Admin | List questions |
| POST | `/questions` | Admin | Create question |
| GET | `/exams` | Auth | List exams (role-filtered) |
| POST | `/exams` | Admin | Create exam |
| PUT | `/exams/:id/publish` | Admin | Publish exam |
| POST | `/sessions/:id/start` | Student | Start exam session |
| POST | `/sessions/:id/answer` | Student | Save answer |
| POST | `/sessions/:id/submit` | Student | Submit exam |
| GET | `/proctoring/sessions` | Proctor/Admin | Live sessions |
| POST | `/proctoring/sessions/:id/events` | Student | Record proctoring event |
| GET | `/analytics/dashboard` | Admin | Dashboard stats |
| GET | `/analytics/exams/:id` | Admin | Exam analytics |

Full API documentation: [`docs/API.md`](docs/API.md)

---

## Architecture Overview

```
Browser (Student)
  ├── React App (Vite)
  │   ├── MediaPipe WASM (face detection, in-browser)
  │   ├── Web Audio API (noise detection)
  │   ├── WebRTC (mobile camera stream)
  │   └── Socket.IO Client (real-time events)
  │
  └── → Nginx (port 80/443)
        ├── /api/* → Express Server (port 5000)
        │   ├── REST API (CRUD, auth, exams, sessions)
        │   ├── Socket.IO (real-time proctoring events)
        │   └── MongoDB (Mongoose)
        └── /* → React SPA (built static files)

Mobile Camera (Secondary)
  └── WebRTC → Socket.IO signaling → Proctor Browser
```

Full architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Proctoring Capabilities

| Signal | Detection Method | Threshold |
|---|---|---|
| Face absent | MediaPipe Face Landmarker | > 5 seconds |
| Multiple faces | MediaPipe face count | Immediate |
| Head deviation | Face landmark angles | > 4 seconds |
| Tab blur / focus loss | `visibilitychange` + `blur` event | 1 occurrence |
| Fullscreen exit | Fullscreen API | 1 occurrence |
| Clipboard action | `copy/paste/cut` events | 1 occurrence |
| DevTools attempt | Keyboard shortcuts, `F12` | 1 occurrence |
| Audio noise spike | Web Audio API RMS | > 0.35 sustained |
| Mobile disconnected | Socket.IO disconnect | Immediate |

Full proctoring documentation: [`docs/PROCTORING.md`](docs/PROCTORING.md)

---

## Security Considerations

- All passwords hashed with bcrypt (cost 12)
- JWT signed with HS256; never stored in `localStorage` in production (use HttpOnly cookies)
- All protected routes independently verify JWT + role + resource ownership
- Zod validation on every request body
- Rate limiting on auth endpoints (25/15min) and global (300/15min)
- Helmet sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- MongoDB connections authenticated in production
- No hardcoded credentials or default admin accounts
- HTTPS-ready Nginx configuration included
- SQL injection irrelevant (MongoDB); NoSQL injection mitigated by Mongoose casting

Full security documentation: [`docs/SECURITY.md`](docs/SECURITY.md)

---

## Docker Deployment

### Production

```bash
docker compose up -d --build
docker compose logs -f
docker compose ps
```

### Development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Stopping

```bash
docker compose down          # stops containers, preserves volumes
docker compose down -v       # stops containers and DELETES volumes (data loss!)
```

### Volumes

| Volume | Purpose |
|---|---|
| `secureproctor_mongo_data` | MongoDB database files |
| `secureproctor_mongo_config` | MongoDB configuration |
| `secureproctor_server_uploads` | Uploaded files and video chunks |

Full deployment guide: [`docs/DOCKER_DEPLOYMENT.md`](docs/DOCKER_DEPLOYMENT.md)

---

## Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, component diagram, data flow |
| [`docs/API.md`](docs/API.md) | Full REST API reference with request/response examples |
| [`docs/DATABASE.md`](docs/DATABASE.md) | MongoDB schema reference, indexes, relationships |
| [`docs/PROCTORING.md`](docs/PROCTORING.md) | AI proctoring system, event types, escalation policy |
| [`docs/DOCKER_DEPLOYMENT.md`](docs/DOCKER_DEPLOYMENT.md) | Docker/Nginx deployment guide |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing strategy, running tests, writing new tests |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security model, threat mitigations, production checklist |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | Feature completion status |

---

## License

MIT — see [LICENSE](LICENSE) for details.
