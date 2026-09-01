import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import validate, { validateRegister, validateLogin } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate(validateRegister), register);
router.post('/login', validate(validateLogin), login);

export default router;
