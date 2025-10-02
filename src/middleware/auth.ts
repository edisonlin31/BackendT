import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { ApiResponse } from '../types';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Access token is required',
        errors: ['No token provided']
      };
      res.status(401).json(response);
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'User not found',
        errors: ['Invalid token']
      };
      res.status(401).json(response);
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,
      username: user.username
    };

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    const response: ApiResponse = {
      success: false,
      message: 'Invalid token',
      errors: ['Token verification failed']
    };
    res.status(403).json(response);
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    if (!roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        message: 'Insufficient permissions',
        errors: [`Role ${req.user.role} not authorized for this action`]
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};