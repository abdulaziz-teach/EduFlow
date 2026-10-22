import mongoose from 'mongoose';

const dailyTaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['flashcard_review', 'lesson_continue', 'practice_weak_topic', 'quiz_practice', 'revision'],
    required: true,
  },
  estimatedMinutes: {
    type: Number,
    required: true,
    min: 1,
    max: 180,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  metadata: {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardDeck' },
    topic: String,
    subject: String,
  },
});

const dailyLearningPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateStr: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    tasks: [dailyTaskSchema],
    totalEstimatedMinutes: {
      type: Number,
      default: 0,
    },
    completedTasksCount: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    generatedBy: {
      type: String,
      enum: ['system', 'ai'],
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

// One daily learning plan per user per day
dailyLearningPlanSchema.index({ userId: 1, dateStr: 1 }, { unique: true });

const DailyLearningPlan = mongoose.model('DailyLearningPlan', dailyLearningPlanSchema);

export default DailyLearningPlan;
