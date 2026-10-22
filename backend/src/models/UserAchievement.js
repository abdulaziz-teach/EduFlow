import mongoose from 'mongoose';

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      default: null,
      index: true,
    },
    // Legacy key field preserved for backward compatibility
    achievementKey: {
      type: String,
      default: null,
      index: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate achievement unlocks for the same student
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true, sparse: true });
userAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true, sparse: true });

const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

export default UserAchievement;
