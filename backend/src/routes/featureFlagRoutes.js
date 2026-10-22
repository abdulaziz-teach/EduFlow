import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { evaluateUserFeatureFlags } from '../services/featureFlagService.js';

const router = Router();

// Public / User client feature flag evaluation
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const flags = await evaluateUserFeatureFlags(req.user);
    res.json({
      success: true,
      data: {
        flags,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
