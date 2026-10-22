const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose.
 * Uses MONGO_URI environment variable.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('[StitchSmart DB Error] MONGO_URI environment variable is not defined.');
    console.error('[StitchSmart DB Hint] Please set MONGO_URI in server/.env file.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    console.log(`[StitchSmart DB] MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`[StitchSmart DB] Database Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[StitchSmart DB Connection Error] ${error.message}`);
    console.error('[StitchSmart DB Hint] To fix this:');
    console.error('  1. If using local MongoDB: ensure the MongoDB service/mongod is running on port 27017.');
    console.error('  2. If using MongoDB Atlas: check your connection string in server/.env and ensure your IP is whitelisted (0.0.0.0/0).');
    return null;
  }
};

// Monitor ongoing connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[StitchSmart DB] MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[StitchSmart DB Error] Runtime error: ${err.message}`);
});

module.exports = connectDB;
