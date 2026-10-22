import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
      select: false, // Never return tokenHash by default
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipHash: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index to automatically purge expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for fast lookup and user session queries
sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ userId: 1, expiresAt: 1 });

sessionSchema.methods.isValid = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

sessionSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    userId: this.userId,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
    lastUsedAt: this.lastUsedAt,
    revokedAt: this.revokedAt,
    userAgent: this.userAgent,
    isValid: this.isValid(),
  };
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
