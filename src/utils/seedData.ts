import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';

dotenv.config();

const seedData = async (): Promise<void> => {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk_db';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Ticket.deleteMany({});
    console.log('Cleared existing data');

    // Create sample users
    const users = [
      {
        username: 'agent_l1',
        email: 'l1@helpdesk.com',
        password: await bcrypt.hash('password123', 12),
        role: 'L1'
      },
      {
        username: 'support_l2',
        email: 'l2@helpdesk.com',
        password: await bcrypt.hash('password123', 12),
        role: 'L2'
      },
      {
        username: 'advanced_l3',
        email: 'l3@helpdesk.com',
        password: await bcrypt.hash('password123', 12),
        role: 'L3'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created sample users');

    // Create sample tickets
    const l1User = createdUsers.find(u => u.role === 'L1');
    const l2User = createdUsers.find(u => u.role === 'L2');

    if (l1User && l2User) {
      const tickets = [
        {
          title: 'Login Issue - User cannot access system',
          description: 'User reports inability to login to the system. Getting authentication error.',
          category: 'Authentication',
          priority: 'High',
          status: 'New',
          expectedCompletionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          createdBy: l1User._id,
          currentLevel: 'L1',
          actionLogs: [{
            action: 'Ticket created',
            performedBy: l1User._id,
            performedAt: new Date(),
            details: 'Initial ticket creation'
          }]
        },
        {
          title: 'Email Server Down',
          description: 'Email server is not responding. All users affected.',
          category: 'Infrastructure',
          priority: 'High',
          status: 'Escalated',
          criticalValue: 'C1',
          expectedCompletionDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          createdBy: l1User._id,
          currentLevel: 'L2',
          escalationHistory: [{
            fromLevel: 'L1',
            toLevel: 'L2',
            reason: 'Infrastructure issue requires L2 expertise',
            escalatedBy: l1User._id,
            escalatedAt: new Date(),
            notes: 'Critical system outage'
          }],
          actionLogs: [
            {
              action: 'Ticket created',
              performedBy: l1User._id,
              performedAt: new Date(),
              details: 'Critical infrastructure issue reported'
            },
            {
              action: 'Escalated to L2',
              performedBy: l1User._id,
              performedAt: new Date(),
              details: 'Requires infrastructure expertise'
            }
          ]
        },
        {
          title: 'Password Reset Request',
          description: 'User forgot password and needs reset.',
          category: 'User Management',
          priority: 'Low',
          status: 'Attending',
          expectedCompletionDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          createdBy: l1User._id,
          currentLevel: 'L1',
          actionLogs: [
            {
              action: 'Ticket created',
              performedBy: l1User._id,
              performedAt: new Date(),
              details: 'Password reset request'
            },
            {
              action: 'Status updated to Attending',
              performedBy: l1User._id,
              performedAt: new Date(),
              details: 'Starting password reset process'
            }
          ]
        }
      ];

      await Ticket.insertMany(tickets);
      console.log('Created sample tickets');
    }

    console.log('Seed data created successfully!');
    console.log('\nSample credentials:');
    console.log('L1 Agent: l1@helpdesk.com / password123');
    console.log('L2 Support: l2@helpdesk.com / password123');
    console.log('L3 Advanced: l3@helpdesk.com / password123');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run seeder
if (require.main === module) {
  seedData();
}

export default seedData;