import { Router } from 'express';
import { getMe, updateMe } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import validate, { validateProfileUpdate } from '../middleware/validate.js';

const router = Router();

// All user routes require authentication
router.use(protect);

router.get('/me', getMe);
router.patch('/me', validate(validateProfileUpdate), updateMe);

export default router;
