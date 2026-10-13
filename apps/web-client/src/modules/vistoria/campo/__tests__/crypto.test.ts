import { describe, it, expect, beforeEach } from 'vitest';
import { deriveKey, encryptJson, decryptJson } from '../crypto';

describe('campo/crypto', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', 'token-de-teste-' + Math.random());
  });

  it('faz o round-trip de criptografia/descriptografia preservando os dados', async () => {
    const chave = await deriveKey();
    const original = { observacao: 'Tudo regular', latitude: -25.4284, itens: [1, 2, 3] };

    const payload = await encryptJson(original, chave);
    expect(payload.cipher).not.toContain('Tudo regular');

    const decifrado = await decryptJson<typeof original>(payload, chave);
    expect(decifrado).toEqual(original);
  });

  it('deriva a mesma chave para o mesmo token e salt, mas falha ao descriptografar com token diferente', async () => {
    const chaveA = await deriveKey();
    const payload = await encryptJson({ segredo: 'A' }, chaveA);

    localStorage.setItem('sysgov_auth_token', 'outro-token');
    const chaveB = await deriveKey();

    await expect(decryptJson(payload, chaveB)).rejects.toThrow();
  });

  it('lança erro explícito sem sessão autenticada', async () => {
    localStorage.clear();
    await expect(deriveKey()).rejects.toThrow('sessão autenticada');
  });
});
