import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ minhas: vi.fn(), coordenadores: vi.fn(), municipios: vi.fn() }));
const permissoes = vi.hoisted(() => ({ lista: new Set<string>() }));

vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), campanhaApi: api }));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: (p?: string) => (p ? permissoes.lista.has(p) : true) }) }));

import type { Campanha } from '../api';
import { ComCampanha, campanhaInicial } from './ComCampanha';
import { CoordenadoresCampanha } from './CoordenadoresCampanha';
import type { PropsAba } from '../ModuloCampanhaMain';

const campanha = (id: number, nome: string, urna: string | null = null): Campanha => ({
  id, nome, ano: 2026, cargo: 'Deputado Estadual', uf: 'PR', meta_votos_global: 0, status: 'ativa',
  candidato: urna ? { nome_urna: urna } as Campanha['candidato'] : null,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('sysgov_active_tenant_id', '1');
  permissoes.lista = new Set();
});

describe('Campanha de trabalho', () => {
  it('escolhe a lembrada, a única ou nenhuma', () => {
    const [a, b] = [campanha(1, 'A'), campanha(2, 'B')];
    expect(campanhaInicial([a, b], 2)).toBe(2);
    expect(campanhaInicial([a], null)).toBe(1);
    expect(campanhaInicial([a, b], 99)).toBeNull();
  });

  it('com várias campanhas pede a escolha e entra na escolhida', async () => {
    api.minhas.mockResolvedValue([campanha(1, 'Estadual', 'Ana Souza'), campanha(2, 'Federal', 'Bruno Dias')]);
    render(<ComCampanha>{({ campanha: c }) => <p>Trabalhando em {c.nome}</p>}</ComCampanha>);

    expect(await screen.findByText('Escolha a campanha de trabalho')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Entrar' })[1]);
    expect(await screen.findByText('Trabalhando em Federal')).toBeInTheDocument();
    expect(localStorage.getItem('sysgov_campanha_ativa:1')).toBe('2');
  });

  it('sem campanhas, só a gestão vê o botão de cadastrar', async () => {
    api.minhas.mockResolvedValue([]);
    const { unmount } = render(<ComCampanha>{() => null}</ComCampanha>);
    expect(await screen.findByText('Nenhuma campanha disponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar campanha' })).not.toBeInTheDocument();
    unmount();

    permissoes.lista = new Set(['campanha.gestao.manage']);
    render(<ComCampanha>{() => null}</ComCampanha>);
    expect(await screen.findByRole('button', { name: 'Cadastrar campanha' })).toBeInTheDocument();
  });
});

describe('Coordenadores', () => {
  const props = (equipes: boolean): PropsAba => ({
    campanha: { ...campanha(1, 'A'), cores: {} as PropsAba['campanha']['cores'], faixas: { faixas: [], cor_acima: '#000000' } },
    recarregarCampanha: vi.fn(), avisar: vi.fn(), abrirMunicipio: vi.fn(), versao: 0, alterou: vi.fn(),
    permissoes: { gestao: false, municipios: false, equipes, eleitoresVer: false, eleitoresGerir: false, demandas: false, materiais: false, financeiroVer: false, financeiroGerir: false, agenda: false, pesquisas: false },
    contexto: { campanhas: [], campanha: campanha(1, 'A'), escolher: vi.fn(), recarregarCampanhas: vi.fn() },
  });

  beforeEach(() => {
    api.coordenadores.mockResolvedValue([{ id: 5, nome: 'Carla Regional', tipo: 'regional', cpf_mascarado: '***.982.247-**', codigo_ibge: null, regiao: 'Norte', meta_votos: 8000, telefone: null, whatsapp: null, email: null, observacoes: null }]);
    api.municipios.mockResolvedValue([]);
  });

  it('Consulta vê a lista sem botões de escrita', async () => {
    render(<CoordenadoresCampanha {...props(false)} />);
    expect(await screen.findByText('Carla Regional')).toBeInTheDocument();
    expect(screen.getByText('CPF ***.982.247-**')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo coordenador|Editar|Excluir/ })).not.toBeInTheDocument();
  });

  it('equipe vê os botões', async () => {
    render(<CoordenadoresCampanha {...props(true)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Novo coordenador' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Editar Carla Regional' })).toBeInTheDocument();
  });
});
