import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { submitReport } from '../services/moderationService.js';

const router = Router();

// Authenticated users can flag inappropriate content or abusive behavior
router.post('/', protect, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'targetType, targetId, and reason are required',
      });
    }

    const result = await submitReport({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      description,
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate
        ? 'Report already submitted and under review'
        : 'Report submitted successfully for moderation review',
      report: result.report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
