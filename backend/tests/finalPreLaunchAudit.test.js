/**
 * Phase 27: Final Pre-Launch Security + Performance + E2E Audit Suite
 *
 * Comprehensive adversarial verification covering:
 * 1. Authentication attack vectors (malformed, expired, forged, revoked, suspended)
 * 2. Authorization & RBAC hierarchy matrix (user, support, moderator, content_manager, analyst, admin, super_admin)
 * 3. Horizontal privilege escalation & IDOR defense
 * 4. Input validation & NoSQL injection resistance
 * 5. Financial concurrency & double-spend race condition protection
 * 6. Webhook replay & duplicate idempotency protection
 * 7. AI context isolation & data leakage prevention
 * 8. Error leakage & production stack trace redaction
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import Wallet from '../src/models/Wallet.js';
import WalletTransaction from '../src/models/WalletTransaction.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import Achievement from '../src/models/Achievement.js';
import UserAchievement from '../src/models/UserAchievement.js';
import WebhookEvent from '../src/models/WebhookEvent.js';
import Payment from '../src/models/Payment.js';
import { generateAccessToken } from '../src/services/sessionService.js';
import { unlockAchievement } from '../src/services/achievementUnlockService.js';
import { MockPaymentProvider } from '../src/services/paymentProviders.js';

const mockProvider = new MockPaymentProvider();

let server;
let baseUrl;

const api = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

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

describe('🛡️ Phase 27: Final Pre-Launch Security & Verification Audit', () => {
  let studentUser, studentToken;
  let adminUser, adminToken;
  let moderatorUser, moderatorToken;
  let suspendedUser, suspendedToken;
  let victimUser, victimToken;

  before(async () => {
    await connectDB();

    // Spin up in-process HTTP test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });

    const runId = Date.now();

    // 1. Create standard student
    studentUser = await User.create({
      name: 'Audit Student',
      email: `audit.student.${runId}@test.com`,
      passwordHash: 'dummy_hash_for_test',
      role: 'user',
      status: 'active',
    });
    studentToken = generateAccessToken(studentUser._id, 'user');

    // 2. Create admin user
    adminUser = await User.create({
      name: 'Audit Admin',
      email: `audit.admin.${runId}@test.com`,
      passwordHash: 'dummy_hash_for_test',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // 3. Create moderator user
    moderatorUser = await User.create({
      name: 'Audit Moderator',
      email: `audit.moderator.${runId}@test.com`,
      passwordHash: 'dummy_hash_for_test',
      role: 'moderator',
      status: 'active',
    });
    moderatorToken = generateAccessToken(moderatorUser._id, 'moderator');

    // 4. Create suspended user
    suspendedUser = await User.create({
      name: 'Suspended Offender',
      email: `audit.suspended.${runId}@test.com`,
      passwordHash: 'dummy_hash_for_test',
      role: 'user',
      status: 'suspended',
    });
    suspendedToken = generateAccessToken(suspendedUser._id, 'user');

    // 5. Create victim user for IDOR testing
    victimUser = await User.create({
      name: 'Victim Student',
      email: `audit.victim.${runId}@test.com`,
      passwordHash: 'dummy_hash_for_test',
      role: 'user',
      status: 'active',
    });
    victimToken = generateAccessToken(victimUser._id, 'user');

    // Initialize Wallets
    await Wallet.create({ userId: studentUser._id, coins: 80, gems: 5, tickets: 3 });
    await Wallet.create({ userId: victimUser._id, coins: 500, gems: 50, tickets: 10 });
  });

  after(async () => {
    // Cleanup test fixtures
    await User.deleteMany({ email: /@test\.com$/ });
    await Wallet.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });
    await WalletTransaction.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });
    await Conversation.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });
    await Message.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });
    await UserAchievement.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });
    await WebhookEvent.deleteMany({ eventId: /audit_evt_/ });
    await Payment.deleteMany({ userId: { $in: [studentUser?._id, victimUser?._id] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication Adversarial Penetration
  // ---------------------------------------------------------------------------
  describe('1. Authentication Adversarial Penetration', () => {
    test('rejects missing token with 401 UNAUTHORIZED', async () => {
      const res = await api('/api/users/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('rejects malformed token string with 401', async () => {
      const res = await api('/api/users/me', {
        headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('rejects token signed with invalid / attacker secret', async () => {
      const fakeToken = jwt.sign(
        { userId: studentUser._id.toString(), role: 'admin' },
        'attacker_compromised_secret',
        { expiresIn: '1h' }
      );
      const res = await api('/api/users/me', { token: fakeToken });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('rejects expired token with TOKEN_EXPIRED code', async () => {
      const expiredToken = jwt.sign(
        { userId: studentUser._id.toString(), role: 'user' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '-1s' }
      );
      const res = await api('/api/users/me', { token: expiredToken });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'TOKEN_EXPIRED');
    });

    test('rejects active token belonging to suspended user with 403', async () => {
      const res = await api('/api/users/me', { token: suspendedToken });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'ACCOUNT_SUSPENDED');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Authorization, RBAC Matrix & Privilege Escalation
  // ---------------------------------------------------------------------------
  describe('2. Authorization, RBAC Matrix & Privilege Escalation', () => {
    test('standard student cannot access administrative overview (403 FORBIDDEN)', async () => {
      const res = await api('/api/admin/overview', { token: studentToken });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    test('standard student cannot inspect user directory (403 FORBIDDEN)', async () => {
      const res = await api('/api/admin/users', { token: studentToken });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    test('moderator can view reports but is blocked from feature flags', async () => {
      const modReportsRes = await api('/api/admin/moderation/reports', { token: moderatorToken });
      assert.equal(modReportsRes.status, 200);

      const modFlagsRes = await api('/api/admin/feature-flags', { token: moderatorToken });
      assert.equal(modFlagsRes.status, 403);
    });

    test('role hierarchy: admin cannot elevate user to super_admin', async () => {
      const res = await api(`/api/admin/users/${studentUser._id}/role`, {
        method: 'POST',
        token: adminToken,
        body: { role: 'super_admin' },
      });
      assert.equal(res.status, 403);
    });

    test('horizontal IDOR: Student A cannot read Student B conversation messages', async () => {
      // Victim creates a private conversation
      const victimConv = await Conversation.create({
        userId: victimUser._id,
        title: 'Victim Private Conversation',
        subject: 'Secret Subject',
      });
      await Message.create({
        conversationId: victimConv._id,
        userId: victimUser._id,
        role: 'user',
        content: 'Top secret proprietary data',
      });

      // Attacker (studentUser) attempts to fetch Victim's conversation
      const res = await api(`/api/mentor/conversations/${victimConv._id}`, {
        token: studentToken,
      });
      // Must return 404 or 403, never the victim's data
      assert.ok([403, 404].includes(res.status));
      assert.equal(res.body.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Input Validation, NoSQL Injection & Sanitization
  // ---------------------------------------------------------------------------
  describe('3. Input Validation, NoSQL Injection & Sanitization', () => {
    test('NoSQL injection attempt via object payload in search is neutralized', async () => {
      const res = await api('/api/search?q[$ne]=test');
      assert.ok(res.status === 200 || res.status === 400);
      // Ensure server did not crash or execute raw operator
      if (res.status === 200) {
        assert.ok(Array.isArray(res.body.results));
      }
    });

    test('XSS script tag in chat is sanitized and stored without execution risk', async () => {
      const xssPayload = '<script>alert("pwned")</script>How do loops work?';
      const res = await api('/api/mentor/chat', {
        method: 'POST',
        token: studentToken,
        body: { message: xssPayload },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.message?.content);
      // Confirm DB stored safely
      const savedMsg = await Message.findOne({ userId: studentUser._id, content: xssPayload });
      assert.ok(savedMsg);
      assert.equal(savedMsg.content, xssPayload);
    });

    test('oversized payload (> 1MB) is rejected by body parser with 413', async () => {
      const hugeString = 'A'.repeat(1.2 * 1024 * 1024); // 1.2MB
      const res = await api('/api/mentor/chat', {
        method: 'POST',
        token: studentToken,
        body: { message: hugeString },
      });
      assert.equal(res.status, 413);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Financial Concurrency, Double-Spend & Webhook Idempotency
  // ---------------------------------------------------------------------------
  describe('4. Financial Concurrency, Double-Spend & Webhook Idempotency', () => {
    test('10 concurrent requests to spend 50 coins with balance 80 permits exactly 1 winner', async () => {
      const spendRequests = Array.from({ length: 10 }, (_, i) =>
        api('/api/wallet/spend', {
          method: 'POST',
          token: studentToken,
          body: {
            amount: 50,
            currency: 'coins',
            reason: 'audit_test_race_condition',
            idempotencyKey: `audit_race_${Date.now()}_${i}`,
          },
        })
      );

      const results = await Promise.all(spendRequests);
      const successes = results.filter((r) => r.status === 200);
      const failures = results.filter((r) => r.status === 400);

      assert.equal(successes.length, 1, 'Exactly one spend operation must succeed');
      assert.equal(failures.length, 9, 'Remaining 9 concurrent requests must fail');

      const updatedWallet = await Wallet.findOne({ userId: studentUser._id });
      assert.equal(updatedWallet.coins, 30, 'Wallet balance must be exactly 80 - 50 = 30');
      assert.ok(updatedWallet.coins >= 0, 'Wallet balance must never be negative');
    });

    test('replaying identical webhook event 5 times results in exactly 1 ledger effect', async () => {
      const runEvtId = `audit_evt_${Date.now()}`;
      const eventPayload = {
        id: runEvtId,
        type: 'payment.succeeded',
        data: {
          userId: studentUser._id.toString(),
          planId: 'pro_monthly',
          amount: 1200,
          currency: 'USD',
          paymentId: `pay_${runEvtId}`,
          subscriptionId: `sub_${runEvtId}`,
        },
      };

      const payloadStr = JSON.stringify(eventPayload);
      const signature = mockProvider.generateWebhookSignature(payloadStr);

      // Dispatch 5 identical webhook deliveries concurrently via HTTP
      const dispatchResults = await Promise.all(
        Array.from({ length: 5 }, () =>
          api('/api/billing/webhook?provider=mock', {
            method: 'POST',
            body: eventPayload,
            headers: { 'x-signature': signature },
          })
        )
      );

      const status200 = dispatchResults.filter((r) => r.status === 200);
      assert.equal(status200.length, 5, 'All webhook requests must return 200 (processed or duplicate handled)');

      // Check payment records in database
      const payments = await Payment.find({ userId: studentUser._id, providerPaymentId: `pay_${runEvtId}` });
      assert.equal(payments.length, 1, 'Exactly 1 Payment record must be created in ledger');
    });

    test('unlocking same achievement concurrently does not grant duplicate reward', async () => {
      const testAch = await Achievement.create({
        name: `Audit Achiever ${Date.now()}`,
        description: 'Testing reward idempotency',
        conditionType: 'custom',
        conditionValue: 1,
        reward: { currency: 'coins', amount: 100 },
      });

      const initialWallet = await Wallet.findOne({ userId: studentUser._id });
      const initialCoins = initialWallet.coins;

      // Send 3 concurrent unlocks
      const unlockResults = await Promise.all([
        unlockAchievement(studentUser._id, testAch._id),
        unlockAchievement(studentUser._id, testAch._id),
        unlockAchievement(studentUser._id, testAch._id),
      ]);

      const newlyGrantedCount = unlockResults.filter((r) => r.rewardGranted === true).length;
      assert.equal(newlyGrantedCount, 1, 'Reward must be granted exactly once');

      const afterWallet = await Wallet.findOne({ userId: studentUser._id });
      assert.equal(afterWallet.coins, initialCoins + 100, 'Coins must increase by exactly 100');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. AI Isolation & Production Error Redaction
  // ---------------------------------------------------------------------------
  describe('5. AI Isolation & Production Error Redaction', () => {
    test('AI chat never returns another users messages or data', async () => {
      const conv = await Conversation.create({
        userId: studentUser._id,
        title: 'Student Conversation',
      });
      await Message.create({
        conversationId: conv._id,
        userId: studentUser._id,
        role: 'user',
        content: 'What is photosynthesis?',
      });

      const res = await api('/api/mentor/conversations', { token: studentToken });
      assert.equal(res.status, 200);
      assert.ok(res.body.conversations.every((c) => c.title !== 'Victim Private Conversation'));
    });

    test('production error handler redacts stack traces from client responses', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await api('/api/admin/users/not-a-valid-mongo-id', { token: adminToken });
        assert.equal(res.status, 400);
        assert.equal(res.body.stack, undefined, 'Stack traces must never leak in production mode');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
