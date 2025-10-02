import { User } from '../models/User';

describe('Basic User Model Tests', () => {
  beforeEach(async () => {
    // Clear users before each test (handled by global setup)
    await User.deleteMany({});
  });

  it('should create a user with valid data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'L1' as const
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.password).not.toBe(userData.password); // Should be hashed
  });

  it('should require username', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      role: 'L1'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should require email', async () => {
    const user = new User({
      username: 'testuser',
      password: 'password123',
      role: 'L1'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should validate email format', async () => {
    const user = new User({
      username: 'testuser',
      email: 'invalid-email',
      password: 'password123',
      role: 'L1'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should require password', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      role: 'L1'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should enforce minimum password length', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: '123', // Too short
      role: 'L1'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should require role', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should validate role enum', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'INVALID_ROLE'
    };

    // Create user with invalid role to test validation
    const user = new User(userData);
    await expect(user.save()).rejects.toThrow();
  });

  it('should ensure unique username', async () => {
    const userData = {
      username: 'uniqueuser',
      email: 'first@example.com',
      password: 'password123',
      role: 'L1' as const
    };

    // Create first user
    const user1 = new User(userData);
    await user1.save();

    // Try to create second user with same username
    const duplicateUser = new User({
      username: 'uniqueuser',
      email: 'different@example.com',
      password: 'password123',
      role: 'L1'
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  it('should ensure unique email', async () => {
    const userData = {
      username: 'firstuser',
      email: 'unique@example.com',
      password: 'password123',
      role: 'L1' as const
    };

    // Create first user
    const user1 = new User(userData);
    await user1.save();

    // Try to create second user with same email
    const duplicateUser = new User({
      username: 'differentuser',
      email: 'unique@example.com',
      password: 'password123',
      role: 'L1'
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  it('should hash password before saving', async () => {
    const plainPassword = 'password123';
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: plainPassword,
      role: 'L1'
    });

    await user.save();
    expect(user.password).not.toBe(plainPassword);
    expect(user.password.length).toBeGreaterThan(20); // Hashed password is longer
  });
});