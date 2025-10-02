import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Ticket } from '../models/Ticket';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    // Only L1 users can create tickets
    if (req.user.role !== 'L1') {
      const response: ApiResponse = {
        success: false,
        message: 'Only L1 agents can create tickets',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    const { title, description, category, priority, expectedCompletionDate } = req.body;

    const ticket = new Ticket({
      title,
      description,
      category,
      priority,
      expectedCompletionDate,
      createdBy: req.user.id,
      currentLevel: 'L1',
      actionLogs: [{
        action: 'Ticket created',
        performedBy: new mongoose.Types.ObjectId(req.user.id),
        performedAt: new Date(),
        details: `Ticket created with priority ${priority}`
      }]
    });

    await ticket.save();
    await ticket.populate('createdBy', 'username email role');

    const response: ApiResponse = {
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create ticket error:', error);
    
    // Handle Mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as mongoose.Error.ValidationError;
      const response: ApiResponse = {
        success: false,
        message: 'Validation failed',
        errors: Object.values(validationError.errors).map(err => err.message)
      };
      res.status(400).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create ticket',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    const { status, priority, level, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Build filter based on user role and query parameters
    const filter: Record<string, unknown> = {};

    // Role-based filtering
    if (req.user.role === 'L1') {
      // L1 can only see tickets they created
      filter.createdBy = req.user.id;
    } else if (req.user.role === 'L2') {
      // L2 can see tickets at L2 level and L3 level (for viewing only, they assigned them)
      filter.currentLevel = { $in: ['L2', 'L3'] };
    } else if (req.user.role === 'L3') {
      // L3 can only see C1 and C2 tickets at L3 level
      filter.$and = [
        { currentLevel: 'L3' },
        { criticalValue: { $in: ['C1', 'C2'] } }
      ];
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (level) filter.currentLevel = level;

    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role')
      .populate('escalationHistory.escalatedBy', 'username role')
      .populate('actionLogs.performedBy', 'username role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Ticket.countDocuments(filter);

    const response: ApiResponse = {
      success: true,
      message: 'Tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get tickets error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve tickets',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role')
      .populate('escalationHistory.escalatedBy', 'username role')
      .populate('actionLogs.performedBy', 'username role');

    if (!ticket) {
      const response: ApiResponse = {
        success: false,
        message: 'Ticket not found',
        errors: ['Ticket does not exist']
      };
      res.status(404).json(response);
      return;
    }

    // Check if user has permission to view this ticket
    const canView = 
      (req.user.role === 'L1' && ticket.createdBy._id.toString() === req.user.id) || // L1 can only view tickets they created
      (req.user.role === 'L2' && ['L2', 'L3'].includes(ticket.currentLevel)) || // L2 can view tickets at L2 and L3 level
      (req.user.role === 'L3' && ticket.currentLevel === 'L3' && ['C1', 'C2'].includes(ticket.criticalValue || '')); // L3 can view L3 C1-C2 tickets

    if (!canView) {
      const response: ApiResponse = {
        success: false,
        message: 'Access denied',
        errors: ['You do not have permission to view this ticket']
      };
      res.status(403).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Ticket retrieved successfully',
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get ticket by ID error:', error);
    
    // Handle invalid ObjectId format
    if (error instanceof Error && error.name === 'CastError') {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid ticket ID format',
        errors: ['The provided ticket ID is not valid']
      };
      res.status(400).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve ticket',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    const { id } = req.params;
    const { status, criticalValue } = req.body;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      const response: ApiResponse = {
        success: false,
        message: 'Ticket not found',
        errors: ['Ticket does not exist']
      };
      res.status(404).json(response);
      return;
    }

    // Validate permissions based on role and ticket level
    // L1 can work on L1 tickets
    if (req.user.role === 'L1' && ticket.currentLevel !== 'L1') {
      const response: ApiResponse = {
        success: false,
        message: 'L1 agents can only update tickets at L1 level',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    // L2 can work on L1 and L2 tickets (not L3)
    if (req.user.role === 'L2' && !['L1', 'L2'].includes(ticket.currentLevel)) {
      const response: ApiResponse = {
        success: false,
        message: 'L2 agents can only update tickets at L1 or L2 level',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    // L3 can work on any ticket level (L1, L2, L3)
    if (req.user.role === 'L3') {
      // L3 can work on all tickets, but for L3 tickets only C1/C2
      if (ticket.currentLevel === 'L3' && !['C1', 'C2'].includes(ticket.criticalValue || '')) {
        const response: ApiResponse = {
          success: false,
          message: 'L3 agents can only update critical (C1, C2) tickets at L3 level',
          errors: ['Insufficient permissions']
        };
        res.status(403).json(response);
        return;
      }
    }

    const previousStatus = ticket.status;

    // Update ticket
    if (status) ticket.status = status;
    if (criticalValue && req.user.role === 'L2') {
      ticket.criticalValue = criticalValue;
    }

    // Add action log
    ticket.actionLogs.push({
      action: `Status updated from ${previousStatus} to ${status || previousStatus}`,
      performedBy: new mongoose.Types.ObjectId(req.user.id),
      performedAt: new Date(),
      details: criticalValue ? `Critical value set to ${criticalValue}` : undefined,
      previousStatus,
      newStatus: status || previousStatus
    });

    await ticket.save();
    await ticket.populate('createdBy', 'username email role');
    await ticket.populate('assignedTo', 'username email role');

    const response: ApiResponse = {
      success: true,
      message: 'Ticket updated successfully',
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update ticket status error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to update ticket',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const updateCriticalValue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      };
      res.status(401).json(response);
      return;
    }

    // Only L2 users can update critical value
    if (req.user.role !== 'L2') {
      const response: ApiResponse = {
        success: false,
        message: 'Only L2 agents can update critical value',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    const { id } = req.params;
    const { criticalValue } = req.body;

    // Validate critical value
    if (!criticalValue || !['C1', 'C2', 'C3'].includes(criticalValue)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid critical value',
        errors: ['Critical value must be C1, C2, or C3']
      };
      res.status(400).json(response);
      return;
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      const response: ApiResponse = {
        success: false,
        message: 'Ticket not found',
        errors: ['Ticket does not exist']
      };
      res.status(404).json(response);
      return;
    }

    // L2 can only update tickets at L2 level
    if (ticket.currentLevel !== 'L2') {
      const response: ApiResponse = {
        success: false,
        message: 'Can only update critical value for tickets at L2 level',
        errors: ['Ticket not at L2 level']
      };
      res.status(403).json(response);
      return;
    }

    const previousCriticalValue = ticket.criticalValue;

    // Update critical value
    ticket.criticalValue = criticalValue;

    // Add action log
    ticket.actionLogs.push({
      action: 'Critical value updated',
      performedBy: new mongoose.Types.ObjectId(req.user.id),
      performedAt: new Date(),
      details: `Critical value changed from ${previousCriticalValue || 'none'} to ${criticalValue}`
    });

    await ticket.save();
    await ticket.populate('createdBy', 'username email role');
    await ticket.populate('assignedTo', 'username email role');
    await ticket.populate('escalationHistory.escalatedBy', 'username role');
    await ticket.populate('actionLogs.performedBy', 'username role');

    const response: ApiResponse = {
      success: true,
      message: 'Critical value updated successfully',
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update critical value error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to update critical value',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};