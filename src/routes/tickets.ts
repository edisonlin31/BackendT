import { Router } from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicketById, 
  updateTicketStatus,
  updateCriticalValue
} from '../controllers/ticketController';
import { 
  escalateTicket, 
  addActionLog, 
  resolveTicket 
} from '../controllers/escalationController';
import { 
  validateTicketCreation, 
  validateTicketUpdate, 
  validateTicketEscalation,
  validateActionLog 
} from '../middleware/validation';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// @route   POST /api/tickets
// @desc    Create a new ticket
// @access  Private (L1 only)
router.post(
  '/',
  authorizeRoles('L1'),
  validateTicketCreation,
  createTicket
);

// @route   GET /api/tickets
// @desc    Get tickets based on user role
// @access  Private
router.get('/', getTickets);

// @route   GET /api/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/:id', getTicketById);

// @route   PATCH /api/tickets/:id/status
// @desc    Update ticket status
// @access  Private
router.patch(
  '/:id/status',
  validateTicketUpdate,
  updateTicketStatus
);

// @route   PATCH /api/tickets/:id/critical-value
// @desc    Update ticket critical value (L2 only)
// @access  Private (L2 only)
router.patch(
  '/:id/critical-value',
  authorizeRoles('L2'),
  updateCriticalValue
);

// @route   POST /api/tickets/:id/escalate
// @desc    Escalate ticket to next level
// @access  Private (L1 can escalate to L2, L2 can escalate to L3)
router.post(
  '/:id/escalate',
  authorizeRoles('L1', 'L2'),
  validateTicketEscalation,
  escalateTicket
);

// @route   POST /api/tickets/:id/action-log
// @desc    Add action log to ticket
// @access  Private (L2, L3)
router.post(
  '/:id/action-log',
  authorizeRoles('L1', 'L2', 'L3'),
  validateActionLog,
  addActionLog
);

// @route   POST /api/tickets/:id/resolve
// @desc    Resolve ticket (L1, L2, L3)
// @access  Private (L1, L2, L3)
router.post(
  '/:id/resolve',
  authorizeRoles('L1', 'L2', 'L3'),
  resolveTicket
);

export default router;