import mongoose from 'mongoose';

const mistakeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['quiz', 'practice'],
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      default: [],
    },
    userAnswer: {
      type: String,
      default: '',
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      default: 'General',
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    attemptsCount: {
      type: Number,
      default: 1,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

mistakeLogSchema.index({ userId: 1, resolved: 1, topic: 1 });
mistakeLogSchema.index({ userId: 1, question: 1 });

const MistakeLog = mongoose.model('MistakeLog', mistakeLogSchema);

export default MistakeLog;
