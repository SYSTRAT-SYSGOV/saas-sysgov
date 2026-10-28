import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/core/api/client';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';

const tenantMock = vi.hoisted(() => ({ settings: { customLogoUrl: 'https://x.test/logo.png' as string | undefined } }));

vi.mock('@/core/auth/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Maria Souza', is_platform_admin: false },
    modules: ['pessoas', 'escola'],
    permissions: ['*'],
  }),
}));
vi.mock('@/core/tenant/useTenant', () => ({
  useTenant: () => ({ tenant: { name: 'Prefeitura de Araucária' }, settings: tenantMock.settings }),
}));
vi.mock('@/core/orgunit', () => ({
  useOrgUnit: () => ({ scopeInfo: { is_unrestricted: true }, unitList: [], activeUnit: null, orgTree: [], loading: false, hasMultipleUnits: false }),
}));

import { DashboardModule } from './DashboardModule';

const cartoes = [
  { key: 'unidades', label: 'Unidades', value: 12, caption: 'na estrutura organizacional', tone: 'blue' },
  { key: 'usuarios', label: 'Usuários', value: 1500, caption: 'ativos no órgão', tone: 'emerald' },
  { key: 'perfis', label: 'Perfis de acesso', value: 5, caption: 'cadastrados', tone: 'amber' },
  { key: 'modulos', label: 'Módulos ativos', value: 2, caption: 'contratados pelo órgão', tone: 'violet' },
];

const nomePessoas = MODULE_REGISTRY.pessoas.name;
const nomeEscola = MODULE_REGISTRY.escola.name;

const renderizar = () => render(<MemoryRouter><DashboardModule /></MemoryRouter>);

describe('DashboardModule (home do Cliente)', () => {
  beforeEach(() => {
    localStorage.clear();
    tenantMock.settings = { customLogoUrl: 'https://x.test/logo.png' };
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: cartoes } });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mostra o logo do tenant ao abrir', async () => {
    renderizar();
    expect(await screen.findByRole('img', { name: /Logo de Prefeitura de Araucária/ })).toHaveAttribute('src', 'https://x.test/logo.png');
  });

  it('sem logo cadastrado, mostra a inicial do órgão', async () => {
    tenantMock.settings = { customLogoUrl: undefined };
    renderizar();
    expect(await screen.findByTestId('logo-tenant-inicial')).toHaveTextContent('P');
  });

  it('mostra só os quatro cards básicos, sem cards por módulo nem grupos', async () => {
    renderizar();

    for (const c of cartoes) expect(await screen.findByText(c.label)).toBeInTheDocument();
    expect(screen.getByText('1.500')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/client/dashboard-summary');
    expect(screen.queryByText('Educação')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestão e documentos')).not.toBeInTheDocument();
  });

  it('avisa quando não consegue carregar os indicadores', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('falha'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os indicadores');
  });

  it('esconde os módulos disponíveis até clicar em Personalizar', async () => {
    renderizar();
    await screen.findByText('Unidades');

    expect(screen.queryByText('Módulos disponíveis')).not.toBeInTheDocument();
    expect(screen.queryByText(nomePessoas)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }));
    expect(screen.getByText('Módulos disponíveis')).toBeInTheDocument();
    expect(screen.getByText(nomePessoas)).toBeInTheDocument();
    expect(screen.getByText(nomeEscola)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Concluir edição/ }));
    expect(screen.queryByText('Módulos disponíveis')).not.toBeInTheDocument();
  });

  it('sem favoritos, o accordion só aparece no modo Personalizar', async () => {
    renderizar();
    await screen.findByText('Unidades');
    expect(screen.queryByRole('button', { name: /Favoritos/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }));
    expect(screen.getByRole('button', { name: /Favoritos/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Nenhum favorito ainda/)).toBeInTheDocument();
  });

  it('favoritos ficam num accordion aberto, que recolhe e abre', async () => {
    localStorage.setItem('sysgov:welcome:favorites', JSON.stringify(['pessoas']));
    renderizar();
    await waitFor(() => expect(screen.getByRole('button', { name: /Favoritos/ })).toHaveAttribute('aria-expanded', 'true'));
    expect(screen.getByText(nomePessoas)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }));
    expect(screen.queryByText(nomePessoas)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }));
    expect(screen.getByText(nomePessoas)).toBeInTheDocument();
  });

  it('favoritar um módulo no modo Personalizar o leva para o accordion', async () => {
    renderizar();
    await screen.findByText('Unidades');
    fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }));

    fireEvent.click(screen.getAllByTitle('Adicionar aos favoritos')[0]);

    expect(screen.getByText('(1 atalho(s))')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('sysgov:welcome:favorites') ?? '[]')).toHaveLength(1);
  });
});
