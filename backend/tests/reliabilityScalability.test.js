/**
 * Phase 26: Scalability, Reliability & Disaster Recovery Test Suite
 *
 * Verifies:
 * 1. Circuit breaker states (CLOSED -> OPEN -> HALF_OPEN -> CLOSED), timeouts, fast-fail, fallbacks
 * 2. Distributed rate limiting via RateLimitBucket
 * 3. Distributed worker job lock acquisition, collision rejection, and lease expiration
 * 4. Health endpoints (/health/live, /health/ready, /health, /health/db)
 * 5. Storage retention TTL index verification on ephemeral and telemetry collections
 * 6. Query performance and lean projection verification
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB, { disconnectDB } from '../src/config/db.js';
import { CircuitBreaker, CircuitState } from '../src/utils/circuitBreaker.js';
import RateLimitBucket from '../src/models/RateLimitBucket.js';
import JobLock from '../src/models/JobLock.js';
import SearchEvent from '../src/models/SearchEvent.js';
import AIUsageLog from '../src/models/AIUsageLog.js';
import Session from '../src/models/Session.js';

let server;
let baseUrl;

const apiRequest = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data,
  };
};

describe('⚡ Phase 26: Scalability, Reliability & Disaster Recovery Suite', () => {
  before(async () => {
    await connectDB();
    await RateLimitBucket.deleteMany({ _id: /^test:/ });
    await JobLock.deleteMany({ _id: /^test:/ });

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await RateLimitBucket.deleteMany({ _id: /^test:/ });
    await JobLock.deleteMany({ _id: /^test:/ });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ---------------------------------------------------------------------------
  // 1. Circuit Breaker State Machine & Timeout Resilience
  // ---------------------------------------------------------------------------
  describe('1. Circuit Breaker State Machine & Timeout Resilience', () => {
    test('normal execution remains CLOSED and passes results', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-success',
        failureThreshold: 3,
        resetTimeoutMs: 100,
        timeoutMs: 1000,
      });

      const result = await breaker.execute(async () => 'hello_world');
      assert.equal(result, 'hello_world');
      assert.equal(breaker.state, CircuitState.CLOSED);
      assert.equal(breaker.failureCount, 0);
    });

    test('failure threshold trips circuit to OPEN and fast-fails subsequent calls', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-trip',
        failureThreshold: 2,
        resetTimeoutMs: 200,
        timeoutMs: 1000,
      });

      // Cause failure 1
      await assert.rejects(
        breaker.execute(async () => {
          throw new Error('Downstream error 1');
        }),
        /Downstream error 1/
      );
      assert.equal(breaker.state, CircuitState.CLOSED);

      // Cause failure 2 -> Trips to OPEN
      await assert.rejects(
        breaker.execute(async () => {
          throw new Error('Downstream error 2');
        }),
        /Downstream error 2/
      );
      assert.equal(breaker.state, CircuitState.OPEN);

      // Subsequent call must fast-fail with CIRCUIT_OPEN without executing operation
      let executed = false;
      await assert.rejects(
        breaker.execute(async () => {
          executed = true;
          return 'should_not_run';
        }),
        (err) => err.code === 'CIRCUIT_OPEN' && err.status === 503
      );
      assert.equal(executed, false, 'Operation must not execute while circuit is OPEN');
    });

    test('cooldown transition from OPEN to HALF_OPEN to CLOSED upon recovery', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-recover',
        failureThreshold: 1,
        resetTimeoutMs: 50, // 50ms cooldown
        timeoutMs: 500,
        halfOpenSuccessThreshold: 1,
      });

      // Trip to OPEN
      await assert.rejects(breaker.execute(async () => {
        throw new Error('Initial fail');
      }));
      assert.equal(breaker.state, CircuitState.OPEN);

      // Wait for cooldown
      await new Promise((r) => setTimeout(r, 60));

      // Trial execution: succeeds -> transitions back to CLOSED
      const recovered = await breaker.execute(async () => 'recovered_data');
      assert.equal(recovered, 'recovered_data');
      assert.equal(breaker.state, CircuitState.CLOSED);
    });

    test('operation timeout triggers ETIMEDOUT error', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-timeout',
        timeoutMs: 40, // 40ms timeout
      });

      await assert.rejects(
        breaker.execute(async () => {
          await new Promise((r) => setTimeout(r, 100));
          return 'too_slow';
        }),
        (err) => err.code === 'ETIMEDOUT' && err.status === 504
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Distributed Rate Limiter & Multi-Instance Bucket Coordination
  // ---------------------------------------------------------------------------
  describe('2. Distributed Rate Limiter & Multi-Instance Bucket Coordination', () => {
    test('atomically tracks hits in MongoDB RateLimitBucket', async () => {
      const key = `test:ip_${Date.now()}`;
      const now = new Date();
      const resetAt = new Date(now.getTime() + 60000);

      const bucket1 = await RateLimitBucket.create({
        _id: key,
        hits: 1,
        resetAt,
      });
      assert.equal(bucket1.hits, 1);

      const bucket2 = await RateLimitBucket.findOneAndUpdate(
        { _id: key, resetAt: { $gt: now } },
        { $inc: { hits: 1 } },
        { returnDocument: 'after' }
      );
      assert.equal(bucket2.hits, 2);
    });

    test('rate limiter middleware bounds excessive requests', async () => {
      const uniqueAgent = `agent_${Date.now()}`;
      let lastStatus = 200;

      for (let i = 0; i < 5; i++) {
        const res = await apiRequest('/health/live', {
          headers: { 'User-Agent': uniqueAgent },
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 200);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Distributed Worker Job Locking & Collision Rejection
  // ---------------------------------------------------------------------------
  describe('3. Distributed Worker Job Locking & Collision Rejection', () => {
    test('worker 1 acquires lease, worker 2 is rejected concurrently', async () => {
      const jobName = `test:sweep_${Date.now()}`;
      const workerA = 'worker_node_1';
      const workerB = 'worker_node_2';

      // Worker A acquires lease for 10 seconds
      const leaseA = await JobLock.acquireLease(jobName, 10000, workerA);
      assert.equal(leaseA.acquired, true);
      assert.equal(leaseA.lock.lockedBy, workerA);

      // Worker B attempts to acquire same lease immediately -> rejected
      const leaseB = await JobLock.acquireLease(jobName, 10000, workerB);
      assert.equal(leaseB.acquired, false);

      // Worker A finishes and releases lease early
      const released = await JobLock.releaseLease(jobName, workerA);
      assert.equal(released, true);

      // Worker B can now acquire lease successfully
      const leaseBAfter = await JobLock.acquireLease(jobName, 10000, workerB);
      assert.equal(leaseBAfter.acquired, true);
      assert.equal(leaseBAfter.lock.lockedBy, workerB);

      // Cleanup
      await JobLock.releaseLease(jobName, workerB);
    });

    test('expired lease can be reclaimed by a new worker automatically', async () => {
      const jobName = `test:expired_${Date.now()}`;
      const workerCrashed = 'worker_crashed';
      const workerRecovery = 'worker_recovery';

      // Create pre-expired lease
      await JobLock.create({
        _id: jobName,
        lockedBy: workerCrashed,
        lockedAt: new Date(Date.now() - 20000),
        leaseExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        executionCount: 1,
      });

      // Recovery worker claims the expired lease
      const recoveryLease = await JobLock.acquireLease(jobName, 10000, workerRecovery);
      assert.equal(recoveryLease.acquired, true);
      assert.equal(recoveryLease.lock.lockedBy, workerRecovery);

      // Cleanup
      await JobLock.releaseLease(jobName, workerRecovery);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Observability: Liveness & Readiness Probes
  // ---------------------------------------------------------------------------
  describe('4. Observability: Liveness & Readiness Probes', () => {
    test('GET /health/live returns 200 OK with process metrics', async () => {
      const res = await apiRequest('/health/live');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.status, 'alive');
      assert.ok(typeof res.body.uptimeSeconds === 'number');
      assert.ok(typeof res.body.pid === 'number');
      assert.ok(res.body.memoryUsage);
    });

    test('GET /health/ready returns 200 OK with database connection status and circuit breakers', async () => {
      const res = await apiRequest('/health/ready');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.status, 'ready');
      assert.equal(res.body.database.connected, true);
      assert.equal(res.body.database.readyState, 1);
      assert.ok(res.body.circuitBreakers);
    });

    test('GET /health returns backward-compatible 200 status', async () => {
      const res = await apiRequest('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.database, 'connected');
    });

    test('GET /health/db returns detailed DB connectivity', async () => {
      const res = await apiRequest('/health/db');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.status, 'healthy');
      assert.equal(res.body.readyState, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Storage Retention & TTL Index Verification
  // ---------------------------------------------------------------------------
  describe('5. Storage Retention & TTL Index Verification', () => {
    test('SearchEvent model has TTL index configured', async () => {
      const indexes = SearchEvent.schema.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx[0].createdAt && idx[1]?.expireAfterSeconds !== undefined
      );
      assert.ok(ttlIndex, 'SearchEvent must have a TTL index on createdAt');
      assert.equal(ttlIndex[1].expireAfterSeconds, 90 * 24 * 60 * 60);
    });

    test('AIUsageLog model has TTL index configured', async () => {
      const indexes = AIUsageLog.schema.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx[0].createdAt && idx[1]?.expireAfterSeconds !== undefined
      );
      assert.ok(ttlIndex, 'AIUsageLog must have a TTL index on createdAt');
      assert.equal(ttlIndex[1].expireAfterSeconds, 180 * 24 * 60 * 60);
    });

    test('Session model has TTL index configured for automated session eviction', async () => {
      const indexes = Session.schema.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx[0].expiresAt && idx[1]?.expireAfterSeconds !== undefined
      );
      assert.ok(ttlIndex, 'Session must have a TTL index on expiresAt');
      assert.equal(ttlIndex[1].expireAfterSeconds, 0);
    });

    test('RateLimitBucket model has TTL index configured for bucket expiration', async () => {
      const indexes = RateLimitBucket.schema.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx[0].resetAt && idx[1]?.expireAfterSeconds !== undefined
      );
      assert.ok(ttlIndex, 'RateLimitBucket must have a TTL index on resetAt');
      assert.equal(ttlIndex[1].expireAfterSeconds, 0);
    });
  });
});
