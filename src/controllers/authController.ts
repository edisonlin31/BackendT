import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      };
      res.status(401).json(response);
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      };
      res.status(401).json(response);
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { id: String(user._id) },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
    );

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Login failed',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'User not authenticated',
        errors: ['Authentication required']
      };
      res.status(401).json(response);
      return;
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'User not found',
        errors: ['User does not exist']
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: user.toJSON() }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve profile',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};