import mongoose from 'mongoose';

const weakTopicSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: 'General',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true,
  },
  evidence: {
    quizFailures: { type: Number, default: 0 },
    flashcardLapses: { type: Number, default: 0 },
    practiceErrors: { type: Number, default: 0 },
    helpRequests: { type: Number, default: 0 },
  },
  lastObservedAt: {
    type: Date,
    default: Date.now,
  },
});

const strongTopicSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: 'General',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  lastDemonstratedAt: {
    type: Date,
    default: Date.now,
  },
});

const learnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    learningGoals: {
      type: String,
      default: '',
    },
    enrolledCoursesSummary: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        title: String,
        progressPercentage: Number,
        completedLessonsCount: Number,
        totalLessonsCount: Number,
      },
    ],
    completedLessonsCount: {
      type: Number,
      default: 0,
    },
    quizStats: {
      totalAttempts: { type: Number, default: 0 },
      passedAttempts: { type: Number, default: 0 },
      averagePercentage: { type: Number, default: 0 },
      recentScores: [{ score: Number, maxScore: Number, percentage: Number, date: Date }],
    },
    weakTopics: [weakTopicSchema],
    strongTopics: [strongTopicSchema],
    flashcardStats: {
      totalReviewed: { type: Number, default: 0 },
      dueCount: { type: Number, default: 0 },
      retentionRate: { type: Number, default: 0 }, // 0-100%
      totalLapses: { type: Number, default: 0 },
    },
    learningConsistency: {
      streak: { type: Number, default: 0 },
      activeDaysLast30Days: { type: Number, default: 0 },
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    preferredDifficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', null],
      default: null,
    },
    preferredLearningStyle: {
      type: String,
      enum: ['practice', 'theory', 'flashcards', 'mixed', null],
      default: null,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

learnerProfileSchema.index({ userId: 1, lastCalculatedAt: -1 });

const LearnerProfile = mongoose.model('LearnerProfile', learnerProfileSchema);

export default LearnerProfile;
