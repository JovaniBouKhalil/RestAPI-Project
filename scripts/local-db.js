import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

// This runs real MongoDB with persistent files in data/mongodb.
const dbPath = path.resolve('data/mongodb');
await mkdir(dbPath, { recursive: true });

try {
  const mongo = await MongoMemoryServer.create({
    binary: { version: '8.2.6' },
    instance: { port: 27017, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
  });
  console.log('MongoDB is ready at mongodb://127.0.0.1:27017');
  console.log(`Data is saved in ${dbPath}`);
  console.log('Keep this terminal open. Start the API in another terminal.');

  async function shutdown() {
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch {
  console.error('Could not start local MongoDB. Check port 27017 and your internet connection.');
  console.error('You can also use an installed MongoDB server or MongoDB Atlas; see README.md.');
  process.exitCode = 1;
}
