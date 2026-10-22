import mongoose from 'mongoose';

/**
 * WebhookEvent Model
 * Durable audit log and idempotency guard for payment provider webhook events.
 */
const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    payloadHash: {
      type: String,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index guaranteeing at-most-once processing per provider event
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

export default WebhookEvent;
