import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
if (changes.trim()) {
  console.error('Commit the finished project before packaging so the ZIP matches the repository.');
  process.exit(1);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (tracked.some((file) => /(^|\/)(node_modules|data|submission|\.git)(\/|$)/.test(file)
  || /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example'))) {
  console.error('Remove dependencies, local databases, and environment secrets from Git before packaging.');
  process.exit(1);
}

await mkdir('submission', { recursive: true });
const zipPath = path.resolve('submission/Assignment_6_REST_API_Project.zip');
execFileSync('git', [
  'archive', '--format=zip', '--prefix=RestAPI-Project/', `--output=${zipPath}`, 'HEAD',
]);
console.log(`Created ${zipPath}`);
console.log('The ZIP contains committed source, setup examples, documentation, and test evidence.');
