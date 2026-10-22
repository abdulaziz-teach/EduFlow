import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['chat', 'quiz_generation', 'plan_generation', 'summary', 'content_generation', 'content_refine', 'duplicate_check'],
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['explain', 'socratic', 'standard', null],
      default: 'standard',
    },
    model: {
      type: String,
      default: 'gpt-4o-mini',
    },
    promptTokensEstimate: {
      type: Number,
      default: 0,
    },
    completionTokensEstimate: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

aiUsageLogSchema.index({ userId: 1, createdAt: -1 });
// TTL index to purge usage logs older than 180 days
aiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const AIUsageLog = mongoose.model('AIUsageLog', aiUsageLogSchema);

export default AIUsageLog;
