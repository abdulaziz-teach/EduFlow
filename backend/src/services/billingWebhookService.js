import crypto from 'crypto';
import WebhookEvent from '../models/WebhookEvent.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import AuditLog from '../models/AuditLog.js';
import { getPaymentProvider } from './paymentProviders.js';
import { getPlan } from './planCatalog.js';
import { grantSubscription, revokeSubscription } from './entitlementService.js';
import { creditBalance } from './walletService.js';
import { dispatchNotification } from './notificationEngine.js';

/**
 * Billing Webhook Processing Pipeline
 * Handles cryptographic signature verification, idempotency guarding,
 * entitlement granting, wallet bonus credits, and notification alerts.
 */

export async function processWebhook({
  provider = 'mock',
  payload,
  rawBody,
  payloadString,
  signatureHeader,
  secret,
}) {
  const paymentProvider = getPaymentProvider(provider);
  const rawPayload = rawBody || payloadString || (typeof payload === 'string' ? payload : (provider === 'stripe' ? null : JSON.stringify(payload)));
  const rawString = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : (rawPayload || '');
  const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : (payload || (rawString ? JSON.parse(rawString) : {}));

  // 1. Cryptographic Signature Verification
  const isSignatureValid = paymentProvider.verifyWebhookSignature(rawPayload, signatureHeader, secret);
  if (!isSignatureValid) {
    const error = new Error('Invalid webhook signature');
    error.statusCode = 401;
    error.errorCode = 'INVALID_SIGNATURE';
    throw error;
  }

  const eventId = parsedPayload.id || parsedPayload.eventId;
  const eventType = parsedPayload.type || parsedPayload.eventType;

  if (!eventId || !eventType) {
    const error = new Error('Missing eventId or eventType in webhook payload');
    error.statusCode = 400;
    error.errorCode = 'MALFORMED_PAYLOAD';
    throw error;
  }

  // 2. Idempotency Check & Lock
  const payloadHash = crypto.createHash('sha256').update(rawString).digest('hex');

  let webhookRecord = await WebhookEvent.findOne({ provider, eventId });
  if (webhookRecord && webhookRecord.processed) {
    return {
      success: true,
      duplicate: true,
      eventId,
      eventType,
      message: 'Event already processed',
    };
  }

  if (!webhookRecord) {
    try {
      webhookRecord = await WebhookEvent.create({
        provider,
        eventId,
        eventType,
        payloadHash,
        payload: parsedPayload,
        processed: false,
      });
    } catch (err) {
      // Race condition safety
      if (err.code === 11000) {
        return {
          success: true,
          duplicate: true,
          eventId,
          eventType,
          message: 'Concurrent duplicate event suppressed',
        };
      }
      throw err;
    }
  }

  // 3. Event Processing Router
  const data = parsedPayload.data?.object || parsedPayload.data || parsedPayload;
  const userId = data.userId || data.metadata?.userId;
  const planId = data.planId || data.metadata?.planId;
  const providerPaymentId = data.paymentId || data.providerPaymentId || data.id || eventId;
  const providerSubscriptionId = data.subscriptionId || data.providerSubscriptionId || (typeof data.subscription === 'string' ? data.subscription : data.subscription?.id);

  switch (eventType) {
    case 'checkout.session.completed':
    case 'payment.succeeded':
    case 'invoice.payment_succeeded': {
      if (userId && planId) {
        const plan = getPlan(planId);

        // Update or create Payment record
        await Payment.findOneAndUpdate(
          {
            $or: [
              { providerPaymentId },
              { idempotencyKey: `payment_${provider}_${eventId}` },
            ],
          },
          {
            $set: {
              userId,
              provider,
              providerPaymentId,
              planId,
              amount: plan?.price ?? data.amount ?? 0,
              currency: plan?.currency ?? data.currency ?? 'USD',
              status: 'succeeded',
              type: 'subscription',
              idempotencyKey: `payment_${provider}_${eventId}`,
              metadata: data.metadata || {},
            },
          },
          { upsert: true, new: true }
        );

        // Grant or renew subscription entitlement
        await grantSubscription(userId, {
          planId,
          provider,
          providerSubscriptionId,
          providerCustomerId: data.customerId || null,
          currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
          metadata: data.metadata || {},
        });

        // Economy Integration: Credit bonus coins & gems from plan
        if (plan?.bonusRewards) {
          if (plan.bonusRewards.coins > 0) {
            await creditBalance({
              userId,
              currency: 'coins',
              amount: plan.bonusRewards.coins,
              type: 'reward',
              referenceType: 'subscription',
              referenceId: providerPaymentId,
              idempotencyKey: `sub_coins_${userId}_${eventId}`,
            }).catch((err) => console.warn('[Billing] Coins credit non-fatal error:', err.message));
          }

          if (plan.bonusRewards.gems > 0) {
            await creditBalance({
              userId,
              currency: 'gems',
              amount: plan.bonusRewards.gems,
              type: 'reward',
              referenceType: 'subscription',
              referenceId: providerPaymentId,
              idempotencyKey: `sub_gems_${userId}_${eventId}`,
            }).catch((err) => console.warn('[Billing] Gems credit non-fatal error:', err.message));
          }
        }

        // Send confirmation notification
        await dispatchNotification({
          userId,
          type: 'SYSTEM',
          title: 'EduFlow Pro Activated! 🎉',
          message: `Your ${plan.name} subscription is now active. Enjoy unlimited AI Mentor and advanced features!`,
          link: '/billing',
          priority: 'high',
          force: true,
        }).catch(() => {});

        // Audit Log
        await AuditLog.create({
          actorId: userId,
          actorRole: 'system',
          action: 'subscription_activated',
          resourceType: 'subscription',
          resourceId: planId,
          metadata: { provider, eventId, providerPaymentId },
        }).catch(() => {});
      }
      break;
    }

    case 'invoice.payment_failed':
    case 'payment.failed': {
      if (userId) {
        // Mark subscription past_due with 3-day grace period
        const gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await Subscription.findOneAndUpdate(
          { userId },
          {
            $set: {
              status: 'past_due',
              gracePeriodEnd,
            },
          }
        );

        // Notify user to update payment method
        await dispatchNotification({
          userId,
          type: 'SECURITY',
          title: 'Payment Action Required',
          message: 'Your recent subscription payment failed. Your features remain active for 3 days of grace period. Please update your payment method.',
          link: '/billing',
          priority: 'urgent',
          force: true,
        }).catch(() => {});
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'subscription.canceled': {
      if (userId) {
        await Subscription.findOneAndUpdate(
          { userId },
          {
            $set: {
              status: 'canceled',
              cancelAtPeriodEnd: false,
              canceledAt: new Date(),
            },
          }
        );

        await dispatchNotification({
          userId,
          type: 'SYSTEM',
          title: 'Subscription Canceled',
          message: 'Your subscription has been canceled. You will continue to have access until the end of your billing period.',
          link: '/billing',
          priority: 'normal',
        }).catch(() => {});
      }
      break;
    }

    case 'charge.refunded':
    case 'payment.refunded': {
      if (userId) {
        const refundAmount = data.refundedAmount || data.amount;

        // Update payment status
        if (providerPaymentId) {
          await Payment.findOneAndUpdate(
            { providerPaymentId },
            {
              $set: {
                status: 'refunded',
                refundedAmount: refundAmount,
              },
            }
          );
        }

        // Revoke entitlement
        await revokeSubscription(userId, 'refunded');

        // Audit Log
        await AuditLog.create({
          actorId: userId,
          actorRole: 'system',
          action: 'payment_refunded',
          resourceType: 'payment',
          resourceId: providerPaymentId,
          metadata: { refundAmount, provider, eventId },
        }).catch(() => {});

        // Notification
        await dispatchNotification({
          userId,
          type: 'SYSTEM',
          title: 'Payment Refunded',
          message: 'Your payment has been refunded and your subscription returned to the free tier.',
          link: '/billing',
          priority: 'high',
          force: true,
        }).catch(() => {});
      }
      break;
    }

    default:
      // Other events acknowledged cleanly
      break;
  }

  // 4. Mark Webhook Processed
  webhookRecord.processed = true;
  webhookRecord.processedAt = new Date();
  await webhookRecord.save();

  return {
    success: true,
    eventId,
    eventType,
    handled: true,
  };
}

export default {
  processWebhook,
};
