import mongoose from 'mongoose';

const searchEventSchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    normalizedQuery: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    anonymousSessionId: {
      type: String,
      default: null,
      trim: true,
    },
    eventType: {
      type: String,
      enum: ['search', 'suggestion_select', 'result_click', 'zero_results'],
      default: 'search',
      index: true,
    },
    resultCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    executionTimeMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    selectedResult: {
      entityType: {
        type: String,
        enum: ['course', 'lesson', 'quiz', 'flashcard', 'topic', null],
        default: null,
      },
      entityId: {
        type: String,
        default: null,
      },
      position: {
        type: Number,
        default: null,
      },
      title: {
        type: String,
        default: null,
      },
    },
    filters: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for fast admin telemetry queries and time-series aggregation
searchEventSchema.index({ eventType: 1, createdAt: -1 });
searchEventSchema.index({ normalizedQuery: 1, eventType: 1 });
searchEventSchema.index({ resultCount: 1, eventType: 1 });
searchEventSchema.index({ createdAt: -1 });

// TTL index to automatically purge old search events after 90 days
searchEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const SearchEvent = mongoose.model('SearchEvent', searchEventSchema);

export default SearchEvent;
