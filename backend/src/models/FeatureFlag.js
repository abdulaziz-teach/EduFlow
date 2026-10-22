import mongoose from 'mongoose';

/**
 * FeatureFlag Model — Dynamic Feature Rollout and Emergency Controls
 * 
 * Supports percentage-based gradual rollouts, user and role targeting,
 * and immediate operational kill-switches.
 */
const featureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Feature flag key is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, 'Flag key can only contain lowercase letters, numbers, and underscores'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Feature flag display name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    rolloutPercentage: {
      type: Number,
      min: [0, 'Rollout percentage cannot be below 0'],
      max: [100, 'Rollout percentage cannot exceed 100'],
      default: 0,
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    environment: {
      type: String,
      enum: ['all', 'development', 'staging', 'production'],
      default: 'all',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

featureFlagSchema.index({ isEnabled: 1, environment: 1 });

const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);

export default FeatureFlag;
