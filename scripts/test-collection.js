import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { startTestDatabase, removeTestDirectory } from './test-database.js';

const collection = JSON.parse(await readFile('postman/Notes_API.postman_collection.json', 'utf8'));
let mongo;
let dbPath;
let server;
const transcript = [];
let assertions = 0;

function report(line) {
  transcript.push(line);
  console.log(line);
}

try {
  ({ mongo, dbPath } = await startTestDatabase());
  await connectDatabase(mongo.getUri('assignment6_collection'));
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const variables = new Map(collection.variable.map(({ key, value }) => [key, value]));
  variables.set('baseUrl', `http://127.0.0.1:${server.address().port}`);
  const substitute = (text) => text.replace(/{{(\w+)}}/g, (_, key) => variables.get(key) ?? '');

  report('Assignment 6 Postman collection: real disk-backed MongoDB');
  report(`Node ${process.version}; MongoDB 8.2.6; ${new Date().toISOString()}`);
  for (const item of collection.item) {
    const { method, header = [], body } = item.request;
    const url = substitute(item.request.url.raw);
    const response = await fetch(url, {
      method,
      headers: Object.fromEntries(header.map(({ key, value }) => [key, value])),
      body: body ? substitute(body.raw) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();

    // Run the synchronous pm.test scripts included in this collection.
    const pm = {
      response: {
        code: response.status,
        json: () => JSON.parse(text),
        text: () => text,
        headers: { get: (key) => response.headers.get(key) },
        to: { have: { status: (expected) => assert.equal(response.status, expected) } },
      },
      collectionVariables: {
        get: (key) => variables.get(key),
        set: (key, value) => variables.set(key, value),
      },
      test: (name, callback) => { callback(); assertions += 1; },
    };
    for (const event of item.event ?? []) {
      if (event.listen === 'test') {
        vm.runInNewContext(event.script.exec.join('\n'), { pm }, { timeout: 1000 });
      }
    }
    report(`PASS ${method} ${new URL(url).pathname}${new URL(url).search} -> ${response.status} | ${item.name}`);
  }
  report(`${collection.item.length} requests passed; ${assertions} assertions passed; 0 failures.`);
} catch (err) {
  report(`FAIL ${err.message}`);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop({ doCleanup: false });
  if (dbPath) await removeTestDirectory(dbPath);
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/collection-run.txt', `${transcript.join('\n')}\n`);
}
