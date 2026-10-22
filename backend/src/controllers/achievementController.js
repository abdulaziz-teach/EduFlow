import Achievement from '../models/Achievement.js';
import UserAchievement from '../models/UserAchievement.js';
import { unlockAchievement } from '../services/achievementUnlockService.js';
import { logAdminAction } from '../services/auditService.js';

/**
 * @desc    Get all active achievements with user unlock status
 * @route   GET /api/achievements
 * @access  Protected
 */
export const getAchievements = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [achievements, userUnlocks] = await Promise.all([
      Achievement.find({ active: true }).lean(),
      UserAchievement.find({ userId }).lean(),
    ]);

    const unlockedSet = new Set(
      userUnlocks.map((u) => u.achievementId?.toString() || u.achievementKey)
    );

    const formatted = achievements.map((a) => ({
      ...a,
      isUnlocked: unlockedSet.has(a._id.toString()),
      unlockedAt: userUnlocks.find((u) => u.achievementId?.toString() === a._id.toString())?.unlockedAt || null,
    }));

    res.json({
      success: true,
      achievements: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unlock achievement
 * @route   POST /api/achievements/:id/unlock
 * @access  Protected
 */
export const unlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await unlockAchievement(req.user._id, id);

    res.status(result.alreadyUnlocked ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create achievement
 * @route   POST /api/achievements
 * @access  Protected (Admin only)
 */
export const createAchievement = async (req, res, next) => {
  try {
    const { name, description, icon, conditionType, conditionValue, reward, active } = req.body;

    const achievement = await Achievement.create({
      name,
      description,
      icon: icon || 'trophy',
      conditionType,
      conditionValue,
      reward,
      active: active !== undefined ? active : true,
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'achievement_created',
      targetType: 'Achievement',
      targetId: achievement._id,
      metadata: { name: achievement.name, reward },
    });

    res.status(201).json({
      success: true,
      achievement,
    });
  } catch (error) {
    next(error);
  }
};
