# Phase 28: Production Rollback Runbook

**Application:** EduFlow Production Platform  
**Target Version:** `v1.0.0-GA`  
**Previous Stable Reference:** `v0.9.8-RC` (Pre-Release Baseline)  
**Date:** September 6, 2026  
**Auditor:** Senior Production Engineer  
**Classification:** Disaster Mitigation & Rollback Procedures  

---

## 1. Executive Summary & Rollback Philosophy

This runbook establishes deterministic, data-safe rollback procedures for EduFlow.

### Guiding Principles:
1. **Data Integrity First**: Never perform destructive rollbacks on the database (no `drop()`, `DROP TABLE`, or bulk record deletion).
2. **Decoupled Rollbacks**: Frontend, backend container images, feature flags, and database schema can be rolled back independently without cascading downtime.
3. **Additive Schema Principle (Expand and Contract)**: Database migrations are purely additive; rolling back application code to a prior commit remains compatible with the database schema.

---

## 2. Rollback Triggers & Severity Thresholds

A rollback must be initiated immediately if any of the following triggers occur post-deployment:

| Metric / Trigger | Threshold | Evaluation Window | Immediate Action |
| :--- | :--- | :--- | :--- |
| **HTTP 5xx Error Rate** | > 1.0% of total requests | Sustained for 3 consecutive minutes | Initiate backend container rollback |
| **API Latency (p95)** | > 1,000ms | Sustained for 5 consecutive minutes | Inspect DB slow queries; rollback if code-induced |
| **Authentication Failures** | > 5% login rejections for valid users | 2 minutes | Rollback JWT / session code |
| **Database Transaction Errors**| Repeated `TRANSACTION_REPLICA_SET_REQUIRED` | Instant | Verify MongoDB connection string topology |
| **Double-Spend / Balance Drift**| Any negative or duplicated wallet balance | Instant | Enable `maintenance_mode=true` feature flag |

---

## 3. Subsystem Rollback Procedures

### 3.1. Frontend Rollback (Edge CDN / Vercel / Cloudflare Pages)
- **Time to Rollback (RTO)**: < 60 seconds.
- **Data Risk**: Zero risk (stateless static assets).
- **Execution Steps**:
  1. Open the CDN / hosting dashboard (e.g. Vercel / Cloudflare / Netlify).
  2. Locate the deployment history.
  3. Select the prior deployment tag (`v0.9.8-RC` / previous deployment hash).
  4. Click **Instant Rollback** or **Promote to Production**.
  5. Issue a global cache purge for edge CDN caches:
     ```bash
     # Example via CLI if configured
     vercel rollback [deployment-id]
     ```
  6. Verify the frontend in a fresh browser session.

### 3.2. Backend Application Rollback (API Containers)
- **Time to Rollback (RTO)**: < 120 seconds.
- **Data Risk**: Minimal; existing active requests drain gracefully.
- **Execution Steps**:
  1. If running Kubernetes:
     ```bash
     kubectl rollout undo deployment/eduflow-backend -n production
     kubectl rollout status deployment/eduflow-backend -n production
     ```
  2. If using Docker container tags:
     - Pull and deploy the previous immutable Docker tag:
       ```bash
       docker pull registry.eduflow.app/backend:v0.9.8-RC
       docker-compose up -d --no-deps backend
       ```
  3. Verify container health:
     ```bash
     curl -f http://localhost:5000/health/ready
     ```
  4. Traffic will automatically shift once readiness probes return HTTP 200.

### 3.3. Database Rollback Strategy (Safe & Non-Destructive)
- **Guiding Rule**: Never revert migrations by deleting data. EduFlow migrations are backward-compatible.
- **Execution Steps**:
  1. If an index causes severe write contention:
     - Drop the specific problematic index without dropping collections:
       ```javascript
       // Example in mongosh:
       db.auditlogs.dropIndex("problematic_index_name");
       ```
  2. If a catastrophic data corruption event occurred:
     - Activate `maintenance_mode=true` via admin feature flag or environment variable to prevent dirty writes.
     - Access MongoDB Atlas Console -> Continuous Cloud Backup.
     - Select **Point-In-Time Restore (PITR)** to the exact minute prior to the corrupting event.
     - Validate restored sandbox using `npm --prefix backend run drill:backup`.
     - Update the backend `MONGODB_URI` to point to the restored cluster and restart.

### 3.4. Feature Flag Instant Rollback
- Many critical systems can be toggled without redeploying code via the Admin Feature Flags API (`/api/admin/feature-flags`):
  - **Emergency Pause AI**: `POST /api/admin/emergency/emergency_pause_ai`
  - **Maintenance Mode**: Set `maintenance_mode=true` to reject mutating traffic with 503 while preserving read status.
  - **Disable New Billing Checkouts**: Set `billing_checkout_enabled=false`.

### 3.5. AI Provider Failure Handling & Rollback
- If OpenAI / upstream AI provider fails or experiences elevated 504 timeouts:
  1. The built-in circuit breaker (`aiCircuitBreaker`) automatically trips to `OPEN` after 3 consecutive failures.
  2. The system seamlessly routes student requests to pedagogical fallback templates without crashing.
  3. Operator action: Switch `AI_MODEL` or update `AI_API_KEY` in vault, then restart backend pods.

### 3.6. Payment Provider Failure Handling
- If Stripe / payment processor webhooks fail verification or provider goes offline:
  1. Webhook processing is idempotent: failed webhooks can be safely retried by the provider without duplicating entitlements.
  2. Subscriptions enter a 3-day grace period (`past_due`) before revoking student access, ensuring students are not cut off during payment processor downtime.
  3. Operator action: Verify HMAC webhook secret in environment matches payment dashboard.

---

## 4. Incident Escalation & Post-Rollback Review

1. **Immediate Escalation**: Notify the Incident Commander and Lead Engineer via internal Slack / PagerDuty channel `#incident-response`.
2. **Post-Rollback Smoke Verification**: Run full E2E verification to confirm stable state:
   ```powershell
   npm --prefix backend run test:smoke
   npm --prefix backend run test:e2e
   ```
3. **Blameless Post-Mortem**: Schedule review within 24 hours to document root cause, timeline, impact, and permanent preventive actions.
