const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing from environment variables');
  }

  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('MongoDB connected successfully');
}

module.exports = connectDB;

