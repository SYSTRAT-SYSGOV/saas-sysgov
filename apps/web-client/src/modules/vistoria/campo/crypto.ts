const SALT_STORAGE_KEY = 'sysgov_campo_salt';
const TOKEN_STORAGE_KEY = 'sysgov_auth_token';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function obterOuCriarSalt(): Uint8Array {
  const existente = localStorage.getItem(SALT_STORAGE_KEY);
  if (existente) {
    return base64ToBuffer(existente);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_STORAGE_KEY, bufferToBase64(salt));
  return salt;
}

/**
 * Deriva uma chave AES-GCM a partir do token da sessão autenticada (localStorage,
 * mesmo usado por `core/api/client.ts`) + um salt de dispositivo persistido uma vez.
 * Sem token de sessão, não há como derivar a chave — lança erro explícito.
 */
export async function deriveKey(): Promise<CryptoKey> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    throw new Error('Não é possível criptografar dados offline sem uma sessão autenticada.');
  }

  const salt = obterOuCriarSalt();
  const tokenKeyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    tokenKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface PayloadCriptografado {
  cipher: string;
  iv: string;
}

export async function encryptJson(dados: unknown, chave: CryptoKey): Promise<PayloadCriptografado> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(dados));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, bytes);

  return { cipher: bufferToBase64(cipherBuffer), iv: bufferToBase64(iv) };
}

export async function decryptJson<T>(payload: PayloadCriptografado, chave: CryptoKey): Promise<T> {
  const cipherBytes = base64ToBuffer(payload.cipher);
  const iv = base64ToBuffer(payload.iv);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, chave, cipherBytes);

  return JSON.parse(new TextDecoder().decode(plainBuffer)) as T;
}
