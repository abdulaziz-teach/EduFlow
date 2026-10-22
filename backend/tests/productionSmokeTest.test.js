import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Quiz from '../src/models/Quiz.js';

let server;
let baseUrl;

async function api(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // Non-JSON response
  }

  return { status: res.status, headers: res.headers, body: data };
}

describe('🚀 Phase 28: Production Go-Live Smoke Test Suite', () => {
  before(async () => {
    await connectDB();
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
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Operational Health Probes', () => {
    it('GET /health returns 200 OK with database connected', async () => {
      const res = await api('/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.database, 'connected');
    });

    it('GET /health/live returns 200 OK with uptime and pid metrics', async () => {
      const res = await api('/health/live');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'alive');
      assert.strictEqual(typeof res.body.uptimeSeconds, 'number');
      assert.strictEqual(typeof res.body.pid, 'number');
    });

    it('GET /health/ready returns 200 OK with readyState 1 and circuit breaker telemetry', async () => {
      const res = await api('/health/ready');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'ready');
      assert.strictEqual(res.body.database.connected, true);
      assert.strictEqual(res.body.database.readyState, 1);
      assert.ok(res.body.circuitBreakers);
    });
  });

  describe('2. Security Boundary & Unauthenticated Access Smoke Checks', () => {
    it('GET /api/users/me rejects unauthenticated request with 401', async () => {
      const res = await api('/api/users/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('POST /api/courses rejects unauthenticated modification with 401', async () => {
      const res = await api('/api/courses', {
        method: 'POST',
        body: { title: 'Unauthorized Course' },
      });
      assert.strictEqual(res.status, 401);
    });

    it('GET /api/admin/users rejects unauthenticated access with 401', async () => {
      const res = await api('/api/admin/users');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('3. Public Educational Discovery & Content Safety', () => {
    it('GET /api/courses returns public course catalog with 200 OK', async () => {
      const res = await api('/api/courses');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.courses || res.body.data));
    });

    it('GET /api/search?q=programming returns 200 OK without crashing', async () => {
      const res = await api('/api/search?q=programming');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('GET /api/leaderboard rejects unauthenticated request with 401', async () => {
      const res = await api('/api/leaderboard');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('4. Error Sanitization & Production Response Safety', () => {
    it('404 for unknown endpoints returns clean JSON without stack traces', async () => {
      const res = await api('/api/non-existent-smoke-route');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.stack, undefined);
    });
  });
});
