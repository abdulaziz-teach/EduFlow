import mongoose from 'mongoose';

const aiContentGenerationSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['course', 'lesson', 'quiz', 'flashcards', 'section'],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    targetLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all_levels', 'easy', 'medium', 'hard'],
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'en',
    },
    sourceContentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    sourceType: {
      type: String,
      enum: ['approved_course_content', 'admin_prompt', 'general_ai_knowledge'],
      default: 'admin_prompt',
    },
    model: {
      type: String,
      default: 'gpt-4o-mini',
    },
    promptVersion: {
      type: String,
      default: '1.0.0',
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true,
    },
    generatedContent: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    validationResults: {
      type: mongoose.Schema.Types.Mixed,
      default: { isValid: true, issues: [], qualityScore: 1.0 },
    },
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'published'],
      default: 'pending_review',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    targetEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetEntityType: {
      type: String,
      enum: ['Course', 'Lesson', 'Quiz', 'FlashcardDeck', null],
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiContentGenerationSchema.index({ requestedBy: 1, createdAt: -1 });
aiContentGenerationSchema.index({ contentType: 1, reviewStatus: 1 });
aiContentGenerationSchema.index({ subject: 1, createdAt: -1 });

const AIContentGeneration = mongoose.model('AIContentGeneration', aiContentGenerationSchema);

export default AIContentGeneration;
