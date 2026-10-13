import { describe, expect, it } from 'vitest';
import type { Faixas, PontoMapa, Situacao } from './api';
import { corDoMunicipio, dicaDoMunicipio, faixaDaMeta, formatarDecimos, formatarDocumento, formatarNumero, legenda, paraDecimos } from './formato';

const cores: Record<Situacao, string> = { sem_atuacao: '#94a3b8', em_andamento: '#3b82f6', consolidado: '#10b981', prioritario: '#f59e0b', risco: '#ef4444' };
const faixas: Faixas = { faixas: [{ limite: 100, cor: '#111111' }, { limite: 250, cor: '#222222' }], cor_acima: '#333333' };
const ponto = (extra: Partial<PontoMapa> = {}): PontoMapa => ({
  nome: 'Londrina', situacao: 'consolidado', meta_votos: 300, coordenador: 'Carla', prefeito: 'TIAGO AMARAL', partido_prefeito: 'PSD',
  vice: null, relacao_prefeito: 'aliado', cabos: 2, eleitores: 393986, ...extra,
});

describe('formato da Campanha', () => {
  it('classifica a meta nas faixas (sem meta, limites inclusivos, acima do último)', () => {
    expect(faixaDaMeta(0, faixas)).toBe(-1);
    expect(faixaDaMeta(100, faixas)).toBe(0);
    expect(faixaDaMeta(101, faixas)).toBe(1);
    expect(faixaDaMeta(300, faixas)).toBe(2);
  });

  it('pinta cada camada com as cores da campanha', () => {
    expect(corDoMunicipio(ponto(), 'situacao', cores, faixas)).toBe('#10b981');
    expect(corDoMunicipio(ponto({ relacao_prefeito: 'oposicao' }), 'apoio_prefeito', cores, faixas)).toBe('#ef4444');
    expect(corDoMunicipio(ponto({ relacao_prefeito: 'sem_informacao' }), 'apoio_prefeito', cores, faixas)).toBe('#94a3b8');
    expect(corDoMunicipio(ponto(), 'meta_votos', cores, faixas)).toBe('#333333');
    expect(corDoMunicipio(ponto({ meta_votos: 0 }), 'meta_votos', cores, faixas)).toBe('#94a3b8');
    expect(corDoMunicipio(undefined, 'situacao', cores, faixas)).toBe('#94a3b8');
  });

  it('monta a legenda das faixas e a dica de cada camada', () => {
    expect(legenda('meta_votos', cores, faixas).map((l) => l.rotulo)).toEqual(['Sem meta', 'Até 100', '101 a 250', 'Acima de 250']);
    expect(legenda('apoio_prefeito', cores, faixas)).toHaveLength(4);
    expect(dicaDoMunicipio(ponto(), 'apoio_prefeito')).toEqual(['Prefeito: TIAGO AMARAL (PSD)', 'Relação: Aliado']);
    expect(dicaDoMunicipio(ponto(), 'meta_votos')[0]).toBe('Meta de votos: 300');
    expect(formatarNumero(1410995)).toBe('1.410.995');
  });
});

describe('percentuais em décimos', () => {
  it('converte e formata sem float', () => {
    expect(paraDecimos('14,5')).toBe(145);
    expect(paraDecimos('8')).toBe(80);
    expect(paraDecimos('100')).toBe(1000);
    expect(paraDecimos('100,1')).toBeNull();
    expect(paraDecimos('1,25')).toBeNull();
    expect(paraDecimos('abc')).toBeNull();
    expect(formatarDecimos(145)).toBe('14,5%');
    expect(formatarDecimos(80)).toBe('8,0%');
  });
});

describe('documento', () => {
  it('mascara CPF e CNPJ', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarDocumento(null)).toBe('—');
  });
});
