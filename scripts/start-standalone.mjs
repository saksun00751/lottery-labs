// `next start` is unsupported with `output: 'standalone'`. The standalone
// server does not serve `public/` or `.next/static` on its own, so copy them
// next to server.js and then launch it.
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const server = '.next/standalone/server.js';
if (!existsSync(server)) {
  console.error('Missing .next/standalone/server.js — run `npm run build` first.');
  process.exit(1);
}

if (existsSync('public')) cpSync('public', '.next/standalone/public', { recursive: true });
if (existsSync('.next/static')) {
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
}

const child = spawn(process.execPath, [server], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
