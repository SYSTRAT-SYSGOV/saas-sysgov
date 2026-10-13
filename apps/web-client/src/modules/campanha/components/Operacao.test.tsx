import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// O Checkbox/Switch do Radix mede o tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const api = vi.hoisted(() => ({ materiais: vi.fn(), remessas: vi.fn(), coordenadores: vi.fn(), cabos: vi.fn(), municipios: vi.fn() }));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), campanhaApi: api }));

import type { Campanha } from '../api';
import { abasVisiveis, type Permissoes, type PropsAba } from '../ModuloCampanhaMain';
import { MateriaisCampanha, valorUnitario } from './MateriaisCampanha';
import { conferirResultados } from './PesquisasCampanha';

const nenhuma: Permissoes = { gestao: false, municipios: false, equipes: false, eleitoresVer: false, eleitoresGerir: false, demandas: false, materiais: false, financeiroVer: false, financeiroGerir: false, agenda: false, pesquisas: false };
const campanha: Campanha = { id: 1, nome: 'A', ano: 2026, cargo: 'Deputado Estadual', uf: 'PR', meta_votos_global: 0, status: 'ativa', candidato: null };
const props = (p: Partial<Permissoes>): PropsAba => ({
  campanha: { ...campanha, cores: {} as PropsAba['campanha']['cores'], faixas: { faixas: [], cor_acima: '#000000' } },
  recarregarCampanha: vi.fn(), avisar: vi.fn(), abrirMunicipio: vi.fn(), versao: 0, alterou: vi.fn(),
  permissoes: { ...nenhuma, ...p }, contexto: { campanhas: [], campanha, escolher: vi.fn(), recarregarCampanhas: vi.fn() },
});

beforeEach(() => {
  vi.clearAllMocks();
  api.materiais.mockResolvedValue([{ id: 1, tipo: 'santinho', nome: 'Santinho 7x10', fornecedor: null, unidade: 'unidades', quantidade_produzida: 10000, valor_total_centavos: 35000, peso_kg: null, volume_m3: null, observacoes: null, tem_imagem: false, enviado: 5500, estoque: 4500 }]);
  api.remessas.mockResolvedValue([]);
  api.coordenadores.mockResolvedValue([]);
  api.cabos.mockResolvedValue([]);
  api.municipios.mockResolvedValue([]);
});

describe('Abas por permissão', () => {
  it('Coordenação não vê o Financeiro; o perfil Financeiro vê', () => {
    const coordenacao = abasVisiveis({ ...nenhuma, materiais: true, agenda: true, pesquisas: true, eleitoresGerir: true }).map((a) => a.id);
    expect(coordenacao).not.toContain('financeiro');
    expect(coordenacao).toEqual(expect.arrayContaining(['materiais', 'agenda', 'pesquisas', 'captacao']));
    expect(abasVisiveis({ ...nenhuma, financeiroVer: true }).map((a) => a.id)).toContain('financeiro');
  });
});

describe('Materiais', () => {
  it('mostra o estoque e o unitário derivado do lote', async () => {
    render(<MateriaisCampanha {...props({})} />);
    expect(await screen.findByText('Santinho 7x10')).toBeInTheDocument();
    expect(screen.getByText('4.500 unidades')).toBeInTheDocument();
    expect(valorUnitario(35000, 10000)).toBe('R$ 0,035');
    expect(screen.queryByRole('button', { name: 'Cadastrar material' })).not.toBeInTheDocument();
  });

  it('a opção de despesa automática só aparece para quem tem o financeiro', async () => {
    const { unmount } = render(<MateriaisCampanha {...props({ materiais: true })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cadastrar material' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/Lançar a despesa no financeiro/)).not.toBeInTheDocument();
    unmount();

    render(<MateriaisCampanha {...props({ materiais: true, financeiroGerir: true })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cadastrar material' }));
    expect(await screen.findByText(/Lançar a despesa no financeiro/)).toBeInTheDocument();
  });
});

describe('Pesquisas', () => {
  const linha = (nome: string, percentual: string, da_campanha = false) => ({ nome, partido: '', percentual, da_campanha });

  it('avisa a soma acima de 100% antes de enviar', () => {
    expect(conferirResultados([linha('A', '54'), linha('B', '50')]).erro).toBe('A soma dos percentuais (104,0%) passa de 100%.');
    expect(conferirResultados([linha('A', '14,5', true), linha('B', '30')])).toEqual({ soma: 445, erro: null });
    expect(conferirResultados([linha('A', '10', true), linha('B', '10', true)]).erro).toBe('Marque só um candidato como o da campanha.');
    expect(conferirResultados([linha('A', 'x')]).erro).toBe('Percentual inválido para A.');
  });
});
