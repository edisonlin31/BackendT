import { Router } from 'express';
import { login, getProfile } from '../controllers/authController';
import { validateUserLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, getProfile);

export default router;