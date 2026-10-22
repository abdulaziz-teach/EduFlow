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
import Subscription from '../src/models/Subscription.js';
import Payment from '../src/models/Payment.js';
import WebhookEvent from '../src/models/WebhookEvent.js';
import Wallet from '../src/models/Wallet.js';
import WalletTransaction from '../src/models/WalletTransaction.js';
import AIUsageLog from '../src/models/AIUsageLog.js';

import {
  PLANS,
  getPlan,
  getAllActivePlans,
  isPlanValid,
  getPlanEntitlements,
} from '../src/services/planCatalog.js';
import {
  getUserPlan,
  canUse,
  getEntitlements,
  grantSubscription,
  cancelSubscription,
  resumeSubscription,
  revokeSubscription,
  checkAIMessageQuota,
} from '../src/services/entitlementService.js';
import { MockPaymentProvider, getPaymentProvider } from '../src/services/paymentProviders.js';
import { processWebhook } from '../src/services/billingWebhookService.js';
import { generateAccessToken } from '../src/services/sessionService.js';

let server;
let baseUrl;

async function apiRequest(endpoint, options = {}) {
  const url = baseUrl + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
}

describe('💳 Phase 24: Billing, Subscriptions & Monetization Engine', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;
  let mockProvider;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    mockProvider = new MockPaymentProvider();

    // Cleanup existing test data
    await User.deleteMany({ email: /@billingtest\.internal$/ });
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await WebhookEvent.deleteMany({});
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await AIUsageLog.deleteMany({});

    // 1. Create Admin
    adminUser = await User.create({
      name: 'Billing Admin',
      displayName: 'Billing Admin',
      email: 'admin@billingtest.internal',
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // 2. Create Student
    studentUser = await User.create({
      name: 'Billing Student',
      displayName: 'Billing Student',
      email: 'student@billingtest.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
    });
    studentToken = generateAccessToken(studentUser._id, 'user');
  });

  after(async () => {
    await User.deleteMany({ email: /@billingtest\.internal$/ });
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await WebhookEvent.deleteMany({});
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await AIUsageLog.deleteMany({});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Plan Catalog & Pricing Integrity', () => {
    it('returns all active plans with server-enforced pricing', () => {
      const plans = getAllActivePlans();
      assert.equal(plans.length, 3);

      const free = getPlan('free');
      assert.equal(free.price, 0);
      assert.equal(free.currency, 'USD');

      const monthly = getPlan('pro_monthly');
      assert.equal(monthly.price, 1200); // $12.00
      assert.equal(monthly.interval, 'month');

      const annual = getPlan('pro_annual');
      assert.equal(annual.price, 9900); // $99.00
      assert.equal(annual.interval, 'year');
    });

    it('identifies invalid or tampered plan keys', () => {
      assert.equal(isPlanValid('free'), true);
      assert.equal(isPlanValid('pro_monthly'), true);
      assert.equal(isPlanValid('pro_annual'), true);
      assert.equal(isPlanValid('hacked_plan'), false);
      assert.equal(isPlanValid(null), false);
    });

    it('resolves correct feature entitlements per plan', () => {
      const freeEntitlements = getPlanEntitlements('free');
      assert.ok(freeEntitlements.includes('ai.mentor.basic'));
      assert.ok(!freeEntitlements.includes('ai.mentor.advanced'));

      const proEntitlements = getPlanEntitlements('pro_monthly');
      assert.ok(proEntitlements.includes('ai.mentor.advanced'));
      assert.ok(proEntitlements.includes('unlimited_ai_mentor'));
      assert.ok(proEntitlements.includes('priority_ai_inference'));
    });
  });

  describe('2. Entitlement Engine, Quotas & Grace Periods', () => {
    it('defaults new user to free plan with standard entitlements', async () => {
      const plan = await getUserPlan(studentUser._id);
      assert.equal(plan, 'free');

      const canBasic = await canUse(studentUser, 'basic_dashboard');
      assert.equal(canBasic, true);

      const canAdvanced = await canUse(studentUser, 'ai.mentor.advanced');
      assert.equal(canAdvanced, false);
    });

    it('admin bypasses all feature entitlement gates', async () => {
      const canAdv = await canUse(adminUser, 'ai.mentor.advanced');
      assert.equal(canAdv, true);

      const canPriority = await canUse(adminUser, 'priority_ai_inference');
      assert.equal(canPriority, true);
    });

    it('enforces daily AI Mentor message quota for free users', async () => {
      const quotaBefore = await checkAIMessageQuota(studentUser._id);
      assert.equal(quotaBefore.allowed, true);
      assert.equal(quotaBefore.limit, 15);
      assert.equal(quotaBefore.usedToday, 0);

      // Simulate 15 messages today
      for (let i = 0; i < 15; i++) {
        await AIUsageLog.create({
          userId: studentUser._id,
          action: 'chat',
          success: true,
        });
      }

      const quotaAfter = await checkAIMessageQuota(studentUser._id);
      assert.equal(quotaAfter.allowed, false);
      assert.equal(quotaAfter.remaining, 0);

      // Cleanup AI logs
      await AIUsageLog.deleteMany({ userId: studentUser._id });
    });

    it('handles 3-day grace period for past_due subscriptions', async () => {
      // Create a subscription with past_due status within 3-day grace period
      const sub = await Subscription.create({
        userId: studentUser._id,
        plan: 'pro_monthly',
        planId: 'pro_monthly',
        status: 'past_due',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        gracePeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days in future
      });

      const planInGrace = await getUserPlan(studentUser._id);
      assert.equal(planInGrace, 'pro_monthly');

      // Now set grace period to past
      sub.gracePeriodEnd = new Date(Date.now() - 3600000); // 1 hour ago
      await sub.save();

      const planExpired = await getUserPlan(studentUser._id);
      assert.equal(planExpired, 'free');

      // Cleanup
      await Subscription.deleteMany({ userId: studentUser._id });
    });

    it('downgrades to free once active subscription passes currentPeriodEnd', async () => {
      await Subscription.create({
        userId: studentUser._id,
        plan: 'pro_monthly',
        planId: 'pro_monthly',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 3600000), // expired 1 hour ago
      });

      const plan = await getUserPlan(studentUser._id);
      assert.equal(plan, 'free');

      await Subscription.deleteMany({ userId: studentUser._id });
    });
  });

  describe('3. Checkout & Payment Records', () => {
    it('creates checkout session with server-determined price', async () => {
      const res = await apiRequest('/api/billing/checkout', {
        method: 'POST',
        token: studentToken,
        body: {
          planId: 'pro_monthly',
          provider: 'mock',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.amount, 1200); // Exactly $12.00
      assert.equal(res.data.currency, 'USD');
      assert.ok(res.data.checkoutUrl);
      assert.ok(res.data.sessionId);

      // Verify pending Payment record
      const payment = await Payment.findOne({ providerPaymentId: res.data.sessionId });
      assert.ok(payment);
      assert.equal(payment.status, 'pending');
      assert.equal(payment.amount, 1200);
    });

    it('rejects checkout for free plan or invalid plan', async () => {
      const resFree = await apiRequest('/api/billing/checkout', {
        method: 'POST',
        token: studentToken,
        body: { planId: 'free' },
      });
      assert.equal(resFree.status, 400);

      const resInvalid = await apiRequest('/api/billing/checkout', {
        method: 'POST',
        token: studentToken,
        body: { planId: 'super_fake_plan' },
      });
      assert.equal(resInvalid.status, 400);
    });
  });

  describe('4. Webhook Security & Idempotency Pipeline', () => {
    it('rejects webhook with invalid cryptographic signature (401)', async () => {
      const payload = {
        id: 'evt_tampered_1',
        type: 'payment.succeeded',
        data: { userId: studentUser._id.toString(), planId: 'pro_monthly' },
      };

      const res = await apiRequest('/api/billing/webhook?provider=mock', {
        method: 'POST',
        body: payload,
        headers: {
          'x-signature': 't=123456,v1=bad_fake_hash_1234567890abcdef',
        },
      });

      assert.equal(res.status, 401);
      assert.equal(res.data.error, 'INVALID_SIGNATURE');
    });

    it('processes verified payment.succeeded webhook: grants entitlement and credits wallet rewards', async () => {
      const eventId = `evt_success_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'payment.succeeded',
        data: {
          userId: studentUser._id.toString(),
          planId: 'pro_monthly',
          amount: 1200,
          currency: 'USD',
          paymentId: `pay_${Date.now()}`,
          subscriptionId: `sub_${Date.now()}`,
        },
      };

      const payloadStr = JSON.stringify(payload);
      const signature = mockProvider.generateWebhookSignature(payloadStr);

      const res = await apiRequest('/api/billing/webhook?provider=mock', {
        method: 'POST',
        body: payload,
        headers: {
          'x-signature': signature,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.handled, true);

      // Verify active subscription granted
      const sub = await Subscription.findOne({ userId: studentUser._id });
      assert.ok(sub);
      assert.equal(sub.status, 'active');
      assert.equal(sub.planId, 'pro_monthly');

      // Verify entitlement service acknowledges pro tier
      const activePlan = await getUserPlan(studentUser._id);
      assert.equal(activePlan, 'pro_monthly');

      const canAdvanced = await canUse(studentUser, 'ai.mentor.advanced');
      assert.equal(canAdvanced, true);

      // Verify bonus rewards credited to wallet
      const wallet = await Wallet.findOne({ userId: studentUser._id });
      assert.ok(wallet);
      assert.ok(wallet.coins >= 600); // 100 default + 500 bonus
      assert.ok(wallet.gems >= 20); // 0 default + 20 bonus
    });

    it('guarantees idempotency: duplicate webhook does NOT duplicate wallet rewards or payments', async () => {
      const eventId = `evt_dedup_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'payment.succeeded',
        data: {
          userId: studentUser._id.toString(),
          planId: 'pro_monthly',
          amount: 1200,
          currency: 'USD',
          paymentId: `pay_dedup_${Date.now()}`,
          subscriptionId: `sub_dedup_${Date.now()}`,
        },
      };

      const payloadStr = JSON.stringify(payload);
      const signature = mockProvider.generateWebhookSignature(payloadStr);

      // First delivery
      const res1 = await apiRequest('/api/billing/webhook?provider=mock', {
        method: 'POST',
        body: payload,
        headers: { 'x-signature': signature },
      });
      assert.equal(res1.status, 200);

      const walletAfterFirst = await Wallet.findOne({ userId: studentUser._id });
      const coinsFirst = walletAfterFirst.coins;

      // Second duplicate delivery
      const res2 = await apiRequest('/api/billing/webhook?provider=mock', {
        method: 'POST',
        body: payload,
        headers: { 'x-signature': signature },
      });
      assert.equal(res2.status, 200);
      assert.equal(res2.data.duplicate, true);

      const walletAfterSecond = await Wallet.findOne({ userId: studentUser._id });
      assert.equal(walletAfterSecond.coins, coinsFirst); // Coins must NOT change
    });
  });

  describe('5. Subscription Lifecycle: Cancel, Resume & Status Transitions', () => {
    it('POST /api/billing/cancel schedules cancellation at period end', async () => {
      const res = await apiRequest('/api/billing/cancel', {
        method: 'POST',
        token: studentToken,
        body: { atPeriodEnd: true },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.subscription.cancelAtPeriodEnd, true);

      // User still retains access until period end
      const plan = await getUserPlan(studentUser._id);
      assert.equal(plan, 'pro_monthly');
    });

    it('POST /api/billing/resume resumes scheduled cancellation', async () => {
      const res = await apiRequest('/api/billing/resume', {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.subscription.cancelAtPeriodEnd, false);
    });

    it('handles payment.failed webhook: sets past_due with grace period', async () => {
      const eventId = `evt_failed_${Date.now()}`;
      const payload = {
        id: eventId,
        type: 'payment.failed',
        data: {
          userId: studentUser._id.toString(),
          planId: 'pro_monthly',
        },
      };

      const signature = mockProvider.generateWebhookSignature(JSON.stringify(payload));
      const res = await apiRequest('/api/billing/webhook?provider=mock', {
        method: 'POST',
        body: payload,
        headers: { 'x-signature': signature },
      });

      assert.equal(res.status, 200);

      const sub = await Subscription.findOne({ userId: studentUser._id });
      assert.equal(sub.status, 'past_due');
      assert.ok(sub.gracePeriodEnd);
    });
  });

  describe('6. Admin RBAC, History, Refunds & Reconciliation', () => {
    it('GET /api/billing/history returns user payment records', async () => {
      const res = await apiRequest('/api/billing/history', {
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.payments));
      assert.ok(res.data.total >= 1);
    });

    it('Admin RBAC: non-admin cannot access admin billing endpoints (returns 403)', async () => {
      const resStats = await apiRequest('/api/billing/admin/stats', {
        token: studentToken,
      });
      assert.equal(resStats.status, 403);

      const resSubs = await apiRequest('/api/billing/admin/subscriptions', {
        token: studentToken,
      });
      assert.equal(resSubs.status, 403);

      const resRefund = await apiRequest('/api/billing/admin/refund', {
        method: 'POST',
        token: studentToken,
        body: { paymentId: new mongoose.Types.ObjectId() },
      });
      assert.equal(resRefund.status, 403);
    });

    it('Admin can view revenue stats and subscribers overview', async () => {
      const res = await apiRequest('/api/billing/admin/stats', {
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(typeof res.data.stats.mrr === 'number');
      assert.ok(typeof res.data.stats.totalRevenue === 'number');
      assert.ok(res.data.stats.planBreakdown);
    });

    it('Admin can issue refund and revoke user entitlement', async () => {
      // Find a succeeded payment for student
      const payment = await Payment.findOne({
        userId: studentUser._id,
        status: 'succeeded',
      });
      assert.ok(payment);

      const res = await apiRequest('/api/billing/admin/refund', {
        method: 'POST',
        token: adminToken,
        body: {
          paymentId: payment._id,
          reason: 'customer_satisfaction',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.payment.status, 'refunded');

      // Verify entitlement revoked
      const plan = await getUserPlan(studentUser._id);
      assert.equal(plan, 'free');
    });

    it('Admin reconciliation endpoint identifies and reconciles expired subscriptions', async () => {
      // Create an expired active subscription
      await Subscription.create({
        userId: new mongoose.Types.ObjectId(),
        plan: 'pro_monthly',
        planId: 'pro_monthly',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 3600000), // 1 hr ago
      });

      const res = await apiRequest('/api/billing/admin/reconcile', {
        method: 'POST',
        token: adminToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.reconciledCount >= 1);
    });
  });
});
