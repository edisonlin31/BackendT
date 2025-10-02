import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';

export const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  role: 'L1' | 'L2' | 'L3' | 'Admin';
  password: string;
}

export interface TestTicketData {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  expectedCompletionDate?: Date;
  status?: string;
  currentLevel?: string;
  criticalValue?: string;
}

export const createTestUser = async (userData: Partial<TestUser> = {}): Promise<TestUser> => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    role: 'L1' as const,
    password: 'password123',
    ...userData,
  };

  const hashedPassword = await bcrypt.hash(defaultUser.password, 10);
  
  const user = new User({
    username: defaultUser.username,
    email: defaultUser.email,
    password: hashedPassword,
    role: defaultUser.role,
  });

  const savedUser = await user.save();
  
  return {
    id: String(savedUser._id),
    username: savedUser.username,
    email: savedUser.email,
    role: savedUser.role,
    password: defaultUser.password, // Return original password for testing
  };
};

export const generateTestToken = (user: TestUser): string => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const createTestTicket = async (createdBy: string, ticketData: TestTicketData = {}) => {
  const defaultTicket = {
    title: 'Test Ticket',
    description: 'Test ticket description',
    category: 'Software',
    priority: 'Medium',
    expectedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdBy,
    currentLevel: 'L1',
    actionLogs: [{
      action: 'Ticket created',
      performedBy: createdBy,
      performedAt: new Date(),
    }],
    ...ticketData,
  };

  const ticket = new Ticket(defaultTicket);
  return await ticket.save();
};

export const mockAuthMiddleware = (user: TestUser) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Type assertion for adding user property to request
    const authReq = req as Request & { user: { id: string; username: string; role: string } };
    authReq.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    next();
  };
};