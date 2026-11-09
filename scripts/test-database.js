import 'dotenv/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

export async function startTestDatabase() {
  const dbPath = await mkdtemp(path.join(tmpdir(), 'assignment6-test-'));
  const mongo = await MongoMemoryServer.create({
    binary: { version: '8.2.6' },
    instance: { ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
  });
  return { mongo, dbPath };
}

export async function removeTestDirectory(dbPath) {
  const target = path.resolve(dbPath);
  if (path.dirname(target) !== path.resolve(tmpdir())
    || !path.basename(target).startsWith('assignment6-test-')) {
    throw new Error('Refusing to remove a directory outside the test temporary folder.');
  }
  await rm(target, { recursive: true, force: true, maxRetries: 5 });
}
