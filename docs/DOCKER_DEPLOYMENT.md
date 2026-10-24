# Docker Deployment Guide — SecureProctor

This guide covers everything you need to deploy SecureProctor using Docker and Docker Compose, from a quick local spin-up to a production HTTPS deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture](#architecture)
3. [Volumes & Network](#volumes--network)
4. [Production Deployment](#production-deployment)
5. [Development Mode](#development-mode)
6. [HTTPS Setup](#https-setup)
7. [Useful Docker Commands](#useful-docker-commands)
8. [Health Check Endpoints](#health-check-endpoints)
9. [Scaling Considerations](#scaling-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Docker Engine | **24.0+** | `docker --version` |
| Docker Compose | **V2** (plugin) | `docker compose version` — note: no hyphen |
| Domain name | — | Required for HTTPS / TLS certificates |
| RAM | 2 GB minimum | 4 GB recommended for production |
| Disk | 10 GB free | MongoDB data + uploaded exam files |

> [!IMPORTANT]
> Docker Compose **V2** ships as a plugin (`docker compose`). The legacy `docker-compose` (V1) binary is not supported.

---

## Architecture

SecureProctor runs as a **4-service stack**:

```
                  ┌─────────────────────────────────────────┐
                  │           secureproctor_network          │
                  │                                          │
Internet ──► nginx (80/443) ──► client (React, :3000)        │
                  │           └──► server (Express, :5000)   │
                  │                    └──► mongodb (:27017) │
                  └─────────────────────────────────────────┘
```

| Service | Image | Role |
|---|---|---|
| `mongodb` | `mongo:7` | Primary data store |
| `server` | Custom (Node 20) | REST API + Socket.IO proctoring backend |
| `client` | Custom (React/Vite) | Single-page application |
| `nginx` | `nginx:alpine` | Reverse proxy, TLS termination, static asset serving |

All services communicate over the internal **`secureproctor_network`** bridge. Only `nginx` exposes ports to the host.

---

## Volumes & Network

### Named Volumes

| Volume | Purpose |
|---|---|
| `secureproctor_mongo_data` | MongoDB data files — persists across container restarts |
| `secureproctor_mongo_config` | MongoDB configuration data |
| `secureproctor_server_uploads` | Exam attachments and uploaded files from the server |

> [!CAUTION]
> Never run `docker compose down -v` in production — it deletes all named volumes including your database!

### Network

| Network | Driver | Scope |
|---|---|---|
| `secureproctor_network` | `bridge` | All four services |

---

## Production Deployment

### Step 1 — Set Required Environment Variables

Copy the example file and fill in secrets:

```bash
cp .env.example .env
```

Edit `.env` and set **at minimum**:

```env
# ── Security (required) ──────────────────────────────────────
JWT_SECRET=<long-random-string-min-64-chars>
COOKIE_SECRET=<another-long-random-string>

# ── MongoDB credentials (required) ───────────────────────────
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=<strong-password>
MONGO_DB_NAME=secureproctor

# ── Ports (optional, defaults shown) ─────────────────────────
HTTP_PORT=80
HTTPS_PORT=443

# ── App (optional) ────────────────────────────────────────────
NODE_ENV=production
CLIENT_URL=https://your-domain.com
```

> [!TIP]
> Generate a secure secret with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Step 2 — Build and Start All Services

```bash
docker compose up -d --build
```

This will:
- Pull base images from Docker Hub
- Build the `server` and `client` images from their Dockerfiles
- Create volumes and network if they don't exist
- Start all four containers in detached mode

### Step 3 — Wait for Health Checks

Poll until all services are healthy:

```bash
docker compose ps
```

Wait until every service shows `healthy` in the `STATUS` column. The `mongodb` service typically takes 10–30 seconds on first start while it initialises the data directory.

You can also watch logs in real time:

```bash
docker compose logs -f
```

### Step 4 — Bootstrap the Admin Account

Run the admin bootstrap script **once** after a fresh database:

```bash
docker compose exec server node src/scripts/bootstrapAdmin.js
```

This creates the initial superadmin user. Check the script output for the generated credentials and **change the password immediately** after first login.

### Step 5 — (Optional) Seed Demo Data

Populate the database with sample exams, questions, and student accounts for testing:

```bash
docker compose exec server node src/scripts/seedDemoData.js
```

> [!NOTE]
> Skip this step in production unless you want demo content in your database.

### Step 6 — Verify the Deployment

```bash
curl http://localhost/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": "connected",
    "filesystem": "writable"
  }
}
```

---

## Development Mode

A `docker-compose.dev.yml` override adds volume mounts for hot-reloading and disables production optimisations:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Key differences in dev mode:
- Server uses `nodemon` for auto-restart on file changes
- Client uses Vite dev server with HMR
- Source directories are bind-mounted into containers
- MongoDB port `27017` is exposed to the host for direct access with GUI tools (e.g., MongoDB Compass)
- `NODE_ENV=development`

---

## HTTPS Setup

### Step 1 — Obtain a TLS Certificate

Using **Certbot** (Let's Encrypt):

```bash
# Install certbot (Ubuntu/Debian)
sudo apt install certbot

# Obtain a certificate (standalone mode — stop nginx first)
docker compose stop nginx
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

Alternatively, use Certbot's webroot or DNS challenge methods if you prefer to keep nginx running.

### Step 2 — Place Certificates

Copy the certificate files into the `nginx/ssl/` directory:

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

### Step 3 — Enable the HTTPS Server Block

Open `nginx/nginx.conf` and uncomment the HTTPS server block:

```nginx
# Uncomment this block:
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... rest of HTTPS config
}
```

### Step 4 — Update Environment Variables

In `.env`:

```env
HTTP_PORT=80
HTTPS_PORT=443
```

### Step 5 — Reload

```bash
docker compose up -d --build nginx
```

### Certificate Renewal

Set up automatic renewal with a cron job:

```bash
# Add to crontab (runs twice daily as recommended by Let's Encrypt)
0 0,12 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/project/nginx/ssl/ && \
  cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/project/nginx/ssl/ && \
  docker compose exec nginx nginx -s reload
```

---

## Useful Docker Commands

### Viewing Logs

```bash
# Stream all service logs
docker compose logs -f

# Stream logs for a specific service
docker compose logs -f server
docker compose logs -f mongodb

# Last 100 lines of client logs
docker compose logs --tail=100 client
```

### Managing Services

```bash
# Restart a single service (e.g., after config change)
docker compose restart server

# Stop all services (data is preserved)
docker compose down

# Stop and remove all containers, networks (data volumes preserved)
docker compose down

# ⚠️ DANGER: Stop and delete ALL volumes (wipes database!)
docker compose down -v

# Rebuild and restart a single service
docker compose up -d --build server
```

### Executing Commands Inside Containers

```bash
# Open a shell in the server container
docker compose exec server sh

# Open a bash shell in the mongodb container
docker compose exec mongodb bash

# Run a one-off Node.js script
docker compose exec server node src/scripts/someScript.js

# Connect to MongoDB CLI
docker compose exec mongodb mongosh -u $MONGO_ROOT_USERNAME -p $MONGO_ROOT_PASSWORD
```

### Volume Operations

```bash
# Inspect a named volume (shows mount point and metadata)
docker volume inspect secureproctor_mongo_data

# List all project volumes
docker volume ls | grep secureproctor
```

### Backup & Restore MongoDB

**Backup:**

```bash
# Dump to a local directory
docker compose exec mongodb mongodump \
  --username $MONGO_ROOT_USERNAME \
  --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin \
  --db secureproctor \
  --out /tmp/dump

# Copy the dump out of the container
docker compose cp mongodb:/tmp/dump ./backup/$(date +%Y-%m-%d)
```

**Restore:**

```bash
# Copy backup into the container
docker compose cp ./backup/2024-01-01 mongodb:/tmp/restore

# Restore
docker compose exec mongodb mongorestore \
  --username $MONGO_ROOT_USERNAME \
  --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin \
  --db secureproctor \
  /tmp/restore/secureproctor
```

---

## Health Check Endpoints

Each service exposes a health check that Docker uses to determine container readiness.

| Service | Health Check | What It Verifies |
|---|---|---|
| `mongodb` | `mongosh --eval "db.adminCommand('ping')"` | MongoDB process is up and accepting connections |
| `server` | `GET /api/v1/health` | Express app is running, DB is connected, filesystem is writable |
| `client` | `GET /` (nginx serving static files) | React build is served correctly |
| `nginx` | `curl -f http://localhost/api/v1/health` | Full proxy chain is working end-to-end |

The `/api/v1/health` endpoint returns:

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "filesystem": "writable"
  }
}
```

Health check intervals and retry counts are configured in `docker-compose.yml` and can be tuned to suit your infrastructure.

---

## Scaling Considerations

### Server (Horizontal Scaling)

The Express/Socket.IO server is **mostly stateless** — session data and exam state are persisted in MongoDB, making it suitable for horizontal scaling.

**However**, Socket.IO requires that a client always connects to the **same server instance** (sticky sessions) because the WebSocket handshake and room membership are in-memory.

To scale the server horizontally:

1. **Use a load balancer with sticky sessions** (e.g., nginx `ip_hash`, HAProxy source balancing, or an AWS ALB with session stickiness).
2. **Use Socket.IO Redis Adapter** to share room/event state across instances:
   ```bash
   npm install @socket.io/redis-adapter ioredis
   ```
   Then configure the adapter in `src/socket/index.js`.

```bash
# Scale to 3 server replicas (requires sticky session load balancer)
docker compose up -d --scale server=3
```

### MongoDB (Vertical Scaling / Replica Sets)

For production resilience, consider upgrading to a **MongoDB Replica Set** or using **MongoDB Atlas** (managed service):

- Provides automatic failover
- Enables read scaling via secondary reads
- Required for change streams (used by the proctoring live feed)

### Client (Static Files)

The React build is purely static. For high traffic, serve client assets from a **CDN** (Cloudflare, AWS CloudFront) by pointing the CDN origin to your nginx `/` endpoint.

### nginx

nginx is highly performant as a single instance for most workloads. For extreme scale, place a hardware load balancer or cloud load balancer in front of multiple nginx instances.

---

## Troubleshooting

| Symptom | Likely Cause | Solution |
|---|---|---|
| `mongodb` container exits immediately | Wrong `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` format or corrupt data directory | Check logs: `docker compose logs mongodb`. If data is corrupt, remove the volume and restart. |
| `server` shows `MongoServerError: Authentication failed` | Credentials in `.env` don't match those used when MongoDB volume was first created | Destroy the `mongo_data` volume and redeploy, or fix the credentials to match the existing volume. |
| `nginx` returns `502 Bad Gateway` | `server` or `client` container is not healthy yet | Wait for health checks to pass: `docker compose ps`. Check server logs for startup errors. |
| Port 80 / 443 already in use | Another process (Apache, local nginx) is using the port | Stop the conflicting process or change `HTTP_PORT` / `HTTPS_PORT` in `.env`. |
| File uploads fail | `server_uploads` volume not writable or disk full | Check volume permissions and available disk space: `df -h`. |
| WebSocket connections drop | Missing `Upgrade` / `Connection` headers in nginx proxy config | Verify `nginx/nginx.conf` has the correct proxy headers for Socket.IO (`Upgrade`, `Connection`). |
| `docker compose` command not found | Docker Compose V1 installed instead of V2 | Install Docker Compose V2 plugin: `apt install docker-compose-plugin` or update Docker Desktop. |
| Admin bootstrap script fails | Database not yet ready | Wait a few seconds and retry. Ensure `mongodb` health check shows `healthy`. |
| Hot reload not working in dev mode | Bind mount path mismatch on Windows | Ensure paths in `docker-compose.dev.yml` use forward slashes and that Docker Desktop has access to the drive. |
| HTTPS certificate errors | `fullchain.pem` or `privkey.pem` missing / wrong path | Confirm files exist at `nginx/ssl/` and paths in `nginx.conf` match exactly. |
| Container out of memory | Insufficient RAM allocated to Docker | Increase RAM in Docker Desktop settings (Resources → Memory). |

---

*For application-level issues, see the main [README](../README.md). For test-related questions, see [TESTING.md](./TESTING.md).*
