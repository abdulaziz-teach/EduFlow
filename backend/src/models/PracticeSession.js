import mongoose from 'mongoose';

const practiceSessionSchema = new mongoose.Schema(
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
    },
    topic: {
      type: String,
      required: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PracticeQuestion',
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        answer: {
          type: String,
          default: null,
        },
        isCorrect: {
          type: Boolean,
          default: null,
        },
        answeredAt: {
          type: Date,
          default: null,
        },
      },
    ],
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for history sorting
practiceSessionSchema.index({ userId: 1, startedAt: -1 });

const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema);

export default PracticeSession;
