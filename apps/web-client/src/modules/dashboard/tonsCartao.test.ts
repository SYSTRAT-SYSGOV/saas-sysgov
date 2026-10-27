import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TONS_CARTAO, tomCartao } from './tonsCartao';

describe('tonsCartao', () => {
  it('cada cartão da API tem uma cor própria e conhecida', () => {
    const fonte = readFileSync(
      resolve(__dirname, '../../../../api/Modules/Client/Services/DashboardSummaryService.php'),
      'utf-8',
    );
    const tons = [...fonte.matchAll(/'tone' => '([a-z]+)'/g)].map((m) => m[1]);

    expect(tons.length).toBeGreaterThan(5);
    expect(new Set(tons).size).toBe(tons.length);
    for (const tom of tons) expect(TONS_CARTAO[tom], `tom sem mapeamento: ${tom}`).toBeDefined();
  });

  it('tom desconhecido cai no azul em vez de quebrar', () => {
    expect(tomCartao('inexistente')).toBe(TONS_CARTAO.blue);
    expect(tomCartao(undefined)).toBe(TONS_CARTAO.blue);
  });
});
