import mongoose from 'mongoose';

// Fail promptly if the database becomes unavailable.
mongoose.set('bufferCommands', false);

export async function connectDatabase(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
}
