import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const api = vi.hoisted(() => ({ getOrgTree: vi.fn(), getOrgUnitsFlat: vi.fn(), getOrgScope: vi.fn() }));
vi.mock('@sysgov/sdk', async (original) => ({ ...(await original<typeof import('@sysgov/sdk')>()), sysgovApi: api }));
vi.mock('@/core/tenant/useTenant', () => ({ useTenant: () => ({ tenant: { id: 1, name: 'Prefeitura de Teste' } }) }));
vi.mock('@/core/rbac/useCan', () => ({ useCan: () => ({ can: () => true }) }));

import { OrgChartModule } from './OrgChartModule';

const unidade = (id: number, nome: string, nivel: number, extra: Record<string, unknown> = {}) => ({
  id, tenant_id: 1, parent_id: nivel > 1 ? 1 : null, code: `U-${id}`, name: nome, acronym: null, type: 'secretaria', level: nivel, path: `/${id}`,
  is_active: true, users_count: 3, responsibles: [], children: [], ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  const raiz = unidade(1, 'Gabinete do Prefeito', 1, { responsibles: [{ id: 9, name: 'Maria Prefeita' }] });
  const filha = unidade(2, 'Secretaria de Educação', 2);
  const arvore = [{ ...raiz, children: [filha] }];
  api.getOrgTree.mockResolvedValue(arvore);
  api.getOrgUnitsFlat.mockResolvedValue([raiz, filha]);
  api.getOrgScope.mockResolvedValue(null);
});

describe('Organograma — visão em tabela (DataTable padrão)', () => {
  async function abrirTabela() {
    render(<OrgChartModule />);
    await screen.findAllByText('Gabinete do Prefeito');
    fireEvent.click(screen.getByRole('button', { name: /tabela/i }));
  }

  it('lista as unidades com nível, gestor e servidores, e exporta', async () => {
    await abrirTabela();
    expect(await screen.findByText('U-2')).toBeInTheDocument();
    expect(screen.getByText('Nível 2')).toBeInTheDocument();
    expect(screen.getByText('Maria Prefeita')).toBeInTheDocument();
    expect(screen.getByText('Não vinculado')).toBeInTheDocument();
    // Além dos exports de JSON/CSV da página, a grade traz o seu próprio botão de exportar.
    expect(screen.getAllByRole('button', { name: /exportar/i }).length).toBeGreaterThan(1);
  });

  it('a raiz não oferece "Mover"; as demais unidades, sim', async () => {
    await abrirTabela();
    await screen.findByText('U-2');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações de Gabinete do Prefeito' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Mover' })).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await acionarMenu(/Ações de Secretaria de Educação/, 'Mover');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
