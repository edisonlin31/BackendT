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

export const escalateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const { toLevel, reason, notes } = req.body;

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

    // Validate escalation rules
    const currentLevel = ticket.currentLevel;
    const userRole = req.user.role;

    // L1 can escalate to L2
    if (userRole === 'L1' && toLevel !== 'L2') {
      const response: ApiResponse = {
        success: false,
        message: 'L1 agents can only escalate to L2',
        errors: ['Invalid escalation path']
      };
      res.status(400).json(response);
      return;
    }

    // L2 can escalate to L3
    if (userRole === 'L2' && toLevel !== 'L3') {
      const response: ApiResponse = {
        success: false,
        message: 'L2 agents can only escalate to L3',
        errors: ['Invalid escalation path']
      };
      res.status(400).json(response);
      return;
    }

    // L3 cannot escalate further
    if (userRole === 'L3') {
      const response: ApiResponse = {
        success: false,
        message: 'L3 is the highest level, cannot escalate further',
        errors: ['Invalid escalation attempt']
      };
      res.status(400).json(response);
      return;
    }

    // Can only escalate from current user's level
    if (currentLevel !== userRole) {
      const response: ApiResponse = {
        success: false,
        message: `Can only escalate tickets at your current level (${userRole})`,
        errors: ['Ticket is not at your level']
      };
      res.status(403).json(response);
      return;
    }

    // L2 to L3 escalation requires critical value and only C1/C2 can go to L3
    if (userRole === 'L2' && toLevel === 'L3') {
      if (!ticket.criticalValue) {
        const response: ApiResponse = {
          success: false,
          message: 'Cannot escalate to L3 without critical value assignment',
          errors: ['Critical value must be set before escalating to L3']
        };
        res.status(400).json(response);
        return;
      }

      if (ticket.criticalValue === 'C3') {
        const response: ApiResponse = {
          success: false,
          message: 'C3 tickets cannot be escalated to L3',
          errors: ['Only C1 and C2 tickets can be escalated to L3']
        };
        res.status(400).json(response);
        return;
      }
    }

    // Update ticket
    const previousLevel = ticket.currentLevel;
    ticket.currentLevel = toLevel as 'L1' | 'L2' | 'L3';
    ticket.status = 'Escalated';

    // Add escalation to history
    ticket.escalationHistory.push({
      fromLevel: previousLevel,
      toLevel: toLevel as 'L1' | 'L2' | 'L3',
      reason,
      escalatedBy: new mongoose.Types.ObjectId(req.user.id),
      escalatedAt: new Date(),
      notes
    });

    // Add action log
    ticket.actionLogs.push({
      action: `Ticket escalated from ${previousLevel} to ${toLevel}`,
      performedBy: new mongoose.Types.ObjectId(req.user.id),
      performedAt: new Date(),
      details: `Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`,
      previousStatus: ticket.status,
      newStatus: 'Escalated'
    });

    await ticket.save();
    await ticket.populate('createdBy', 'username email role');
    await ticket.populate('assignedTo', 'username email role');
    await ticket.populate('escalationHistory.escalatedBy', 'username role');
    await ticket.populate('actionLogs.performedBy', 'username role');

    const response: ApiResponse = {
      success: true,
      message: `Ticket escalated successfully from ${previousLevel} to ${toLevel}`,
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Escalate ticket error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to escalate ticket',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const addActionLog = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const { action, details } = req.body;

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

    // Validate permissions
    const canAddLog = 
      (req.user.role === 'L1' && ticket.currentLevel === 'L1') ||
      (req.user.role === 'L2' && ['L1', 'L2'].includes(ticket.currentLevel)) ||
      (req.user.role === 'L3' && ticket.currentLevel === 'L3' && ['C1', 'C2'].includes(ticket.criticalValue || ''));

    if (!canAddLog) {
      const response: ApiResponse = {
        success: false,
        message: 'You do not have permission to add action logs to this ticket',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    // Add action log
    ticket.actionLogs.push({
      action,
      performedBy: new mongoose.Types.ObjectId(req.user.id),
      performedAt: new Date(),
      details
    });

    await ticket.save();
    await ticket.populate('actionLogs.performedBy', 'username role');

    const response: ApiResponse = {
      success: true,
      message: 'Action log added successfully',
      data: { 
        actionLog: ticket.actionLogs[ticket.actionLogs.length - 1]
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Add action log error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to add action log',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};

export const resolveTicket = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // L1, L2, L3 can resolve tickets
    if (!['L1', 'L2', 'L3'].includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        message: 'Only L1, L2, and L3 agents can resolve tickets',
        errors: ['Insufficient permissions']
      };
      res.status(403).json(response);
      return;
    }

    const { id } = req.params;
    const { resolution } = req.body;

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
    let canResolve = false;
    
    if (req.user.role === 'L1' && ticket.currentLevel === 'L1') {
      canResolve = true;
    } else if (req.user.role === 'L2' && ticket.currentLevel === 'L2') {
      canResolve = true;
    } else if (req.user.role === 'L3' && ticket.currentLevel === 'L3' && ['C1', 'C2'].includes(ticket.criticalValue || '')) {
      canResolve = true;
    }

    if (!canResolve) {
      const response: ApiResponse = {
        success: false,
        message: `${req.user.role} agents can only resolve tickets at ${req.user.role} level`,
        errors: ['Insufficient permissions for this ticket level']
      };
      res.status(403).json(response);
      return;
    }

    const previousStatus = ticket.status;
    ticket.status = 'Resolved';

    // Add resolution action log
    ticket.actionLogs.push({
      action: 'Ticket resolved',
      performedBy: new mongoose.Types.ObjectId(req.user.id),
      performedAt: new Date(),
      details: `Resolution: ${resolution}`,
      previousStatus,
      newStatus: 'Resolved'
    });

    await ticket.save();
    await ticket.populate('createdBy', 'username email role');
    await ticket.populate('assignedTo', 'username email role');
    await ticket.populate('actionLogs.performedBy', 'username role');

    const response: ApiResponse = {
      success: true,
      message: 'Ticket resolved successfully',
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Resolve ticket error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to resolve ticket',
      errors: ['Internal server error']
    };
    res.status(500).json(response);
  }
};