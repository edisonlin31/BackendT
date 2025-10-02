import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk_db';
    
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('💡 Make sure MongoDB is running on your system');
    process.exit(1);
  }
};

export default connectDB;