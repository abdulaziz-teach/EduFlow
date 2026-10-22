import mongoose from 'mongoose';

/**
 * Report Model — Content Moderation & User Flagging Queue
 * 
 * Supports safe reporting of educational content, AI outputs, and abusive accounts.
 * Includes optimistic concurrency tracking and structured resolutions.
 */
const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter user ID is required'],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['course', 'lesson', 'quiz', 'flashcard', 'user', 'ai_content', 'comment', 'other'],
      required: [true, 'Target type is required'],
      index: true,
    },
    targetId: {
      type: String,
      required: [true, 'Target ID is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'inappropriate',
        'inaccurate',
        'duplicate',
        'low_quality',
        'misleading',
        'unsafe',
        'prompt_injection',
        'spam',
        'other',
      ],
      required: [true, 'Report reason is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'rejected', 'escalated'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolution: {
      type: String,
      trim: true,
      default: '',
    },
    resolutionAction: {
      type: String,
      enum: [
        'none',
        'content_hidden',
        'content_edited',
        'content_removed',
        'user_warned',
        'user_suspended',
        'dismissed',
      ],
      default: 'none',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Concurrency control token
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save sync for reviewerId and resolvedBy
reportSchema.pre('save', function (next) {
  if (this.resolvedBy && !this.reviewerId) {
    this.reviewerId = this.resolvedBy;
  } else if (this.reviewerId && !this.resolvedBy) {
    this.resolvedBy = this.reviewerId;
  }
  next();
});

// Compound indexes for moderation triage
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
