import mongoose from 'mongoose';

const dailyCoachCacheSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'normal', 'low'],
      default: 'normal',
    },
    suggestedTaskIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique caching entry per user per calendar day YYYY-MM-DD
dailyCoachCacheSchema.index({ userId: 1, dateStr: 1 }, { unique: true });

const DailyCoachCache = mongoose.model('DailyCoachCache', dailyCoachCacheSchema);

export default DailyCoachCache;
