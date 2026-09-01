import mongoose from 'mongoose';

const knowledgeTopicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'learning', 'needs_review', 'strong'],
      default: 'new',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    practiceCount: {
      type: Number,
      default: 0,
    },
    successfulActivities: {
      type: Number,
      default: 0,
    },
    lastPracticedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound index per topic per user, and allow sorting on recency
knowledgeTopicSchema.index({ userId: 1, subject: 1, topic: 1 }, { unique: true });
knowledgeTopicSchema.index({ userId: 1, updatedAt: -1 });

const KnowledgeTopic = mongoose.model('KnowledgeTopic', knowledgeTopicSchema);

export default KnowledgeTopic;
