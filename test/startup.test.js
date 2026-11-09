import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

async function startWith(env) {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, ...env },
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Server did not exit.')); }, 15000);
    child.on('error', reject);
    child.on('exit', (exitCode) => { clearTimeout(timeout); resolve(exitCode); });
  });
  return { code, output };
}

test('startup explains a missing MONGODB_URI and exits cleanly', async () => {
  const result = await startWith({ MONGODB_URI: '', PORT: '3000' });
  assert.equal(result.code, 1);
  assert.match(result.output, /Set MONGODB_URI/);
  assert.doesNotMatch(result.output, /listening|at file:/);
});

test('startup rejects an invalid port before listening', async () => {
  const result = await startWith({ MONGODB_URI: 'mongodb://127.0.0.1:27017/unused', PORT: 'abc' });
  assert.equal(result.code, 1);
  assert.match(result.output, /PORT must be/);
});

test('an unavailable database causes a clear startup error with no secret URI', async () => {
  const result = await startWith({ MONGODB_URI: 'mongodb://private:secret@127.0.0.1:1/unused', PORT: '3000' });
  assert.equal(result.code, 1);
  assert.match(result.output, /Database connection failed/);
  assert.doesNotMatch(result.output, /private:secret|listening|at file:/);
});
