import request from 'supertest';
import express from 'express';
import { login } from '../controllers/authController';
import { validateUserLogin } from '../middleware/validation';
import { User } from '../models/User';

// Set JWT_SECRET for testing
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

const app = express();
app.use(express.json());

// Setup auth routes with validation
app.post('/login', validateUserLogin, login);

describe('Auth Controller', () => {
  // Create test users before each test (since afterEach clears data)
  beforeEach(async () => {
    // Create the same users that would be in seeded data
    // Using User.create() so password hashing middleware runs
    await User.create({
      username: 'agent_l1',
      email: 'l1@helpdesk.com',
      password: 'password123',
      role: 'L1'
    });

    await User.create({
      username: 'support_l2',
      email: 'l2@helpdesk.com',
      password: 'password123',
      role: 'L2'
    });

    await User.create({
      username: 'advanced_l3',
      email: 'l3@helpdesk.com',
      password: 'password123',
      role: 'L3'
    });
  });

  describe('POST /login', () => {
  it('should login with valid L1 credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'l1@helpdesk.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.username).toBe('agent_l1');
    expect(response.body.data.user.role).toBe('L1');
  });

  it('should login with valid L2 credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'l2@helpdesk.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.username).toBe('support_l2');
    expect(response.body.data.user.role).toBe('L2');
  });

  it('should login with valid L3 credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'l3@helpdesk.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.username).toBe('advanced_l3');
    expect(response.body.data.user.role).toBe('L3');
  });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'l1@helpdesk.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: '',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});