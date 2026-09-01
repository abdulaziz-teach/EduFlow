import mongoose from 'mongoose';

const practiceQuestionSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      required: true,
      enum: ['multiple_choice', 'true_false', 'short_answer'],
    },
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    createdBy: {
      type: String,
      enum: ['ai', 'system'],
      default: 'ai',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to speed up question selection and prevent duplicates
practiceQuestionSchema.index({ subject: 1, topic: 1, difficulty: 1 });

const PracticeQuestion = mongoose.model('PracticeQuestion', practiceQuestionSchema);

export default PracticeQuestion;
