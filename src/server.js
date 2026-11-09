import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT || 3000);
const dbUri = process.env.MONGODB_URI;

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  if (!dbUri || !/^mongodb(\+srv)?:\/\//.test(dbUri)) {
    throw new Error('Set MONGODB_URI in .env. See .env.example and README.md.');
  }

  // Start accepting requests only after the real database is connected.
  await connectDatabase(dbUri);
  console.log('Connected to MongoDB.');
  const server = createApp().listen(port, () => {
    console.log(`Notes API listening on http://localhost:${port}`);
  });

  server.on('error', async (err) => {
    console.error(err.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Change PORT in .env.`
      : 'Could not start the HTTP server.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });

  function shutdown() {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error(err.name === 'Error' ? err.message
    : 'Database connection failed. Check MongoDB, MONGODB_URI, and Atlas network access.');
  await mongoose.disconnect();
  process.exitCode = 1;
}
