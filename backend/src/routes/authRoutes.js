import { Router } from 'express';
import { register, login, refresh, logout, revokeAll } from '../controllers/authController.js';
import validate, { validateRegister, validateLogin } from '../middleware/validate.js';
import protect from '../middleware/authMiddleware.js';
import requireTrustedOrigin from '../middleware/requireTrustedOrigin.js';

const router = Router();

router.use(requireTrustedOrigin);
router.post('/register', validate(validateRegister), register);
router.post('/login', validate(validateLogin), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/revoke-all', protect, revokeAll);

export default router;
