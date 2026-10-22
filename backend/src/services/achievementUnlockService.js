import Achievement from '../models/Achievement.js';
import UserAchievement from '../models/UserAchievement.js';
import { creditBalance } from './walletService.js';
import { withTransaction } from '../utils/transactionHelper.js';

/**
 * Unlock achievement and atomically grant rewards
 */
export const unlockAchievement = async (userId, achievementId) => {
  return withTransaction(async (session) => {
    const sessionOpts = session ? { session } : {};

    // 1. Check if achievement exists
    const achievement = await Achievement.findById(achievementId, null, sessionOpts);
    if (!achievement || !achievement.active) {
      const err = new Error('Achievement not found or inactive');
      err.statusCode = 404;
      throw err;
    }

    // 2. Check if already unlocked (duplicate prevention)
    const existing = await UserAchievement.findOne({ userId, achievementId }, null, sessionOpts);
    if (existing) {
      return {
        success: true,
        alreadyUnlocked: true,
        userAchievement: existing,
        achievement,
        rewardGranted: false,
      };
    }

    // 3. Create UserAchievement record
    let userAchievement;
    try {
      const docs = await UserAchievement.create(
        [
          {
            userId,
            achievementId,
            unlockedAt: new Date(),
          },
        ],
        sessionOpts
      );
      userAchievement = docs[0];
    } catch (err) {
      if (err.code === 11000) {
        // Concurrently unlocked
        const record = await UserAchievement.findOne({ userId, achievementId }, null, sessionOpts);
        return {
          success: true,
          alreadyUnlocked: true,
          userAchievement: record,
          achievement,
          rewardGranted: false,
        };
      }
      throw err;
    }

    // 4. Atomically grant reward if applicable
    let walletResult = null;
    if (achievement.reward && achievement.reward.amount > 0) {
      walletResult = await creditBalance({
        userId,
        currency: achievement.reward.currency,
        amount: achievement.reward.amount,
        type: 'reward',
        referenceType: 'achievement',
        referenceId: achievement._id.toString(),
        metadata: { achievementName: achievement.name },
        session,
      });
    }

    return {
      success: true,
      alreadyUnlocked: false,
      userAchievement,
      achievement,
      rewardGranted: Boolean(walletResult),
      wallet: walletResult?.wallet,
    };
  });
};
