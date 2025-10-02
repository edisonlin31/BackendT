import { Router } from 'express';
import authRoutes from './auth';
import ticketRoutes from './tickets';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Helpdesk API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);

export default router;