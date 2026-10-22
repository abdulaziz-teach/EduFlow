# Phase 28: Production Go-Live Backup & PITR Operational Verification

**Target Cluster:** MongoDB Atlas Production / Enterprise Replica Set  
**Date:** September 6, 2026  
**Auditor:** Senior Production Engineer  
**Classification:** Database Backup, Restore, and Disaster Recovery Runbook  

---

## 1. Executive Summary

This document establishes the verified backup baseline, disaster recovery targets, and exact step-by-step procedures for operators to verify continuous backups, point-in-time restore (PITR), and restore validation before live production launch.

### Atlas Cloud Backup Status:
`NOT VERIFIED FROM REPOSITORY — MANUAL ATLAS VERIFICATION REQUIRED`

While local and simulated backup and restore scripts have been verified with 100% data integrity within the repository, cloud-managed continuous oplog archiving in MongoDB Atlas requires operator sign-off in the Atlas Cloud Console.

---

## 2. Recovery Objectives (RPO & RTO)

| Metric | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 1 minute** (Maximum permissible data loss window) | MongoDB Atlas Continuous Cloud Backup with real-time oplog archiving |
| **Recovery Time Objective (RTO)** | **< 30 minutes** (Maximum permissible restoration downtime) | Automated cluster snapshot restore + health-gated verification runner |
| **Snapshot Retention** | **7 days continuous PITR**, 30 days daily rolling snapshots | MongoDB Atlas Cloud Backup retention policy |
| **Sandbox Restore Validation** | **100% record match** across all collections | Verified via `backend/src/scripts/backupDrill.js` |

---

## 3. Verified Repository Drill Evidence

An automated backup and restore drill was executed against the primary database using `src/scripts/backupDrill.js`:

```text
====================================================
🚀 EduFlow — Automated Backup & Restore Drill Runner
====================================================

1. Connecting to primary MongoDB...
   ✔ Connected successfully.

2. Performing Snapshot Extract & Integrity Check:
   ✔ Extracted 16 records from [User]
   ✔ Extracted 7 records from [Course]
   ✔ Extracted 25 records from [Wallet]
   ✔ Extracted 0 records from [Payment]
   ✔ Extracted 1 records from [Subscription]

3. Performing Restore Simulation to Verification Sandbox:
   ✔ Restored 16/16 records into [_verify_restore_user]
   ✔ Restored 7/7 records into [_verify_restore_course]
   ✔ Restored 25/25 records into [_verify_restore_wallet]
   ✔ Restored 0/0 records into [_verify_restore_payment]
   ✔ Restored 1/1 records into [_verify_restore_subscription]

4. Verification Summary:
   ✔ All 5 critical collections extracted and restored.
   ✔ Zero data corruption, schema mismatches, or missing keys.
   ✔ Temporary sandbox dropped cleanly.
   ✔ Total Drill Duration: 246ms

====================================================
✅ BACKUP & RESTORE DRILL: PASSED (VERIFIED READY)
====================================================
```

---

## 4. Operator Step-by-Step Verification Procedure

Follow these exact steps in the [MongoDB Atlas Console](https://cloud.mongodb.com/) prior to live traffic:

### Step 1: Verify Continuous Backups
1. Log into the **MongoDB Atlas Console**.
2. Select the **EduFlow Production Project** and click on the primary cluster name.
3. Click the **Backup** tab in the cluster navigation bar.
4. Verify that **Continuous Cloud Backups** is enabled (status indicator is green / active).
5. Verify the backup region matches or replicates the primary cluster region.

### Step 2: Verify Point-In-Time Restore (PITR)
1. In the **Backup** tab, click **Restore or Download**.
2. Confirm the **Point in Time** restore option is selectable.
3. Verify that the continuous restore window spans at least **7 days** (168 hours).
4. Note the earliest and latest available restore timestamps.

### Step 3: Execute a Staged Snapshot Restore
1. In the **Backup** tab, locate the most recent automated snapshot.
2. Click **Restore** -> Select **Restore to a New Cluster** or **Restore to Staging Sandbox**.
3. Set the target cluster name to `eduflow-restore-drill-test`.
4. Initiate the restore and monitor completion time (verify RTO < 30 minutes).

### Step 4: Validate Restored Data Integrity
1. Once the restored test cluster is active, temporarily point your environment connection to it:
   ```bash
   MONGODB_URI="mongodb+srv://restore-admin:***@eduflow-restore-drill-test.mongodb.net/eduflow"
   ```
2. Run the automated data integrity and backup drill against the restored target:
   ```powershell
   npm --prefix backend run drill:backup
   ```
3. Run the database verification test suite against the restored target:
   ```powershell
   npm --prefix backend run test:db
   ```
4. Verify that user records, course lessons, wallet balances, and subscriptions match the primary database with zero record loss.
5. Terminate and delete the temporary restore test cluster `eduflow-restore-drill-test`.

### Step 5: Document Sign-Off in Go-Live Checklist
Record the verification timestamp, operator name, and snapshot ID in `docs/GO-LIVE-CHECKLIST.md`.
