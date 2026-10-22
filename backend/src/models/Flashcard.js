import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema(
  {
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlashcardDeck',
      required: [true, 'Deck ID is required'],
      index: true,
    },
    front: {
      type: String,
      required: [true, 'Front text is required'],
      trim: true,
    },
    back: {
      type: String,
      required: [true, 'Back text is required'],
      trim: true,
    },
    hint: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

flashcardSchema.index({ deckId: 1, createdAt: 1 });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

export default Flashcard;
