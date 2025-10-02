# Helpdesk Ticket System - Backend API

A comprehensive backend API for a helpdesk ticket management system with role-based access control and ticket escalation workflow.

> 📘 Test Documentation: See detailed backend test explanations in [`TEST_README.md`](./TEST_README.md).

## 🚀 Features

- **Role-Based Authentication**: L1, L2, L3 user roles with JWT tokens (login only)
- **User Management**: Users are pre-seeded via database seeding (no public registration)
- **Ticket Management**: Create, update, escalate, and resolve tickets
- **Escalation Workflow**: L1 → L2 → L3 with validation rules
- **Critical Value Assignment**: C1, C2, C3 classification for L2/L3 tickets
- **Action Logging**: Track all actions performed on tickets
- **Data Validation**: Comprehensive input validation and error handling
- **MongoDB Integration**: Robust data persistence with Mongoose

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: bcryptjs for password hashing

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🚀 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Update `env` file in the directory if needed, current basic configuration:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/helpdesk_db
   JWT_SECRET=your_jwt_secret_key_here_change_in_production
   JWT_EXPIRE=7d
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start MongoDB**:
   Make sure MongoDB is running on your system

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Seed Sample Data** (Required):
   ```bash
   npm run seed
   ```
   
   **Note**: User registration has been removed from the API. Users must be created through the seeding process.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/          # MongoDB models (User, Ticket)
│   ├── routes/          # API routes
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Utility functions & seeders
│   └── index.ts         # Application entry point
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Tickets
- `GET /api/tickets` - Get tickets (role-based filtering)
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket (L1 only)
- `PATCH /api/tickets/:id/status` - Update ticket status
- `POST /api/tickets/:id/escalate` - Escalate ticket
- `POST /api/tickets/:id/action-log` - Add action log
- `POST /api/tickets/:id/resolve` - Resolve ticket (L1, L2, L3)

### Utility
- `GET /api/health` - Health check endpoint

## 👥 User Roles & Permissions

### L1 - Helpdesk Agent
- Create new tickets
- Update ticket status (New → Attending → Completed)
- Start work and resolve tickets at L1 level
- Escalate unresolved tickets to L2
- View own tickets and tickets at L1 level

### L2 - Technical Support
- View escalated tickets from L1 and L3 tickets they assigned
- Start work and resolve tickets at L1, L2, and L3 levels
- Assign critical values (C1, C2, C3)
- Add action logs and resolution notes
- Escalate critical tickets (C1, C2) to L3
- C3 tickets cannot be escalated to L3

### L3 - Advanced Support
- Handle tickets at any level (L1, L2, L3)
- Start work and resolve tickets at all levels
- For L3 tickets: only critical escalated tickets (C1, C2)
- Cannot escalate further (highest level)

## 🔄 Ticket Workflow

```
L1: Create → Attend → Complete/Escalate
         ↓
L2: Assign Critical Value → Work → Complete/Escalate (C1,C2 only)
         ↓
L3: Final Resolution → Resolved
```

## 🧪 Sample Data

Run the seeder to create sample users and tickets:

```bash
npm run seed
```

**Sample Credentials**:
- L1 Agent: `l1@helpdesk.com / password123`
- L2 Support: `l2@helpdesk.com / password123`
- L3 Advanced: `l3@helpdesk.com / password123`

## 🛡️ Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive validation with express-validator
- **Role-Based Access**: Strict permission checks
- **Error Handling**: Secure error responses (no sensitive data leakage)

## 📊 Data Validation Rules

### Ticket Creation
- Title: Required, max 200 characters
- Description: Required, max 2000 characters
- Category: Required, max 100 characters
- Priority: Low/Medium/High
- Expected completion date: Must be future date

### User Login
- Email: Valid email format
- Password: Required

### Escalation Rules
- L1 can only escalate to L2
- L2 can only escalate to L3
- L3 cannot escalate (final level)
- Only C1 and C2 tickets can reach L3
- Critical value must be assigned before L2→L3 escalation

## 🔧 Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run seed` - Seed sample data
- `npm test` - Run test suite (requires seeded data)

**Note**: Tests depend on seeded data. Run `npm run seed` before running tests.

## 🐛 Error Handling

The API provides comprehensive error handling with structured responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Title is required", "Invalid email format"]
}
```

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a strong JWT secret
3. Configure MongoDB connection string
4. Set up proper CORS origins
5. Consider using PM2 for process management

## 🤝 Contributing

1. Follow TypeScript best practices
2. Maintain comprehensive error handling
3. Add validation for new endpoints
4. Update documentation for API changes

## 📄 License

This project is licensed under the ISC License.