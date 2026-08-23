export interface AppEnvConfig {
  APP_URL: string;
  API_URL: string;
  GEMINI_API_KEY?: string;
}

function getEnvVariable(name: string, fallback?: string): string {
  return import.meta.env[name] || fallback || '';
}

/**
 * Base das chamadas à API.
 *
 * - Vazio ('') = mesma origem (same-origin): o frontend e o backend são
 *   servidos sob o mesmo domínio (reverse proxy / Nginx), ideal para nuvem.
 * - Definida via VITE_API_URL em build time quando o backend fica em
 *   outro domínio/subdomínio (ex.: https://api.sgfiscal.com.br).
 */
const API_URL = getEnvVariable('VITE_API_URL', '');

/** Prefixa caminhos relativos com a base da API (idempotente para URLs absolutas). */
export function withApiBase(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path}`;
}

export const env: AppEnvConfig = {
  APP_URL: getEnvVariable('VITE_APP_URL', ''),
  API_URL,
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || undefined,
};

export default env;
