import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

interface ValidationError extends Error {
  errors?: Record<string, { message: string }>;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('Error:', err.stack);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const validationErr = err as ValidationError;
    const errors = validationErr.errors 
      ? Object.values(validationErr.errors).map(error => error.message)
      : ['Validation failed'];
    const response: ApiResponse = {
      success: false,
      message: 'Validation Error',
      errors
    };
    res.status(400).json(response);
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as MongoError).code === 11000) {
    const mongoErr = err as MongoError;
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : 'field';
    const response: ApiResponse = {
      success: false,
      message: 'Duplicate Entry',
      errors: [`${field} already exists`]
    };
    res.status(400).json(response);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid Token',
      errors: ['Please login again']
    };
    res.status(401).json(response);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    const response: ApiResponse = {
      success: false,
      message: 'Token Expired',
      errors: ['Please login again']
    };
    res.status(401).json(response);
    return;
  }

  // Cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid Resource ID',
      errors: ['Resource not found']
    };
    res.status(404).json(response);
    return;
  }

  // Default error
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    errors: process.env.NODE_ENV === 'production' ? ['Something went wrong'] : [err.message]
  };

  res.status(500).json(response);
};

export const notFound = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: 'Route not found',
    errors: [`Cannot ${req.method} ${req.originalUrl}`]
  };
  res.status(404).json(response);
};