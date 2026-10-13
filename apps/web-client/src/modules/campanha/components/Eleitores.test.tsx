import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// O Checkbox do Radix mede o tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const api = vi.hoisted(() => ({ indicadoresEleitores: vi.fn(), eleitores: vi.fn(), municipios: vi.fn() }));
const publico = vi.hoisted(() => ({ formulario: vi.fn(), enviar: vi.fn() }));

vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), campanhaApi: api, cadastroPublicoApi: publico }));

import type { Campanha } from '../api';
import type { PropsAba } from '../ModuloCampanhaMain';
import { EleitoresCampanha } from './EleitoresCampanha';
import { CadastroApoioPage } from '../pages/CadastroApoioPage';

const campanha: Campanha = { id: 1, nome: 'A', ano: 2026, cargo: 'Deputado Estadual', uf: 'PR', meta_votos_global: 0, status: 'ativa', candidato: null };
const props = (eleitoresVer: boolean): PropsAba => ({
  campanha: { ...campanha, cores: {} as PropsAba['campanha']['cores'], faixas: { faixas: [], cor_acima: '#000000' } },
  recarregarCampanha: vi.fn(), avisar: vi.fn(), abrirMunicipio: vi.fn(), versao: 0, alterou: vi.fn(),
  permissoes: { gestao: false, municipios: false, equipes: false, eleitoresVer, eleitoresGerir: false, demandas: false, materiais: false, financeiroVer: false, financeiroGerir: false, agenda: false, pesquisas: false },
  contexto: { campanhas: [], campanha, escolher: vi.fn(), recarregarCampanhas: vi.fn() },
});

beforeEach(() => {
  vi.clearAllMocks();
  api.indicadoresEleitores.mockResolvedValue({ total: 3, com_localizacao: 2, ultimos_7_dias: 1, anonimizados: 0, por_municipio: [{ codigo_ibge: 4113700, municipio: 'Londrina', total: 2 }], por_responsavel: [{ tipo: 'cabo', id: 1, nome: 'Cabo João', total: 2 }] });
  api.municipios.mockResolvedValue([]);
  api.eleitores.mockResolvedValue({ eleitores: [{ id: 9, nome: 'Ana Souza', municipio: 'Londrina', bairro: 'Centro', whatsapp: '43999990001', responsavel: 'Cabo João', latitude: null, created_at: '2026-10-03T10:00:00Z', anonimizado_em: null }], total: 1, pagina: 1, por_pagina: 50 });
});

describe('Eleitores', () => {
  it('Consulta vê só os totais e a lista nem é pedida', async () => {
    render(<EleitoresCampanha {...props(false)} />);
    expect(await screen.findByText('Londrina')).toBeInTheDocument();
    expect(screen.getByText(/restritos à coordenação/)).toBeInTheDocument();
    expect(api.eleitores).not.toHaveBeenCalled();
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
  });

  it('coordenação vê a lista', async () => {
    render(<EleitoresCampanha {...props(true)} />);
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
  });
});

describe('Cadastro público de apoio', () => {
  const abrir = () => render(<MemoryRouter initialEntries={['/cadastro-apoio/ABCDEFGHIJKLMNOP']}><Routes><Route path="/cadastro-apoio/:codigo" element={<CadastroApoioPage />} /></Routes></MemoryRouter>);

  it('sem aceite o envio fica bloqueado', async () => {
    publico.formulario.mockResolvedValue({
      encontrado: true, ativo: true, campanha: { nome: 'A', cargo: 'Deputado Estadual', ano: 2026, uf: 'PR' }, candidato: { nome_urna: 'Ana Candidata', numero: '12345', partido: 'XYZ' },
      responsavel: 'Cabo João', termo: 'Termo de teste', termo_versao: 1, encarregado: { nome: null, contato: null }, municipios: [{ codigo_ibge: 4113700, nome: 'Londrina' }], iniciado_em: '1.x',
    });
    abrir();
    expect(await screen.findByRole('heading', { name: /Ana Candidata/ })).toBeInTheDocument();
    expect(screen.getByText('Termo de teste')).toBeInTheDocument();
    const enviar = screen.getByRole('button', { name: 'Enviar cadastro' });
    expect(enviar).toBeDisabled();
    fireEvent.submit(enviar.closest('form') as HTMLFormElement);
    expect(await screen.findByRole('alert')).toHaveTextContent('aceita o termo');
    expect(publico.enviar).not.toHaveBeenCalled();
  });

  it('link desativado mostra a mensagem', async () => {
    publico.formulario.mockResolvedValue({ encontrado: true, ativo: false, mensagem: 'Este link de cadastro não está mais ativo.', campanha: { nome: 'A', cargo: 'X', ano: 2026, uf: 'PR' }, candidato: null, responsavel: 'Cabo João' });
    abrir();
    expect(await screen.findByText('Este link de cadastro não está mais ativo.')).toBeInTheDocument();
  });
});
