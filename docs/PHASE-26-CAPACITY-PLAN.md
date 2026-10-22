# Phase 26: Capacity Planning & Resource Model

## 1. Overview
This capacity plan models the resource requirements for EduFlow to scale horizontally from single-node deployment to high-traffic cluster production.

---

## 2. Resource & Workload Projections

| Scale Metric | Baseline (Single Instance) | Scale Target (3 Replicas) | High-Traffic Surge (10 Replicas) |
| :--- | :--- | :--- | :--- |
| **Concurrent Active Users** | 500 – 1,000 | 3,000 – 5,000 | 15,000 – 25,000 |
| **Requests Per Second (RPS)** | 100 – 250 RPS | 750 – 1,500 RPS | 3,000 – 5,000 RPS |
| **Database Pool Connections** | 10 – 30 connections | 30 – 90 connections | 100 – 300 connections |
| **MongoDB Replica Set RAM** | 2 GB RAM | 8 GB RAM | 16 – 32 GB RAM |
| **Node.js Memory Footprint** | ~180 MB per process | ~540 MB total | ~1.8 GB total |
| **AI Mentor Daily Queries** | 5,000 queries/day | 35,000 queries/day | 150,000 queries/day |
| **Database Storage Growth** | ~100 MB/month | ~800 MB/month | ~3 GB/month (stabilized by TTL) |

---

## 3. Storage Growth Stabilization via TTL Policy

Without automated purging, telemetry collections (`SearchEvent` and `AIUsageLog`) would grow indefinitely. With the implemented TTL indexes:
- `SearchEvent` documents older than 90 days are automatically evicted.
- `AIUsageLog` documents older than 180 days are automatically evicted.
- Total telemetry database footprint is capped at a rolling equilibrium of approximately 2–4 GB under moderate-to-high scale.

---

## 4. Horizontal Scaling Architecture

```text
               Internet Traffic
                      │
            ┌─────────▼─────────┐
            │   Load Balancer   │ (Round-Robin / Least-Connections)
            └─────────┬─────────┘
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
│ Backend 1 │   │ Backend 2 │   │ Backend 3 │ (Stateless Node.js processes)
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │               │               │
      └───────────────┼───────────────┘
                      │
            ┌─────────▼─────────┐
            │   MongoDB Cluster │
            │   (Replica Set)   │
            │                   │
            │ - RateLimitBucket │ (TTL Auto-Purge)
            │ - JobLock         │ (Distributed Lease)
            │ - Business Models │
            └───────────────────┘
```
