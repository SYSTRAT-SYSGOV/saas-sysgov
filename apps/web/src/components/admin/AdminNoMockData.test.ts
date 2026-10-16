import { describe, it, expect } from 'vitest';

/**
 * Impede reintroduzir dados fictícios no web-admin: nenhum arquivo de produção pode importar
 * `adminMockData` nem usar o token de demonstração como reserva.
 */
describe('web-admin — sem dados fictícios', () => {
  const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const production = Object.entries(sources).filter(([path]) => !/\.test\.|\/test\//.test(path));

  it('encontra os arquivos de produção', () => {
    expect(production.length).toBeGreaterThan(20);
  });

  it('nenhum arquivo importa adminMockData', () => {
    const offenders = production.filter(([, code]) => /adminMockData/.test(code)).map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('nenhum arquivo usa o token de demonstração como credencial', () => {
    // Só o AuthContext cita o valor, para descartar sessões antigas guardadas no navegador.
    const offenders = production
      .filter(([, code]) => /universal-admin-session-token/.test(code))
      .map(([path]) => path)
      .filter((path) => !path.endsWith('/contexts/AuthContext.tsx'));
    expect(offenders).toEqual([]);
  });
});
