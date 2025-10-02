import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiResponse } from '../types';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => error.msg)
    };
    res.status(400).json(response);
    return;
  }
  
  next();
};

// User validation rules
export const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Ticket validation rules
export const validateTicketCreation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must not exceed 200 characters')
    .trim()
    .escape(),
  body('description')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description is required and must not exceed 2000 characters')
    .trim()
    .escape(),
  body('category')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must not exceed 100 characters')
    .trim()
    .escape(),
  body('priority')
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('expectedCompletionDate')
    .isISO8601()
    .withMessage('Expected completion date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expected completion date must be in the future');
      }
      return true;
    }),
  handleValidationErrors
];

export const validateTicketUpdate = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must not exceed 200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .trim()
    .escape(),
  body('category')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must not exceed 100 characters')
    .trim()
    .escape(),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('status')
    .optional()
    .isIn(['New', 'Attending', 'Completed', 'Escalated', 'Resolved'])
    .withMessage('Status must be New, Attending, Completed, Escalated, or Resolved'),
  body('criticalValue')
    .optional()
    .isIn(['C1', 'C2', 'C3'])
    .withMessage('Critical value must be C1, C2, or C3'),
  body('expectedCompletionDate')
    .optional()
    .isISO8601()
    .withMessage('Expected completion date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expected completion date must be in the future');
      }
      return true;
    }),
  handleValidationErrors
];

export const validateTicketEscalation = [
  body('toLevel')
    .isIn(['L1', 'L2', 'L3'])
    .withMessage('Target level must be L1, L2, or L3'),
  body('reason')
    .isLength({ min: 1, max: 500 })
    .withMessage('Escalation reason is required and must not exceed 500 characters')
    .trim()
    .escape(),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

export const validateActionLog = [
  body('action')
    .isLength({ min: 1, max: 200 })
    .withMessage('Action description is required and must not exceed 200 characters')
    .trim()
    .escape(),
  body('details')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Details must not exceed 1000 characters')
    .trim()
    .escape(),
  handleValidationErrors
];