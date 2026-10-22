import mongoose from 'mongoose';

const aiMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['goal', 'strength', 'weakness', 'mastered_concept', 'preference'],
      required: true,
      index: true,
    },
    concept: {
      type: String,
      required: true,
      trim: true,
    },
    observation: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8,
    },
    source: {
      type: String,
      enum: ['user_statement', 'mentor_interaction', 'quiz_result', 'system_inference'],
      default: 'user_statement',
    },
    lastObservedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fetching and deduplicating memories
aiMemorySchema.index({ userId: 1, category: 1 });
aiMemorySchema.index({ userId: 1, concept: 1 });

const AIMemory = mongoose.model('AIMemory', aiMemorySchema);

export default AIMemory;
