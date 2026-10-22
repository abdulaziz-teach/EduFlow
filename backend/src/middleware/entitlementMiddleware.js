import { canUse, checkAIMessageQuota } from '../services/entitlementService.js';

/**
 * Middleware: Require active entitlement for a specific feature
 * Blocks access server-side if user is not on a qualifying plan or admin.
 */
export function requireEntitlement(featureKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const allowed = await canUse(req.user, featureKey);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'ENTITLEMENT_REQUIRED',
          message: `This feature requires an active EduFlow Pro subscription.`,
          featureKey,
          upgradeUrl: '/billing',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Check daily AI Mentor query quota
 */
export async function requireAIMessageQuota(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Admins bypass quota
    if (req.user.role === 'admin' || req.user.isAdmin === true) {
      return next();
    }

    const quota = await checkAIMessageQuota(req.user._id);
    if (!quota.allowed) {
      return res.status(403).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: `You have reached your daily free limit of ${quota.limit} AI Mentor queries. Upgrade to Pro for unlimited learning assistance!`,
        quota,
        upgradeUrl: '/billing',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default {
  requireEntitlement,
  requireAIMessageQuota,
};
