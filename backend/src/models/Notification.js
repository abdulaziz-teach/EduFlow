import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      // Note: Single-field index removed (FIND-04) because { userId: 1, createdAt: -1 }
      // provides complete prefix index coverage without duplicate index write overhead.
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Legacy types
        'task_reminder',
        'task_due',
        'review_recommendation',
        'practice_recommendation',
        'streak',
        'achievement',
        'study_plan',
        'wallet_reward',
        'course_update',
        'system',
        // Phase 22 standard types
        'LEARNING_REMINDER',
        'DAILY_PLAN',
        'STREAK_REMINDER',
        'STREAK_MILESTONE',
        'QUIZ_REMINDER',
        'FLASHCARD_REVIEW',
        'COURSE_PROGRESS',
        'ACHIEVEMENT_UNLOCKED',
        'RECOMMENDATION',
        'AI_INSIGHT',
        'SYSTEM',
        'SECURITY',
      ],
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'push', 'telegram'],
      default: 'in_app',
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'deferred', 'failed', 'cancelled'],
      default: 'sent',
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    deduplicationKey: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Alias metadata for backward compatibility
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying and scheduler processing
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save sync for data and metadata
notificationSchema.pre('save', function (next) {
  if (this.data && Object.keys(this.data).length > 0 && (!this.metadata || Object.keys(this.metadata).length === 0)) {
    this.metadata = this.data;
  } else if (this.metadata && Object.keys(this.metadata).length > 0 && (!this.data || Object.keys(this.data).length === 0)) {
    this.data = this.metadata;
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
