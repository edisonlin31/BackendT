import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Set JWT_SECRET for all tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

declare global {
  var __MONGO_URI__: string;
  var __MONGO_DB_NAME__: string;
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  global.__MONGO_URI__ = mongoUri;
  await mongoose.connect(mongoUri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

afterEach(async () => {
  if (mongoose.connection.db) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});