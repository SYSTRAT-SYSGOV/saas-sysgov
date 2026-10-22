import { describe, it, expect } from 'vitest';
import { resolveDefaultBaseUrl } from '@sysgov/sdk';

describe('resolveDefaultBaseUrl (SDK)', () => {
  it('usa o mesmo domínio da página em produção', () => {
    expect(resolveDefaultBaseUrl({ hostname: 'app.exemplo.gov.br', origin: 'https://app.exemplo.gov.br' })).toBe(
      'https://app.exemplo.gov.br/api',
    );
  });

  it('usa o backend local em desenvolvimento', () => {
    expect(resolveDefaultBaseUrl({ hostname: 'localhost', origin: 'http://localhost:5173' })).toBe('http://localhost:8000/api');
    expect(resolveDefaultBaseUrl({ hostname: '127.0.0.1', origin: 'http://127.0.0.1:5173' })).toBe('http://localhost:8000/api');
  });
});
