import { spawn } from 'node:child_process';

const args = ['--watch'];
// On Windows/macOS, watch source files so database writes do not restart Node.
if (process.platform === 'win32' || process.platform === 'darwin') {
  args.push('--watch-path=src');
}
args.push('src/server.js');

const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
child.on('error', (err) => { console.error(err.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
