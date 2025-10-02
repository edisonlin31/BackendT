import request from 'supertest';
import express from 'express';
import { createTicket, getTickets, getTicketById, updateTicketStatus } from '../controllers/ticketController';
import { escalateTicket, resolveTicket } from '../controllers/escalationController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateTicketCreation, validateTicketUpdate, validateTicketEscalation } from '../middleware/validation';
import { Ticket } from '../models/Ticket';
import { createTestUser, createTestTicket, generateTestToken, TestUser } from './helpers';

const app = express();
app.use(express.json());

// Setup ticket routes with auth middleware
app.post('/tickets', authenticateToken, validateTicketCreation, createTicket);
app.get('/tickets', authenticateToken, getTickets);
app.get('/tickets/:id', authenticateToken, getTicketById);
app.put('/tickets/:id', authenticateToken, validateTicketUpdate, updateTicketStatus);
app.post('/tickets/:id/escalate', authenticateToken, authorizeRoles('L1', 'L2'), validateTicketEscalation, escalateTicket);
app.post('/tickets/:id/resolve', authenticateToken, authorizeRoles('L1', 'L2', 'L3'), resolveTicket);

describe('Ticket Controller', () => {
  let l1User: TestUser;
  let l2User: TestUser;
  let l3User: TestUser;
  let l1Token: string;
  let l2Token: string;
  let l3Token: string;

  beforeEach(async () => {
    // Create test users for different levels
    l1User = await createTestUser({
      username: 'l1user',
      email: 'l1@example.com',
      role: 'L1'
    });

    l2User = await createTestUser({
      username: 'l2user',
      email: 'l2@example.com',
      role: 'L2'
    });

    l3User = await createTestUser({
      username: 'l3user',
      email: 'l3@example.com',
      role: 'L3'
    });

    l1Token = generateTestToken(l1User);
    l2Token = generateTestToken(l2User);
    l3Token = generateTestToken(l3User);
  });

  describe('POST /tickets', () => {
    it('should create a ticket with valid L1 user', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        category: 'Software',
        priority: 'High',
        expectedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${l1Token}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket).toHaveProperty('_id');
      expect(response.body.data.ticket.title).toBe(ticketData.title);
      expect(response.body.data.ticket.currentLevel).toBe('L1');
      expect(response.body.data.ticket.status).toBe('New');
    });

    it('should reject ticket creation for non-L1 users', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        category: 'Software',
        priority: 'High',
        expectedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${l2Token}`)
        .send(ticketData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only L1 agents can create tickets');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${l1Token}`)
        .send({
          title: '', // Empty title
          description: '',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .post('/tickets')
        .send({
          title: 'Test Ticket',
          description: 'Test description',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tickets', () => {
    beforeEach(async () => {
      // Create some test tickets
      await createTestTicket(l1User.id, { title: 'Ticket 1', priority: 'High' });
      await createTestTicket(l1User.id, { title: 'Ticket 2', priority: 'Medium' });
      await createTestTicket(l1User.id, { title: 'Ticket 3', priority: 'Low' });
    });

    it('should get all tickets for authorized user', async () => {
      const response = await request(app)
        .get('/tickets')
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tickets');
      expect(Array.isArray(response.body.data.tickets)).toBe(true);
      expect(response.body.data.tickets.length).toBe(3);
    });

    it('should filter tickets by priority', async () => {
      const response = await request(app)
        .get('/tickets?priority=High')
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tickets.length).toBe(1);
      expect(response.body.data.tickets[0].priority).toBe('High');
    });

    it('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/tickets?status=New')
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tickets.length).toBe(3);
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .get('/tickets');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tickets/:id', () => {
    let testTicketId: string;

    beforeEach(async () => {
      const testTicket = await createTestTicket(l1User.id);
      testTicketId = String(testTicket._id);
    });

    it('should get ticket by id', async () => {
      const response = await request(app)
        .get(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket._id).toBe(testTicketId);
    });

    it('should return 404 for non-existent ticket', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/tickets/${nonExistentId}`)
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ticket id', async () => {
      const response = await request(app)
        .get('/tickets/invalid-id')
        .set('Authorization', `Bearer ${l1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /tickets/:id', () => {
    let testTicketId: string;

    beforeEach(async () => {
      const testTicket = await createTestTicket(l1User.id);
      testTicketId = String(testTicket._id);
    });

    it('should update ticket status', async () => {
      const updateData = {
        status: 'Attending',
        notes: 'Working on the issue'
      };

      const response = await request(app)
        .put(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.status).toBe('Attending');
    });

    it('should add action log when updating', async () => {
      const updateData = {
        status: 'Resolved',
        notes: 'Issue resolved'
      };

      const response = await request(app)
        .put(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.ticket.actionLogs.length).toBeGreaterThan(1);
    });
  });

  describe('POST /tickets/:id/escalate', () => {
    let testTicketId: string;

    beforeEach(async () => {
      const testTicket = await createTestTicket(l1User.id);
      testTicketId = String(testTicket._id);
    });

    it('should allow L1 user to escalate ticket to L2', async () => {
      const escalationData = {
        toLevel: 'L2',
        reason: 'Complex technical issue requiring L2 expertise',
        notes: 'Customer reported multiple system failures'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(escalationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.currentLevel).toBe('L2');
      expect(response.body.data.ticket.status).toBe('Escalated');
    });

    it('should allow L2 user to escalate C1/C2 tickets to L3', async () => {
      // First escalate to L2
      await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send({
          toLevel: 'L2',
          reason: 'Need L2 review'
        });

      // Set critical value as L2 user (this would normally be done through a separate endpoint)
      const ticket = await Ticket.findById(testTicketId);
      if (ticket) {
        ticket.criticalValue = 'C1';
        await ticket.save();
      }

      const escalationData = {
        toLevel: 'L3',
        reason: 'Critical issue requiring L3 intervention',
        notes: 'C1 critical issue needs immediate L3 attention'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l2Token}`)
        .send(escalationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.currentLevel).toBe('L3');
    });

    it('should reject L1 to L3 escalation', async () => {
      const escalationData = {
        toLevel: 'L3',
        reason: 'Trying to skip L2',
        notes: 'Invalid escalation path'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(escalationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L1 agents can only escalate to L2');
    });

    it('should reject L2 to L3 escalation for C3 tickets', async () => {
      // First escalate to L2
      await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send({
          toLevel: 'L2',
          reason: 'Need L2 review'
        });

      // Set critical value as C3
      const ticket = await Ticket.findById(testTicketId);
      if (ticket) {
        ticket.criticalValue = 'C3';
        await ticket.save();
      }

      const escalationData = {
        toLevel: 'L3',
        reason: 'Trying to escalate C3 ticket',
        notes: 'Should be rejected'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l2Token}`)
        .send(escalationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('C3 tickets cannot be escalated to L3');
    });

    it('should require valid escalation reason', async () => {
      const escalationData = {
        toLevel: 'L2',
        reason: '', // Empty reason should be rejected
        notes: 'Test escalation'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(escalationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject escalation for non-existent ticket', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const escalationData = {
        toLevel: 'L2',
        reason: 'Test escalation',
        notes: 'Should fail'
      };

      const response = await request(app)
        .post(`/tickets/${nonExistentId}/escalate`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(escalationData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized escalation attempts', async () => {
      const escalationData = {
        toLevel: 'L2',
        reason: 'Unauthorized escalation',
        notes: 'Should be rejected'
      };

      const response = await request(app)
        .post(`/tickets/${testTicketId}/escalate`)
        .send(escalationData); // No authorization header

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /tickets/:id/resolve', () => {
    let l1TicketId: string;
    let l2TicketId: string;
    let l3TicketId: string;

    beforeEach(async () => {
      // Create L1 level ticket
      const l1Ticket = await createTestTicket(l1User.id, {
        currentLevel: 'L1',
        status: 'Attending'
      });
      l1TicketId = String(l1Ticket._id);

      // Create L2 level ticket (escalated from L1)
      const l2Ticket = await createTestTicket(l1User.id, {
        currentLevel: 'L2',
        status: 'Attending'
      });
      l2TicketId = String(l2Ticket._id);

      // Create L3 level ticket (escalated from L2) with C1 critical value
      const l3Ticket = await createTestTicket(l1User.id, {
        currentLevel: 'L3',
        status: 'Attending',
        criticalValue: 'C1'
      });
      l3TicketId = String(l3Ticket._id);
    });

    it('should allow L1 user to resolve L1 level ticket', async () => {
      const resolveData = {
        resolution: 'Issue resolved by L1 agent'
      };

      const response = await request(app)
        .post(`/tickets/${l1TicketId}/resolve`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(resolveData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.status).toBe('Resolved');
      expect(response.body.message).toBe('Ticket resolved successfully');
    });

    it('should prevent L1 user from resolving L2 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L2 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l2TicketId}/resolve`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L1 agents can only resolve tickets at L1 level');
    });

    it('should prevent L1 user from resolving L3 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L3 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l3TicketId}/resolve`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L1 agents can only resolve tickets at L1 level');
    });

    it('should allow L2 user to resolve L2 level ticket', async () => {
      const resolveData = {
        resolution: 'Issue resolved by L2 agent'
      };

      const response = await request(app)
        .post(`/tickets/${l2TicketId}/resolve`)
        .set('Authorization', `Bearer ${l2Token}`)
        .send(resolveData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.status).toBe('Resolved');
      expect(response.body.message).toBe('Ticket resolved successfully');
    });

    it('should prevent L2 user from resolving L1 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L1 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l1TicketId}/resolve`)
        .set('Authorization', `Bearer ${l2Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L2 agents can only resolve tickets at L2 level');
    });

    it('should prevent L2 user from resolving L3 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L3 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l3TicketId}/resolve`)
        .set('Authorization', `Bearer ${l2Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L2 agents can only resolve tickets at L2 level');
    });

    it('should allow L3 user to resolve L3 level ticket', async () => {
      const resolveData = {
        resolution: 'Issue resolved by L3 agent'
      };

      const response = await request(app)
        .post(`/tickets/${l3TicketId}/resolve`)
        .set('Authorization', `Bearer ${l3Token}`)
        .send(resolveData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.status).toBe('Resolved');
      expect(response.body.message).toBe('Ticket resolved successfully');
    });

    it('should prevent L3 user from resolving L1 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L1 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l1TicketId}/resolve`)
        .set('Authorization', `Bearer ${l3Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L3 agents can only resolve tickets at L3 level');
    });

    it('should prevent L3 user from resolving L2 level ticket', async () => {
      const resolveData = {
        resolution: 'Attempting to resolve L2 ticket'
      };

      const response = await request(app)
        .post(`/tickets/${l2TicketId}/resolve`)
        .set('Authorization', `Bearer ${l3Token}`)
        .send(resolveData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('L3 agents can only resolve tickets at L3 level');
    });

    it('should reject resolve for non-existent ticket', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const resolveData = {
        resolution: 'Should fail'
      };

      const response = await request(app)
        .post(`/tickets/${nonExistentId}/resolve`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(resolveData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ticket not found');
    });

    it('should reject unauthorized resolve attempts', async () => {
      const resolveData = {
        resolution: 'Unauthorized resolve'
      };

      const response = await request(app)
        .post(`/tickets/${l1TicketId}/resolve`)
        .send(resolveData); // No authorization header

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should add action log when resolving ticket', async () => {
      const resolveData = {
        resolution: 'Ticket resolved with action log test'
      };

      const response = await request(app)
        .post(`/tickets/${l1TicketId}/resolve`)
        .set('Authorization', `Bearer ${l1Token}`)
        .send(resolveData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticket.actionLogs.length).toBeGreaterThan(0);
      
      const lastLog = response.body.data.ticket.actionLogs[response.body.data.ticket.actionLogs.length - 1];
      expect(lastLog.action).toBe('Ticket resolved');
      expect(lastLog.details).toContain(resolveData.resolution);
    });
  });
});