/**
 * Script de inicialização completa do ambiente de desenvolvimento SYSGOV.
 * Ordem: 1) backend Laravel, 2) frontends admin + client.
 *
 * Uso: node scripts/start-dev.js
 * Ou:   npm run dev
 */
const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const API_DIR = path.resolve(__dirname, '..', 'apps', 'api');
const BACKEND_URL = 'http://localhost:8000/api/health';
const MAX_RETRIES = 30;
const POLL_INTERVAL = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePhpBinary() {
  if (process.env.PHP_BINARY && fs.existsSync(process.env.PHP_BINARY)) {
    return process.env.PHP_BINARY;
  }

  // Verificar se o comando "php" no PATH atual atende à versão mínima (>= 8.4)
  try {
    const out = execSync('php -r "echo PHP_VERSION;"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const [major, minor] = out.split('.').map(Number);
    if (major > 8 || (major === 8 && minor >= 4)) {
      return 'php';
    }
    console.log(`[dev]  PHP padrão no PATH é ${out} (requer >= 8.4). Buscando versão 8.4+ instalada...`);
  } catch {
    // php não encontrado no PATH
  }

  // Busca em instalações locais do Laragon
  const laragonPhpDir = 'C:\\laragon\\bin\\php';
  if (fs.existsSync(laragonPhpDir)) {
    try {
      const entries = fs.readdirSync(laragonPhpDir);
      const php84Entries = entries.filter((e) => e.startsWith('php-8.4')).sort().reverse();
      for (const dir of php84Entries) {
        const candidate = path.join(laragonPhpDir, dir, 'php.exe');
        if (fs.existsSync(candidate)) {
          console.log(`[dev]  Utilizando PHP 8.4 detectado: ${candidate}`);
          return candidate;
        }
      }
    } catch {
      // Falha ao ler diretório do Laragon
    }
  }

  return 'php';
}

async function waitForBackend(retries, isExited) {
  for (let i = 0; i < retries; i++) {
    if (isExited()) {
      return false;
    }
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
  const phpBin = resolvePhpBinary();
  const phpDir = path.isAbsolute(phpBin) ? path.dirname(phpBin) : null;
  const env = {
    ...process.env,
    ...(phpDir ? { PATH: `${phpDir}${path.delimiter}${process.env.PATH || ''}` } : {}),
  };

  console.log('[dev]  Iniciando backend Laravel (apps/api)...');
  const backend = spawn(phpBin, ['artisan', 'serve', '--host=localhost', '--port=8000'], {
    cwd: API_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  let hasBackendExited = false;
  backend.on('exit', (code) => {
    hasBackendExited = true;
    if (code !== 0 && code !== null) {
      console.error(`\n[dev]  Backend encerrou inesperadamente com código ${code}.`);
    }
  });

  backend.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) process.stdout.write('  ' + msg + '\n');
  });
  backend.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) process.stderr.write('  ' + msg + '\n');
  });

  const ready = await waitForBackend(MAX_RETRIES, () => hasBackendExited);
  if (!ready) {
    backend.kill();
    process.exit(1);
  }

  console.log('[dev]  Iniciando frontends (admin + client)...');
  const frontends = spawn('npm run dev:all', {
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