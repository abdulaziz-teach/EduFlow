import { Router } from 'express';
import {
  completeOnboarding,
  getMe,
  saveOnboardingDraft,
  updateMe,
} from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import validate, {
  validateOnboarding,
  validateOnboardingDraft,
  validateProfileUpdate,
} from '../middleware/validate.js';

const router = Router();

// All user routes require authentication
router.use(protect);

router.get('/me', getMe);
router.patch('/me', validate(validateProfileUpdate), updateMe);
router.patch('/me/onboarding-draft', validate(validateOnboardingDraft), saveOnboardingDraft);
router.post('/me/onboarding', validate(validateOnboarding), completeOnboarding);

export default router;
