/**
 * Script de inicialização completa do ambiente de desenvolvimento SYSGOV.
 * Ordem: 1) backend Laravel, 2) frontends admin + client.
 *
 * Uso: node scripts/start-dev.js
 * Ou:   npm run dev
 */
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const API_DIR = path.resolve(__dirname, '..', 'apps', 'api');
const BACKEND_URL = 'http://localhost:8000/api/health';
const MAX_RETRIES = 30;
const POLL_INTERVAL = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackend(retries) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(BACKEND_URL, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log('[dev]  Backend pronto (localhost:8000)');
      return true;
    } catch {
      process.stdout.write('.');
      await sleep(POLL_INTERVAL);
    }
  }
  console.error('\n[dev]  ERRO: Backend não iniciou após ' + (retries * POLL_INTERVAL / 1000) + 's');
  return false;
}

async function startDev() {
  console.log('[dev]  Iniciando backend Laravel (apps/api)...');
  const backend = spawn('php', ['artisan', 'serve', '--host=localhost', '--port=8000'], {
    cwd: API_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  backend.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) process.stdout.write('  ' + msg + '\n');
  });
  backend.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) process.stderr.write('  ' + msg + '\n');
  });

  const ready = await waitForBackend(MAX_RETRIES);
  if (!ready) {
    backend.kill();
    process.exit(1);
  }

  console.log('[dev]  Iniciando frontends (admin + client)...');
  const frontends = spawn('npm', ['run', 'dev:all'], {
    stdio: 'inherit',
    shell: true,
  });

  frontends.on('close', (code) => {
    backend.kill();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    backend.kill();
    frontends.kill();
    process.exit(0);
  });
}

startDev().catch((err) => {
  console.error('[dev]  Erro fatal:', err);
  process.exit(1);
});