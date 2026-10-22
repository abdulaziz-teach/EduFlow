import mongoose from 'mongoose';

/**
 * Distributed Rate Limiting Bucket Schema
 *
 * Provides shared, atomic rate limiting across horizontally scaled Node.js backend instances
 * using MongoDB atomic upserts and native TTL expiration without requiring external Redis.
 */
const rateLimitBucketSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    hits: {
      type: Number,
      default: 1,
      min: 1,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// TTL index to automatically purge expired rate limit buckets
rateLimitBucketSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitBucket = mongoose.model('RateLimitBucket', rateLimitBucketSchema);

export default RateLimitBucket;
