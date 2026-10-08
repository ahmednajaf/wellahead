import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const apiPort = process.env.PORT || '4178';
const uiPort = process.env.FRONTEND_PORT || '4175';
const children = [
  spawn(process.execPath, ['--watch', 'server/server.mjs'], { cwd: root, env: { ...process.env, PORT: apiPort }, stdio: 'inherit' }),
  spawn(process.execPath, ['frontend/node_modules/vite/bin/vite.js', 'frontend', '--host', '127.0.0.1', '--port', uiPort, '--strictPort'], { cwd: root, env: { ...process.env, API_ORIGIN: `http://127.0.0.1:${apiPort}` }, stdio: 'inherit' }),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
