import mongoose from 'mongoose';

const flashcardProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    flashcardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flashcard',
      required: [true, 'Flashcard ID is required'],
      index: true,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
      min: [1.3, 'Ease factor cannot fall below 1.3'],
    },
    interval: {
      type: Number, // In days
      default: 0,
      min: [0, 'Interval cannot be negative'],
    },
    repetitions: {
      type: Number,
      default: 0,
      min: [0, 'Repetitions cannot be negative'],
    },
    dueAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    lapses: {
      type: Number,
      default: 0,
      min: [0, 'Lapses cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
flashcardProgressSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });
flashcardProgressSchema.index({ userId: 1, dueAt: 1 });

const FlashcardProgress = mongoose.model('FlashcardProgress', flashcardProgressSchema);

export default FlashcardProgress;
