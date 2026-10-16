import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { AdminTenantManagement } from './AdminTenantManagement';
import { adminApi } from '../../modules/admin/api';

vi.mock('../../modules/admin/api', () => ({
  adminApi: {
    getTenants: vi.fn(),
    getModules: vi.fn(),
  },
}));

const makeTenant = (id: number, name: string) => ({
  id,
  name,
  slug: `slug-${id}`,
  cnpj: '12345678000199',
  type: 'prefeitura',
  status: 'active',
  plan: 'basic',
  max_users: 10,
  storage_limit_mb: 100,
  monthly_fee_cents: 0,
  setup_fee_cents: 0,
  custom_domain_enabled: false,
  custom_domain_fee_cents: 0,
  created_at: '2026-01-15T00:00:00Z',
  mrr_cents: 1000,
  user_count: 2,
  modules: [],
});

const PAGE_1 = [makeTenant(1, 'Alfa Prefeitura'), makeTenant(2, 'Beta Prefeitura')];
const PAGE_2 = [makeTenant(3, 'Gama Prefeitura')];

const summary = { total: 3, active: 3, mrr_cents: 123400, user_count: 77 };

const mockPages = () => {
  vi.mocked(adminApi.getTenants).mockImplementation(async (params: any) => {
    const page = params?.page ?? 1;
    return {
      data: page === 1 ? PAGE_1 : PAGE_2,
      meta: { current_page: page, last_page: 2, per_page: params?.per_page ?? 25, total: 3, summary },
    } as any;
  });
};

const lastCall = () => {
  const calls = vi.mocked(adminApi.getTenants).mock.calls;
  return calls[calls.length - 1][0] as any;
};

// O setup global troca o localStorage por mocks vazios; aqui usamos um armazenamento em memória.
const store = new Map<string, string>();
const useMemoryStorage = () => {
  store.clear();
  vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => store.get(key) ?? null);
  vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
    store.set(key, String(value));
  });
};

describe('AdminTenantManagement — lista de tenants (cards/tabela, paginação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemoryStorage();
    vi.mocked(adminApi.getModules).mockResolvedValue([] as any);
    mockPages();
  });

  it('abre em cards por padrão e envia página 1 com o tamanho padrão', async () => {
    render(<AdminTenantManagement onAddToast={vi.fn()} />);

    expect(await screen.findByText('Alfa Prefeitura')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cards/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('table')).toBeNull();
    expect(lastCall()).toMatchObject({ page: 1, per_page: 25 });
  });

  it('alterna para a tabela e lembra a preferência', async () => {
    const { unmount } = render(<AdminTenantManagement onAddToast={vi.fn()} />);
    await screen.findByText('Alfa Prefeitura');

    fireEvent.click(screen.getByRole('button', { name: /Tabela/ }));

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText('Organização')).toBeTruthy();
    expect(store.get('sysgov_admin_tenants_view')).toBe('table');

    unmount();
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('cai em cards se o localStorage falhar', async () => {
    vi.mocked(window.localStorage.getItem).mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.mocked(window.localStorage.setItem).mockImplementation(() => {
      throw new Error('bloqueado');
    });
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    expect(await screen.findByText('Alfa Prefeitura')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();

    // alternar não pode quebrar mesmo sem storage
    fireEvent.click(screen.getByRole('button', { name: /Tabela/ }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('navega entre páginas nos cards', async () => {
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    await screen.findByText('Alfa Prefeitura');

    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));

    expect(await screen.findByText('Gama Prefeitura')).toBeTruthy();
    expect(lastCall()).toMatchObject({ page: 2 });
  });

  it('troca o tamanho da página e volta para a página 1', async () => {
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    await screen.findByText('Alfa Prefeitura');
    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    await screen.findByText('Gama Prefeitura');

    fireEvent.change(screen.getByLabelText('Tenants por página'), { target: { value: '50' } });

    await waitFor(() => expect(lastCall()).toMatchObject({ page: 1, per_page: 50 }));
  });

  it('ordena pelo servidor ao clicar no cabeçalho da tabela', async () => {
    store.set('sysgov_admin_tenants_view', 'table');
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    await screen.findByRole('table');

    const header = () => within(screen.getByRole('table')).getByRole('button', { name: 'Organização' });

    fireEvent.click(header());
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'name', direction: 'asc' }));

    fireEvent.click(header());
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'name', direction: 'desc' }));
  });

  it('mostra os indicadores do conjunto filtrado (meta.summary), não só da página', async () => {
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    await screen.findByText('Alfa Prefeitura');

    expect(screen.getByText(/1\.234,00/)).toBeTruthy();
    expect(screen.getByText('77')).toBeTruthy();
    expect(screen.getByText(/\/ 3 total/)).toBeTruthy();
  });

  it('mantém a seleção entre páginas e limpa ao mudar a busca', async () => {
    store.set('sysgov_admin_tenants_view', 'table');
    render(<AdminTenantManagement onAddToast={vi.fn()} />);
    const table = await screen.findByRole('table');

    fireEvent.click(within(table).getByLabelText('Selecionar Alfa Prefeitura'));
    expect(await screen.findByText(/1 tenant\(s\) selecionado\(s\)/)).toBeTruthy();

    // vai para a página 2 pelo controle de paginação da tabela
    fireEvent.click(screen.getByRole('button', { name: /Próxima|Next|›|>/ }));
    await screen.findByText('Gama Prefeitura');
    expect(screen.getByText(/1 tenant\(s\) selecionado\(s\)/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome/), { target: { value: 'gama' } });
    await waitFor(() => expect(screen.queryByText(/tenant\(s\) selecionado\(s\)/)).toBeNull());
    expect(lastCall()).toMatchObject({ page: 1, q: 'gama' });
  });
});
