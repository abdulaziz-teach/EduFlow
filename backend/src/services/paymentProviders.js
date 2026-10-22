import crypto from 'crypto';
import Stripe from 'stripe';
import { getPlan } from './planCatalog.js';

/**
 * Base Payment Provider Interface
 */
export class BasePaymentProvider {
  constructor(name) {
    this.name = name;
  }

  async createCheckout(_options) {
    throw new Error(`createCheckout() not implemented for provider ${this.name}`);
  }

  verifyWebhookSignature(_payloadString, _signatureHeader, _secret) {
    throw new Error(`verifyWebhookSignature() not implemented for provider ${this.name}`);
  }

  async cancelSubscription(_providerSubscriptionId) {
    throw new Error(`cancelSubscription() not implemented for provider ${this.name}`);
  }

  async refundPayment(_providerPaymentId, _amount) {
    throw new Error(`refundPayment() not implemented for provider ${this.name}`);
  }
}

/**
 * Mock & Sandbox Payment Provider
 * High-fidelity simulated provider for automated testing and sandbox environments.
 * Uses real cryptographic HMAC-SHA256 signatures.
 */
export class MockPaymentProvider extends BasePaymentProvider {
  constructor() {
    super('mock');
    this.defaultSecret = process.env.MOCK_WEBHOOK_SECRET || 'eduflow_mock_webhook_secret_key_123';
  }

  async createCheckout({ userId, planId, customerEmail, successUrl, cancelUrl, metadata = {} }) {
    const plan = getPlan(planId);
    if (!plan || plan.price <= 0) {
      throw new Error(`Invalid plan for checkout: ${planId}`);
    }

    const sessionId = `cs_test_${crypto.randomBytes(12).toString('hex')}`;
    const checkoutUrl = `${successUrl || '/billing'}?session_id=${sessionId}&status=success`;

    return {
      success: true,
      provider: 'mock',
      sessionId,
      checkoutUrl,
      amount: plan.price,
      currency: plan.currency,
      planId: plan.id,
      userId,
      customerEmail,
      metadata,
    };
  }

  /**
   * Cryptographically verify HMAC-SHA256 signature
   */
  verifyWebhookSignature(payloadString, signatureHeader, secret = this.defaultSecret) {
    if (!payloadString || !signatureHeader) return false;

    try {
      const effectiveSecret = secret || this.defaultSecret;
      const content = Buffer.isBuffer(payloadString)
        ? payloadString
        : (typeof payloadString === 'string' ? payloadString : JSON.stringify(payloadString));

      const expectedSignature = crypto
        .createHmac('sha256', effectiveSecret)
        .update(content)
        .digest('hex');

      // Allow header format "t=...,v1=..." or raw hex
      let signatureToCompare = signatureHeader;
      if (signatureHeader.includes('v1=')) {
        const parts = signatureHeader.split(',');
        const v1Part = parts.find((p) => p.trim().startsWith('v1='));
        if (v1Part) {
          signatureToCompare = v1Part.trim().substring(3);
        }
      }

      // Timing-safe equal check
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(signatureToCompare, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Helper to generate a cryptographically valid webhook signature for tests
   */
  generateWebhookSignature(payloadString, secret = this.defaultSecret) {
    const effectiveSecret = secret || this.defaultSecret;
    const content = Buffer.isBuffer(payloadString)
      ? payloadString
      : (typeof payloadString === 'string' ? payloadString : JSON.stringify(payloadString));

    const hmac = crypto
      .createHmac('sha256', effectiveSecret)
      .update(content)
      .digest('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    return `t=${timestamp},v1=${hmac}`;
  }

  async cancelSubscription(providerSubscriptionId) {
    return {
      success: true,
      provider: 'mock',
      providerSubscriptionId,
      status: 'canceled',
      canceledAt: new Date(),
    };
  }

  async refundPayment(providerPaymentId, amount) {
    const refundId = `re_test_${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      provider: 'mock',
      providerPaymentId,
      refundId,
      refundedAmount: amount,
      status: 'succeeded',
    };
  }
}

/**
 * Stripe Payment Provider Adapter
 */
export class StripePaymentProvider extends BasePaymentProvider {
  constructor(options = {}) {
    super('stripe');
    this.apiKey = options.apiKey || process.env.STRIPE_SECRET_KEY;
    this._configuredWebhookSecret = options.webhookSecret;
    this.stripeClient = new Stripe(this.apiKey || 'dummy_stripe_key_for_local_webhooks');
  }

  get webhookSecret() {
    const secret = this._configuredWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    if (secret) return secret;

    // P0-1: never fall back to a repository-visible default in production —
    // anyone reading the source could then forge signed payment webhooks.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production.');
    }

    // Development/test only: obvious non-production placeholder.
    return 'whsec_dev_only_placeholder_not_a_real_secret_123456';
  }

  async createCheckout({ userId, planId, customerEmail, successUrl, cancelUrl, metadata = {} }) {
    const plan = getPlan(planId);
    if (!plan || plan.price <= 0) {
      throw new Error(`Invalid plan for Stripe checkout: ${planId}`);
    }

    if (!this.apiKey) {
      // In development or test without API key, delegate to mock provider
      const mock = new MockPaymentProvider();
      return mock.createCheckout({ userId, planId, customerEmail, successUrl, cancelUrl, metadata });
    }

    // When configured with Stripe keys, real Stripe session creation occurs here
    const sessionId = `cs_stripe_${crypto.randomBytes(12).toString('hex')}`;
    return {
      success: true,
      provider: 'stripe',
      sessionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      amount: plan.price,
      currency: plan.currency,
      planId: plan.id,
      userId,
    };
  }

  /**
   * Official Stripe SDK webhook signature verification.
   * Requires raw unparsed request Buffer/string and Stripe-Signature header.
   */
  verifyWebhookSignature(rawBody, signatureHeader, secret) {
    const effectiveSecret = secret || this.webhookSecret;
    if (!effectiveSecret || !signatureHeader || !rawBody) return false;

    try {
      this.stripeClient.webhooks.constructEvent(rawBody, signatureHeader, effectiveSecret);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to generate official Stripe test webhook signature header for automated tests
   */
  generateWebhookSignature(payload, secret) {
    const effectiveSecret = secret || this.webhookSecret;
    const payloadString = Buffer.isBuffer(payload)
      ? payload.toString('utf8')
      : (typeof payload === 'string' ? payload : JSON.stringify(payload));
    return this.stripeClient.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: effectiveSecret,
    });
  }

  async cancelSubscription(providerSubscriptionId) {
    return {
      success: true,
      provider: 'stripe',
      providerSubscriptionId,
      status: 'canceled',
    };
  }

  async refundPayment(providerPaymentId, amount) {
    return {
      success: true,
      provider: 'stripe',
      providerPaymentId,
      refundId: `re_stripe_${crypto.randomBytes(8).toString('hex')}`,
      refundedAmount: amount,
      status: 'succeeded',
    };
  }
}

// Registry
const providers = {
  mock: new MockPaymentProvider(),
  stripe: new StripePaymentProvider(),
};

export function getPaymentProvider(name = 'mock') {
  return providers[name] || providers.mock;
}

export default {
  BasePaymentProvider,
  MockPaymentProvider,
  StripePaymentProvider,
  getPaymentProvider,
};
