import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

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
import { StripePaymentProvider, MockPaymentProvider } from '../src/services/paymentProviders.js';
import { getUserPlan } from '../src/services/entitlementService.js';

let server;
let baseUrl;

// Test secret specifically for testing signature logic
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_automated_testing_1234567890abcdef';
process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

async function rawPostRequest(endpoint, rawBodyString, headers = {}) {
  const url = baseUrl + endpoint;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: rawBodyString,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
}

describe('🔒 Stripe Webhook Raw Body & Official Signature Security Tests', () => {
  let testUser;
  let stripeProvider;
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

    stripeProvider = new StripePaymentProvider({ webhookSecret: TEST_WEBHOOK_SECRET });
    mockProvider = new MockPaymentProvider();

    // Clean up test data
    await User.deleteMany({ email: /@stripehooktest\.internal$/ });
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await WebhookEvent.deleteMany({});
    await Wallet.deleteMany({});

    testUser = await User.create({
      name: 'Stripe Security User',
      displayName: 'Stripe Sec User',
      email: 'stripeuser@stripehooktest.internal',
      password: 'Password123!',
      role: 'user',
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@stripehooktest\.internal$/ });
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await WebhookEvent.deleteMany({});
    await Wallet.deleteMany({});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  it('1. Verifies valid signature on compact JSON body (HTTP 200)', async () => {
    const eventId = `evt_test_compact_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment.succeeded',
      data: {
        object: {
          id: `pay_compact_${Date.now()}`,
          subscription: `sub_compact_${Date.now()}`,
          amount: 1200,
          currency: 'USD',
          metadata: {
            userId: testUser._id.toString(),
            planId: 'pro_monthly',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signatureHeader = stripeProvider.generateWebhookSignature(rawBody, TEST_WEBHOOK_SECRET);

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.handled, true);

    const sub = await Subscription.findOne({ userId: testUser._id });
    assert.ok(sub);
    assert.equal(sub.status, 'active');
    assert.equal(sub.planId, 'pro_monthly');
  });

  it('2. Verifies valid signature on pretty-printed JSON body with extra whitespace (proving rawBody preservation)', async () => {
    const eventId = `evt_test_pretty_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment.succeeded',
      data: {
        object: {
          id: `pay_pretty_${Date.now()}`,
          subscription: `sub_pretty_${Date.now()}`,
          amount: 9900,
          currency: 'USD',
          metadata: {
            userId: testUser._id.toString(),
            planId: 'pro_annual',
          },
        },
      },
    };

    // Formatted with 4 spaces indentation and trailing newlines
    const rawBody = JSON.stringify(payload, null, 4) + '\n\n';
    const signatureHeader = stripeProvider.generateWebhookSignature(rawBody, TEST_WEBHOOK_SECRET);

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.handled, true);
  });

  it('3. Rejects request when whitespace is modified after signing (HTTP 401)', async () => {
    const eventId = `evt_test_tamper_ws_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment.succeeded',
      data: { object: { id: 'pay_123', amount: 1000 } },
    };

    const originalBody = JSON.stringify(payload);
    const signatureHeader = stripeProvider.generateWebhookSignature(originalBody, TEST_WEBHOOK_SECRET);

    // Tamper by adding extra whitespace to the body
    const tamperedBody = originalBody + '   ';

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', tamperedBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('4. Rejects request when JSON key order is modified after signing (HTTP 401)', async () => {
    const originalBody = '{"id":"evt_order_1","type":"payment.succeeded","amount":100}';
    const signatureHeader = stripeProvider.generateWebhookSignature(originalBody, TEST_WEBHOOK_SECRET);

    // Reorder keys
    const reorderedBody = '{"type":"payment.succeeded","id":"evt_order_1","amount":100}';

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', reorderedBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('5. Rejects request when payload content is modified (tampered amount) (HTTP 401)', async () => {
    const payload = {
      id: `evt_tamper_amt_${Date.now()}`,
      type: 'payment.succeeded',
      data: { object: { id: 'pay_123', amount: 1000 } },
    };

    const originalBody = JSON.stringify(payload);
    const signatureHeader = stripeProvider.generateWebhookSignature(originalBody, TEST_WEBHOOK_SECRET);

    const tamperedPayload = { ...payload, data: { object: { id: 'pay_123', amount: 1 } } };
    const tamperedBody = JSON.stringify(tamperedPayload);

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', tamperedBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('6. Rejects request when signature value is invalid / forged (HTTP 401)', async () => {
    const rawBody = JSON.stringify({ id: 'evt_invalid_sig', type: 'payment.succeeded' });
    const forgedHeader = `t=${Math.floor(Date.now() / 1000)},v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`;

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': forgedHeader,
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('7. Rejects request when Stripe-Signature header is missing (HTTP 401)', async () => {
    const rawBody = JSON.stringify({ id: 'evt_missing_hdr', type: 'payment.succeeded' });

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {});

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('8. Rejects request when signature header format is invalid (missing t= or v1=) (HTTP 401)', async () => {
    const rawBody = JSON.stringify({ id: 'evt_bad_fmt', type: 'payment.succeeded' });

    // Missing t=
    const res1 = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': 'v1=0123456789abcdef',
    });
    assert.equal(res1.status, 401);
    assert.equal(res1.data.error, 'INVALID_SIGNATURE');

    // Missing v1=
    const res2 = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': `t=${Math.floor(Date.now() / 1000)}`,
    });
    assert.equal(res2.status, 401);
    assert.equal(res2.data.error, 'INVALID_SIGNATURE');
  });

  it('9. Rejects expired timestamp (> 300 seconds old) (HTTP 401)', async () => {
    const rawBody = JSON.stringify({ id: 'evt_expired', type: 'payment.succeeded' });
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago

    const stripe = new Stripe('sk_test_mock_stripe_key_12345');
    const signatureHeader = stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: TEST_WEBHOOK_SECRET,
      timestamp: oldTimestamp,
    });

    const res = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': signatureHeader,
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'INVALID_SIGNATURE');
  });

  it('10. Enforces replay protection / idempotency on retransmitted Stripe webhook', async () => {
    const eventId = `evt_stripe_idempotent_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment.succeeded',
      data: {
        object: {
          id: `pay_idemp_${Date.now()}`,
          subscription: `sub_idemp_${Date.now()}`,
          amount: 1200,
          currency: 'USD',
          metadata: {
            userId: testUser._id.toString(),
            planId: 'pro_monthly',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signatureHeader = stripeProvider.generateWebhookSignature(rawBody, TEST_WEBHOOK_SECRET);

    // First attempt
    const res1 = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': signatureHeader,
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.data.handled, true);

    // Replay same payload and same signature
    const res2 = await rawPostRequest('/api/billing/webhook?provider=stripe', rawBody, {
      'stripe-signature': signatureHeader,
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.data.duplicate, true);

    // Verify only 1 WebhookEvent record exists for this eventId
    const count = await WebhookEvent.countDocuments({ eventId });
    assert.equal(count, 1);
  });

  it('11. Preserves MockPaymentProvider functionality without regressions', async () => {
    const eventId = `evt_mock_regress_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment.succeeded',
      data: {
        userId: testUser._id.toString(),
        planId: 'pro_monthly',
        amount: 1200,
        currency: 'USD',
        paymentId: `pay_mock_${Date.now()}`,
        subscriptionId: `sub_mock_${Date.now()}`,
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = mockProvider.generateWebhookSignature(rawBody);

    const res = await rawPostRequest('/api/billing/webhook?provider=mock', rawBody, {
      'x-signature': signature,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.handled, true);
  });
});
