import mongoose from 'mongoose';

const userTopicMasterySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'General',
    },
    knowledgeScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    status: {
      type: String,
      enum: ['needs_review', 'learning', 'proficient', 'mastered'],
      default: 'learning',
      index: true,
    },
    evidenceCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    recommendedDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    lastPracticedAt: {
      type: Date,
      default: null,
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
    explanation: {
      type: String,
      default: 'Initial topic discovery.',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one mastery record per user, subject, and topic
userTopicMasterySchema.index({ userId: 1, subject: 1, topic: 1 }, { unique: true });
userTopicMasterySchema.index({ userId: 1, status: 1 });
userTopicMasterySchema.index({ userId: 1, knowledgeScore: 1 });

const UserTopicMastery = mongoose.model('UserTopicMastery', userTopicMasterySchema);

export default UserTopicMastery;
