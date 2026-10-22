import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true,
  },
  back: {
    type: String,
    required: true,
    trim: true,
  },
  hint: {
    type: String,
    trim: true,
    default: '',
  },
  // Spaced Repetition (SuperMemo-2) fields
  interval: {
    type: Number,
    default: 0, // In days
  },
  repetitions: {
    type: Number,
    default: 0,
  },
  easeFactor: {
    type: Number,
    default: 2.5,
  },
  nextReviewDate: {
    type: Date,
    default: Date.now,
  },
  lastReviewedAt: {
    type: Date,
    default: null,
  },
  masteryLevel: {
    type: String,
    enum: ['new', 'learning', 'review', 'mastered'],
    default: 'new',
  },
});

const flashcardDeckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    cards: [cardSchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    generationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIContentGeneration',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user decks efficiently
flashcardDeckSchema.index({ userId: 1, subject: 1, updatedAt: -1 });
flashcardDeckSchema.index({ status: 1, isPublic: 1, subject: 1 });
flashcardDeckSchema.index(
  {
    title: 'text',
    description: 'text',
    subject: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      subject: 6,
      tags: 5,
      description: 2,
    },
    name: 'DeckTextIndex',
    default_language: 'none',
    language_override: 'none',
  }
);

export default mongoose.model('FlashcardDeck', flashcardDeckSchema);
