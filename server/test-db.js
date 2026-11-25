require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ ERROR: MONGO_URI is missing in server/.env');
  process.exit(1);
}

const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log(`🔍 Testing MongoDB connection to: ${maskedUri}`);

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB Atlas successfully!');
    console.log('Database name:', mongoose.connection.name || 'spendwise');
    console.log('Connection state: Connected (readyState = 1)');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ FAILED: Could not connect to MongoDB Atlas.');
    console.error('Error message:', err.message);
    if (err.message.includes('ENOTFOUND')) {
      console.error('\n👉 REASON: The cluster hostname in your connection string cannot be found.');
      console.error('   Make sure you copied the full cluster URL from MongoDB Atlas (e.g., cluster0.xxxxx.mongodb.net).');
    } else if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('\n👉 REASON: Database authentication failed (wrong username or password).');
      console.error('   Check the user credentials under "Database Access" in MongoDB Atlas.');
    } else if (err.message.includes('ETIMEDOUT') || err.message.includes('queryTxt ETIMEOUT') || err.message.includes('whitelist') || err.message.includes('timed out')) {
      console.error('\n👉 REASON: Network connection timed out / IP address blocked.');
      console.error('   Go to MongoDB Atlas -> Network Access -> Add IP Address -> Select "Allow Access from Anywhere" (0.0.0.0/0).');
    }
    process.exit(1);
  });
