import { describe, expect, it } from 'vitest';
import type { CotacaoItemPesquisaPreco } from '@sysgov/sdk';
import { descreverSaneamento, saneamentoEstatistico, valorReferenciaItem } from './precoReferencia';

function cotacao(valor: number): CotacaoItemPesquisaPreco {
  return { fonte: 'teste', valor_unitario: valor };
}

describe('valorReferenciaItem', () => {
  const cotacoes = [cotacao(100), cotacao(200), cotacao(300)];

  it('calcula menor valor', () => {
    expect(valorReferenciaItem(cotacoes, 'menor_valor')).toBe(100);
  });

  it('calcula média', () => {
    expect(valorReferenciaItem(cotacoes, 'media')).toBe(200);
  });

  it('calcula mediana', () => {
    expect(valorReferenciaItem(cotacoes, 'mediana')).toBe(200);
  });

  it('retorna null sem cotações válidas', () => {
    expect(valorReferenciaItem([cotacao(0)], 'media')).toBeNull();
  });

  it('média saneada cai para média simples com amostra pequena demais para sanear', () => {
    expect(valorReferenciaItem(cotacoes, 'media_saneada')).toBe(200);
  });

  it('média saneada remove outlier claro com amostra suficiente', () => {
    const comOutlier = [cotacao(100), cotacao(105), cotacao(98), cotacao(102), cotacao(5000)];
    const resultado = valorReferenciaItem(comOutlier, 'media_saneada');
    expect(resultado).not.toBeNull();
    expect(resultado as number).toBeLessThan(200);
  });
});

describe('saneamentoEstatistico', () => {
  it('não remove nada de uma amostra homogênea', () => {
    const resultado = saneamentoEstatistico([100, 102, 98, 101, 99]);
    expect(resultado.outliersRemovidos).toEqual([]);
    expect(resultado.valoresSaneados).toHaveLength(5);
  });

  it('remove o outlier até o CV% ficar abaixo do limiar', () => {
    const resultado = saneamentoEstatistico([100, 105, 98, 102, 5000]);
    expect(resultado.outliersRemovidos).toContain(5000);
    expect(resultado.valoresSaneados).not.toContain(5000);
    expect(resultado.cvPercentual).toBeLessThan(25);
  });

  it('não remove abaixo do mínimo de cotações', () => {
    const resultado = saneamentoEstatistico([100, 100, 5000]);
    expect(resultado.outliersRemovidos).toEqual([]);
    expect(resultado.valoresSaneados).toHaveLength(3);
  });
});

describe('descreverSaneamento', () => {
  it('retorna null com amostra pequena demais para sanear', () => {
    expect(descreverSaneamento([cotacao(100), cotacao(200), cotacao(300)])).toBeNull();
  });

  it('descreve CV% e outliers removidos com amostra suficiente', () => {
    const resultado = descreverSaneamento([cotacao(100), cotacao(105), cotacao(98), cotacao(102), cotacao(5000)]);
    expect(resultado).not.toBeNull();
    expect(resultado?.outliersRemovidos).toBe(1);
    expect(resultado?.cvPercentual).toBeLessThan(25);
  });
});
