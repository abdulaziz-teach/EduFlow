# EduFlow — Disaster Recovery & Incident Response Runbook

## 1. Incident Severity Definitions & Escalation Matrix

| Severity Level | Definition | Response SLA | Primary Lead | Notification Channel |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical Outage)** | Complete service unavailability, database down, data corruption, or payment failure affecting > 5% of users. | Immediate (< 15 mins) | Lead Engineer & Admin Lead | PagerDuty, Phone, Urgent Slack |
| **SEV-2 (Major Impairment)** | Significant feature failure without full outage (e.g. AI Mentor down, search down, background notifications failing). | < 30 mins | Backend On-Call | Emergency Slack Channel |
| **SEV-3 (Minor Degradation)** | Non-critical bug or localized performance degradation (e.g. slight latency increase in leaderboard). | < 4 hours | Feature Engineer | Standard Engineering Channel |
| **SEV-4 (Low / Cosmetic)** | Minor administrative display glitch or cosmetic typo. | Next business day | Assigned Developer | Issue Tracker |

---

## 2. Disaster Recovery Scenarios (A through L)

### Scenario A: MongoDB Unavailable / Cluster Down
- **Detection**: `/health/ready` returns 503; request logs show `MongoServerSelectionError`.
- **Immediate Response**: Node backend automatically logs failures and fast-fails dependent endpoints. Liveness probe (`/health/live`) stays 200, preventing container restart thrashing.
- **Mitigation**: Failover to MongoDB secondary replica; if Atlas/host failure, verify network connectivity and connection string credentials.
- **Recovery**: Driver automatically reconnects on host recovery without requiring Node process restart.

### Scenario B: Database Data Corruption
- **Detection**: Application crashes with schema validation errors, or missing key collections.
- **Immediate Response**: Enable `emergency_maintenance_mode` feature flag to reject mutation requests.
- **Mitigation**: Isolate corrupted replica node. Restore the latest uncorrupted snapshot into a clean instance using `backupDrill.js` verification procedure.
- **Verification**: Re-run `node src/scripts/backupDrill.js`. Disable maintenance mode once integrity passes.

### Scenario C: Backend Instance Crash
- **Detection**: Container exit code != 0 or orchestrator health probe timeout.
- **Immediate Response**: Container orchestrator (Docker/Kubernetes/Railway) spawns a replacement container automatically.
- **Mitigation**: Distributed job locks held by the crashed instance auto-expire via TTL lease (`leaseExpiresAt`), allowing healthy instances to resume sweeps without deadlocks.

### Scenario D: All Backend Instances Restart Simultaneously
- **Detection**: Brief traffic drop (< 5 seconds); load balancer reports 502.
- **Immediate Response**: Instances execute startup flow: load environment, connect to MongoDB pool, start HTTP listener only after database connectivity is verified.
- **Mitigation**: Database connection pool enforces `maxPoolSize: 50` preventing connection storms on cluster reboot.

### Scenario E: Queue / Worker Failure
- **Detection**: Notification delays or accumulated pending records in `Notification` collection.
- **Immediate Response**: Inspect `notificationSchedulerService` logs.
- **Mitigation**: Run manual sweep trigger `runAllSweeps()`. If persistent, release stale job lock (`JobLock.deleteOne({ _id: 'sweep:notifications' })`).

### Scenario F: External AI Provider Outage (OpenAI 5xx / Timeouts)
- **Detection**: `openai-service` circuit breaker state trips to `OPEN`.
- **Immediate Response**: Circuit breaker fast-fails requests with 503 and friendly message ("The mentor is temporarily unavailable"), avoiding 20-second connection pile-ups.
- **Mitigation**: Activate `emergency_pause_ai` flag or switch to fallback mock mode in `.env` if outage exceeds 1 hour.
- **Recovery**: Circuit breaker automatically tests upstream via `HALF_OPEN` probes when reset cooldown (25s) expires.

### Scenario G: Payment Provider Outage (Stripe Down)
- **Detection**: Checkout session creation failure or webhook timeouts.
- **Immediate Response**: Inform users attempting checkout that billing service is temporarily unavailable.
- **Mitigation**: Existing subscriptions remain fully active during their 3-day grace period (`gracePeriodEnd`). No user access is abruptly revoked during temporary payment gateway downtime.
- **Recovery**: When Stripe recovers, missed webhook events are automatically replayed and idempotently deduplicated via `WebhookEvent`.

### Scenario H: Notification Provider Outage (Email/Push Down)
- **Detection**: Email/Push delivery failure logs.
- **Immediate Response**: Notification scheduler catches errors without throwing fatal exceptions.
- **Mitigation**: Scheduled notifications remain marked as `deferred` or `pending` with `scheduledAt` timestamp, and will be retried in the next batch sweep.

### Scenario I: Search Service / Index Degradation
- **Detection**: Slow search query logs or search failure spikes.
- **Immediate Response**: Search service falls back gracefully to core MongoDB text/regex matching.
- **Mitigation**: Invalidate and reset search cache via `searchCache.clear()`.

### Scenario J: Bad Deployment / Regression Release
- **Detection**: Surge in 5xx errors or test suite failure immediately post-deploy.
- **Immediate Response**: Execute one-click container rollback to previous immutable Docker image tag.
- **Mitigation**: Database migrations are strictly additive (Expand-Contract model), ensuring previous code version remains 100% compatible with current database schema.

### Scenario K: Secret / Configuration Failure
- **Detection**: `validateEnv()` in `server.js` throws during startup.
- **Immediate Response**: Process halts immediately before binding HTTP ports, preventing half-configured execution.
- **Mitigation**: Review `.env` against `backend/.env.example` and supply missing keys.

### Scenario L: Unexpected Traffic Spike (Slashdot / Viral Load)
- **Detection**: High CPU/Memory utilization and increased latency.
- **Immediate Response**:
  1. Horizontal container autoscale adds backend replicas.
  2. Distributed rate limiter bounds incoming request frequency per IP/User.
  3. Leaderboard and public course catalog serve from fast in-memory/lean caches.
  4. Non-essential background sweeps can be temporarily paused via admin flag.
