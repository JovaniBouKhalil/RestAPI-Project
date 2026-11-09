import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const child = spawn(process.execPath, [
  '--test', '--test-concurrency=1', '--test-reporter=tap',
  'test/api.test.js', 'test/startup.test.js',
], {
  windowsHide: true,
  env: process.env,
});
let transcript = '';
child.stdout.on('data', (data) => { transcript += data; process.stdout.write(data); });
child.stderr.on('data', (data) => { transcript += data; process.stderr.write(data); });
child.on('error', (err) => { console.error(err.message); process.exitCode = 1; });
child.on('close', async (code) => {
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/automated-tests.txt', transcript);
  console.log('Saved docs/evidence/automated-tests.txt');
  process.exitCode = code ?? 1;
});
