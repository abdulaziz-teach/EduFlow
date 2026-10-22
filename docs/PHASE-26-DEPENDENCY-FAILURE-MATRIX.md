# Phase 26: Dependency Failure Matrix & Graceful Degradation Policy

## 1. Overview
This matrix specifies the criticality, failure behavior, timeouts, retries, and fallback mechanisms for all internal and external dependencies in EduFlow.

---

## 2. Dependency Failure Matrix

| Dependency | Purpose | Criticality | Timeout | Retry Policy | Circuit Breaker | User Impact During Failure | Graceful Fallback Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | Primary persistence store (Users, Courses, Payments, Sessions) | **CRITICAL** | 5,000ms connect / 45,000ms query | Auto-reconnect via driver backoff | N/A (Core DB) | Cannot perform stateful logins or mutations | Read-only pages served from CDN/cache; `/health/ready` signals 503 to traffic routers |
| **OpenAI API** | AI Mentor, Study Plan generation, assessment creation | **MEDIUM / HIGH** | 15,000ms | 2 retries (transient 5xx only) | **YES** (`openai-service`, 3 errs, 25s cooldown) | AI Mentor unavailable; general course learning continues unaffected | User received friendly notification: "The mentor is temporarily unavailable" with Socratic guidance tips |
| **Payment Gateway (Stripe)** | Subscriptions, checkout sessions, invoice processing | **HIGH** | 10,000ms | Idempotent webhook retry | Provider-level backoff | Cannot purchase new subscriptions or top up balance | Existing subscriptions protected under 3-day grace period (`gracePeriodEnd`) |
| **Email Service (SMTP / Resend)** | Password reset, verification, digest emails | **MEDIUM** | 8,000ms | 3 retries with exponential backoff | Handled via scheduler retry | Delay in email delivery | Background job records `deferred`; core web app authentication remains unaffected |
| **In-Memory Cache (Search / Flags)** | Fast query responses for course suggestions and flags | **LOW** | Instant | Fallback to direct DB query | N/A | Negligible (~5ms latency increase) | Direct MongoDB query executed on cache miss |
| **Background Scheduler** | Streak checks, notification delivery, billing sweeps | **MEDIUM** | 45,000ms lease | Auto-expires via `JobLock` lease | Lock lease renewal | Scheduled alerts delayed until next sweep cycle | Immediate retry on next interval (60s); core APIs unaffected |
| **Frontend Network Connection** | Client-to-server API communication | **HIGH** | 15,000ms client timeout | 2 retries for GET requests | Client retry with backoff | Offline banner or retry indicator | User notified with clear connection status; no endless spinning indicators |
