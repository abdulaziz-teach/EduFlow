import mongoose from 'mongoose';

const leaderboardEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'allTime'],
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
    },
    rank: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance ranking queries without loading users into Node memory
leaderboardEntrySchema.index({ period: 1, score: -1 });
leaderboardEntrySchema.index({ userId: 1, period: 1 }, { unique: true });

const LeaderboardEntry = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);

export default LeaderboardEntry;
