# EduFlow — Production Deployment, CI/CD & Operations Guide

This guide details the production architecture, deployment configuration, CI/CD pipeline, monitoring, security controls, and disaster recovery procedures for **EduFlow**.

---

## 1. Production Architecture Overview

```text
  [ Users / Browsers ]
          │
          ▼ HTTPS (TLS 1.3)
  ┌────────────────────────────────────────────────────────┐
  │  Frontend CDN (Vercel / Cloudflare Pages / AWS CloudFront)
  │  - Static Single Page Application (Vite React)
  │  - Global Edge Caching & Compression (Gzip/Brotli)
  └────────────────────────┬───────────────────────────────┘
                           │ API Requests / Cookies (HTTPS)
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │  Backend Services (Render / Railway / AWS ECS / Fly.io)
  │  - Node.js (v20) Express API Runtime
  │  - Reverse Proxy / Load Balancer SSL Termination
  │  - Helmet Security Headers & Strict CORS
  │  - In-flight Request Tracking (X-Request-Id)
  │  - Process Management & Graceful Shutdown (SIGTERM)
  └────────────────────────┬───────────────────────────────┘
                           │ Authenticated & Encrypted TLS (Mongoose)
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │  Database Cluster (MongoDB Atlas Production M10+)
  │  - 3-Node Replica Set (Primary + 2 Secondaries)
  │  - Automatic Failover & High Availability
  │  - Multi-Document ACID Transactions
  │  - Continuous Backups & Point-In-Time Restore (PITR)
  └────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables & Secret Separation

### Frontend Environment (`.env.production`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Required production API base URL | `https://api.eduflow.app/api` or `/api` (when reverse-proxied) |

> [!CAUTION]
> Never prefix private server secrets with `VITE_`. Any `VITE_` variable is baked into client JavaScript bundles.

When the Vercel frontend and backend use different site domains, refresh cookies require `SameSite=None; Secure` and credentialed requests. Set `CLIENT_URL` to the exact HTTPS frontend origin(s); the backend rejects auth requests from other browser origins. For stronger browser cookie compatibility, use custom frontend and API domains under the same registrable domain.

### Backend Production Environment (`backend/.env`)
| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Runtime mode (`production`) | `production` |
| `PORT` | Yes | Service binding port | `5000` (or assigned by platform) |
| `MONGODB_URI` | Yes | MongoDB Atlas replica set URI with TLS | `mongodb+srv://user:pass@cluster.mongodb.net/eduflow?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Yes | Database name | `eduflow` |
| `MONGODB_MAX_POOL_SIZE` | No | Connection pool size | `50` |
| `JWT_ACCESS_SECRET` | Yes | 32+ char high-entropy secret | Generated via `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | 32+ char high-entropy secret | Generated via `openssl rand -hex 32` |
| `CLIENT_URL` | Yes | Comma-separated allowed frontend origins | `https://eduflow.app,https://www.eduflow.app` |
| `AI_API_KEY` | Yes | OpenAI API Key (server-side only) | `sk-...` |
| `AI_MODEL` | No | AI model name (default: `gpt-4o-mini`) | `gpt-4o-mini` |

---

## 3. Production Server Lifecycle & Safety

1. **Startup Validation**: At boot, [`backend/src/config/envValidation.js`](file:///c:/Users/muhsi/Desktop/EduFlow/backend/src/config/envValidation.js) verifies that all required secrets and connection strings exist. If any critical configuration is missing, the process immediately aborts with exit code 1.
2. **Database Reconnection**: The database driver utilizes connection pooling (`maxPoolSize: 50`) and exponential backoff retry logic (up to 5 retries).
3. **No Automatic Destructive Operations**: `npm start` strictly launches `node src/server.js`. It **never** automatically runs seed scripts or destructive migrations.
4. **Graceful Shutdown**:
   - Listens for `SIGTERM` and `SIGINT` (sent by container orchestrators during deployments or scaling events).
   - Stops accepting new incoming HTTP connections (`server.close()`).
   - Waits for active in-flight requests to complete.
   - Closes the MongoDB connection safely.
   - 10-second watchdog timer prevents hanging processes.

---

## 4. Health Checks & Monitoring

The backend exposes two specialized operational health endpoints:

### 1. Application Liveness Probe: `GET /health` (and `GET /api/health`)
- **Status Code**: `200 OK` (or `503 Service Unavailable` if database is degraded)
- **Response**:
```json
{
  "success": true,
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-03T09:30:00.000Z"
}
```

### 2. Database Readiness Probe: `GET /health/db` (and `GET /api/health/db`)
- **Status Code**: `200 OK` (when connected)
- **Response**:
```json
{
  "success": true,
  "status": "healthy",
  "readyState": 1,
  "host": "cluster0.mongodb.net",
  "name": "eduflow"
}
```
*Note: Credentials, passwords, connection URIs, and internal stack traces are strictly omitted from health outputs.*

---

## 5. CI/CD Pipeline (GitHub Actions)

Workflow file: [`.github/workflows/ci.yml`](file:///c:/Users/muhsi/Desktop/EduFlow/.github/workflows/ci.yml)

### Stages Executed on Every Push and Pull Request:
1. **Checkout & Setup**: Clones repository and configures Node.js 20.
2. **Service Container**: Provisions a live MongoDB 7.0 test container.
3. **Dependency Installation**: Deterministic clean install using `npm ci`.
4. **Environment Audit**: Validates template synchronization (`.env.example`).
5. **Automated Testing Suite**:
   - Standard API Integration Tests (`tests/api.test.js`)
   - Adversarial Security & Penetration Tests (`tests/adversarial.test.js`)
   - Production Database & Architecture Tests (`tests/productionArchitecture.test.js`)
6. **Frontend Compilation**: Builds production Vite client bundle (`npm run build`).
7. **Dependency Security Scan**: Audits npm dependencies for known high-severity vulnerabilities.

---

## 6. Continuous Deployment (CD) Strategy

```text
[ Feature Branch ] ──Pull Request──► [ GitHub Actions CI ] ──Merged──► [ Production Deploy ]
                                           │                                  │
                                     (Must Pass All 88                  1. Deploy Backend (Zero-Downtime)
                                      Automated Tests)                  2. Run Health Check (/health)
                                                                        3. Deploy Frontend CDN
```

### Hosting Options:
- **PaaS (Recommended)**: Render, Railway, or Fly.io with Docker or native Node runtime.
- **Container / Kubernetes**: Deploy using `backend/Dockerfile`.

---

## 7. Database Safety, Migrations & Seeds

### Running Non-Destructive Migrations
To backfill user profiles or provision missing wallets on an existing database:
```bash
cd backend
npm run migrate
```
- Migration script is strictly non-destructive and idempotent.
- Never runs `dropDatabase()` or `deleteMany()`.

### Running Production Development Seed
To populate fresh test environments with realistic sample data:
```bash
cd backend
npm run seed:production
```

---

## 8. Backup & Disaster Recovery Procedure

> [!NOTE]
> Backup configuration in MongoDB Atlas Web Console is `UNVERIFIED — requires MongoDB Atlas dashboard verification`. Ensure Continuous Cloud Backups with Point-In-Time Restore (PITR) are enabled in Atlas.

### Disaster Recovery Runbook:
1. **Step 1: Declare Incident & Stop Corrupting Traffic**
   - If a data corruption or security event occurs, immediately toggle maintenance mode or scale backend instances to 0.
2. **Step 2: Identify Recovery Target Time**
   - Identify the exact timestamp prior to the incident using the structured log timestamps and audit logs.
3. **Step 3: Point-in-Time Restore in MongoDB Atlas**
   - Navigate to MongoDB Atlas $\to$ Database $\to$ Clusters $\to$ Backup $\to$ Point-in-Time Restore.
   - Select the target timestamp and restore to a **new cluster** (never overwrite the existing live cluster directly).
4. **Step 4: Verify Data Integrity**
   - Run verification queries on the restored cluster checking critical collections (`users`, `wallets`, `enrollments`, `progress`).
5. **Step 5: Switch Backend Connection URI**
   - Update `MONGODB_URI` in the backend platform settings to point to the restored cluster.
6. **Step 6: Resume Service & Smoke Test**
   - Start the backend and execute the post-deployment smoke tests.

---

## 9. Deployment Rollback Strategy

If a deployment fails health checks or exhibits regressions:
1. **Frontend Rollback**:
   - In Vercel / Cloudflare Pages, select the previous instantaneous deployment and click **Promote to Production**. Instantaneous rollback (< 10 seconds).
2. **Backend Rollback**:
   - In Render / Railway / Docker registry, redeploy the previous container image tag or Git commit hash.
3. **Database Compatibility**:
   - All Mongoose schema updates must follow the **Expand and Contract** pattern (additive changes first, deprecations after old backend instances drain).

---

## 10. Post-Deployment Smoke Test Protocol

Run these verification steps immediately following any production release:

1. **Health Verification**:
   ```bash
   curl -I https://api.eduflow.app/health
   # Expected: HTTP/1.1 200 OK
   ```
2. **Authentication Flow**:
   - Register a new test student account.
   - Verify `httpOnly` cookie is issued.
   - Call `/api/auth/refresh` and confirm token rotation.
   - Call `/api/auth/logout` and confirm cookie invalidation.
3. **Learning Flow**:
   - Fetch public courses (`GET /api/courses`).
   - Enroll in a course and update lesson progress.
   - Fetch a quiz and verify `correctAnswer` is not leaked.
   - Submit quiz attempt and verify server-evaluated score.
4. **Economy Flow**:
   - Check wallet balance (`GET /api/wallet`).
   - Purchase an item from the shop (`POST /api/shop/purchase`).
   - Verify inventory update and wallet transaction logging.
5. **Admin RBAC Verification**:
   - Verify student account cannot post to `/api/courses` (`403 Forbidden`).
