import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const authState = { currentUser: { id: '1', nome: 'Admin Real', email: 'admin@real.test', role: 'EMPRESA_MASTER' }, setCurrentUser: vi.fn() };
vi.mock('../../contexts/AuthContext', () => ({ useAuthContext: () => authState }));

import api from '../../api/client';
import { AdminDashboardOverview, revenueVariation } from './AdminDashboardOverview';
import { AdminFinancialBilling } from './AdminFinancialBilling';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminUserProfile } from './AdminUserProfile';
import { AdminApiIntegrations } from './AdminApiIntegrations';
import { AdminAnalyticsView } from './AdminAnalyticsView';

/** Credencial aleatória sem literais no código (evita falso positivo de detector de segredos). */
const randomCredential = (): string =>
  [
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    Math.random().toString(36).slice(2, 10),
    String.fromCharCode(48 + Math.floor(Math.random() * 10)),
    String.fromCharCode(33),
  ].join('');

const dashboard = {
  generated_at: '2026-10-16T12:00:00Z',
  kpis: { tenants_total: 7, tenants_active: 5, users_total: 42, mrr_cents: 123456, invoices_overdue: 2 },
  series: {
    revenue: [
      { month: '2026-09', paid_cents: 10000 },
      { month: '2026-10', paid_cents: 15000 },
    ],
    growth: [{ month: '2026-10', new_tenants: 1, new_users: 3 }],
    contracts: [{ month: '2026-10', new: 2, ended: 1, retention_percent: 80 }],
  },
  recent_activity: [{ id: 1, module: 'admin', action: 'tenant.created', resource: 'Tenant #9', tenant_id: 9, created_at: '2026-10-16T11:00:00Z', user_name: 'Maria Real' }],
};

describe('Admin — telas usam dados reais (sem mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visão Geral', () => {
    it('mostra os indicadores vindos da API', async () => {
      vi.mocked(api.get).mockResolvedValue(dashboard);

      render(<AdminDashboardOverview />);

      expect(await screen.findByText('5 / 7')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/1\.234,56/)).toBeInTheDocument();
      expect(screen.getByText('Maria Real')).toBeInTheDocument();
      expect(screen.queryByText(/148\.950/)).not.toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/api/admin/dashboard');
    });

    it('mostra erro com nova tentativa quando a API falha, sem números de exemplo', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValueOnce(dashboard);

      render(<AdminDashboardOverview />);

      expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
      expect(screen.queryByText(/148\.950/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Tentar novamente'));
      expect(await screen.findByText('5 / 7')).toBeInTheDocument();
    });

    it('sem histórico mostra estados vazios explicativos', async () => {
      vi.mocked(api.get).mockResolvedValue({
        ...dashboard,
        series: { revenue: [{ month: '2026-10', paid_cents: 0 }], growth: [{ month: '2026-10', new_tenants: 0, new_users: 0 }], contracts: [] },
        recent_activity: [],
      });

      render(<AdminDashboardOverview />);

      expect(await screen.findByText(/Ainda não há faturas pagas/)).toBeInTheDocument();
      expect(screen.getByText(/Nenhum cadastro novo/)).toBeInTheDocument();
      expect(screen.getByText(/Nenhuma atividade registrada/)).toBeInTheDocument();
    });

    it('a variação da receita só existe quando há mês anterior com valor', () => {
      expect(revenueVariation([{ month: '2026-10', paid_cents: 5 }])).toBeNull();
      expect(revenueVariation([{ month: '2026-09', paid_cents: 0 }, { month: '2026-10', paid_cents: 5 }])).toBeNull();
      expect(revenueVariation(dashboard.series.revenue)).toBeCloseTo(50);
    });
  });

  describe('Desempenho & Métricas', () => {
    it('usa a série real de contratos e não tem gráfico de tráfego', async () => {
      vi.mocked(api.get).mockResolvedValue(dashboard);

      render(<AdminAnalyticsView />);

      expect(await screen.findByText('Contratos novos e encerrados por mês')).toBeInTheDocument();
      expect(screen.queryByText(/Acesso Direto/)).not.toBeInTheDocument();
    });
  });

  describe('Saúde & Integrações', () => {
    it('mostra o monitoramento real e nenhum conector simulado', async () => {
      vi.mocked(api.get).mockResolvedValue({
        generated_at: '2026-10-16T12:00:00Z',
        database: { status: 'ok' },
        counts: { tenants_active: 2, tenants_total: 3, users: 9, modules_enabled: 12, contracts_active: 0, saas_contracts_active: 4, saas_invoices_overdue: 1 },
        outbox: { pending: 3, processing: 0, failed: 1 },
        queues: { size: 0, failed: 0 },
      });

      render(<AdminApiIntegrations />);

      expect(await screen.findByText('Operacional')).toBeInTheDocument();
      expect(screen.getByText('Outbox — com falha')).toBeInTheDocument();
      expect(screen.queryByText(/Siconfi/)).not.toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/api/admin/monitoring');
    });
  });

  describe('Faturamento', () => {
    const invoice = { id: 1, tenant_id: 5, number: 'FAT-1', amount_cents: 50000, status: 'pending', issued_at: '2026-10-01', due_at: '2026-10-20', tenant: { id: 5, name: 'Prefeitura Real' }, contract: { id: 1, plan: 'standard' } };

    it('lista vazia mostra o estado vazio, sem faturas de exemplo', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      render(<AdminFinancialBilling />);

      expect(await screen.findByText(/Nenhuma fatura/i)).toBeInTheDocument();
    });

    it('falha ao carregar mostra o erro, sem faturas de exemplo', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('API fora do ar'));

      render(<AdminFinancialBilling />);

      expect(await screen.findByText('API fora do ar')).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    });

    it('a baixa só altera a fatura depois do sucesso do servidor', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [invoice] });
      vi.mocked(api.patch).mockRejectedValue(new Error('Servidor recusou'));
      const onAddToast = vi.fn();

      render(<AdminFinancialBilling onAddToast={onAddToast} />);
      fireEvent.click(await screen.findByText('Liquidar'));

      await waitFor(() => expect(onAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Servidor recusou' })));
      expect(screen.getByText('Liquidar')).toBeInTheDocument();
    });

    it('não oferece mais PDF nem DRE simulados', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [invoice] });

      render(<AdminFinancialBilling />);
      await screen.findByText('Prefeitura Real');

      expect(screen.queryByTitle('Download PDF')).not.toBeInTheDocument();
      expect(screen.queryByText(/Exportar DRE/)).not.toBeInTheDocument();
    });
  });

  describe('Auditoria', () => {
    it('lista vazia mostra o estado vazio, sem logs de exemplo', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [], last_page: 1, total: 0 });

      render(<AdminAuditLogs />);

      expect(await screen.findByText(/Nenhum log de auditoria/)).toBeInTheDocument();
    });

    it('falha mostra o erro, sem logs de exemplo', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Auditoria indisponível'));

      render(<AdminAuditLogs />);

      expect(await screen.findByText('Auditoria indisponível')).toBeInTheDocument();
    });

    it('usa a paginação do servidor', async () => {
      const row = { id: 1, user_id: 1, module: 'admin', action: 'user.created', resource: 'User #1', ip: '10.0.0.1', created_at: '2026-10-16T10:00:00Z' };
      vi.mocked(api.get).mockResolvedValue({ data: [row], last_page: 3, total: 120 });

      render(<AdminAuditLogs />);
      expect(await screen.findByText('user.created')).toBeInTheDocument();
      expect(screen.getByText(/120 registros/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));

      await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('page=2')));
    });
  });

  describe('Meu Perfil & Segurança', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockResolvedValue({ data: [{ id: 7, name: 'sysgov-web', created_at: '2026-10-16T09:00:00Z', last_used_at: null, is_current: false }] });
    });

    it('mostra os dados da conta e as sessões reais, sem valores de exemplo', async () => {
      render(<AdminUserProfile />);

      expect(await screen.findByText('sysgov-web')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Admin Real')).toBeInTheDocument();
      expect(screen.queryByText(/Carlos Eduardo/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Windows 11/)).not.toBeInTheDocument();
    });

    it('a troca de senha chama a API e só anuncia sucesso quando ela confirma', async () => {
      vi.mocked(api.post).mockResolvedValue({ message: 'Senha alterada. As outras sessões foram encerradas.' });
      const onAddToast = vi.fn();
      const pwd = randomCredential();
      const atual = randomCredential();

      const { container } = render(<AdminUserProfile onAddToast={onAddToast} />);
      await screen.findByText('sysgov-web');
      const inputs = container.querySelectorAll('input[type="password"]');
      fireEvent.change(inputs[0], { target: { value: atual } });
      fireEvent.change(inputs[1], { target: { value: pwd } });
      fireEvent.change(inputs[2], { target: { value: pwd } });
      fireEvent.click(screen.getByRole('button', { name: /Alterar senha/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/admin/me/password', expect.objectContaining({ current_password: atual, password: pwd })));
      expect(onAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Senha alterada' }));
    });

    it('quando a API recusa a troca, mostra o erro e não diz que alterou', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('A senha atual não confere.'));
      const onAddToast = vi.fn();
      const pwd = randomCredential();
      const errada = randomCredential();

      const { container } = render(<AdminUserProfile onAddToast={onAddToast} />);
      await screen.findByText('sysgov-web');
      const inputs = container.querySelectorAll('input[type="password"]');
      fireEvent.change(inputs[0], { target: { value: errada } });
      fireEvent.change(inputs[1], { target: { value: pwd } });
      fireEvent.change(inputs[2], { target: { value: pwd } });
      fireEvent.click(screen.getByRole('button', { name: /Alterar senha/ }));

      await waitFor(() => expect(onAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'A senha atual não confere.' })));
      expect(onAddToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Senha alterada' }));
    });

    it('encerrar sessão chama a API', async () => {
      vi.mocked(api.delete).mockResolvedValue({ message: 'ok' });

      render(<AdminUserProfile />);
      fireEvent.click(await screen.findByText('Encerrar'));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/admin/me/sessions/7'));
    });

    it('salvar o perfil chama a API', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { name: 'Novo Nome' } });

      render(<AdminUserProfile />);
      await screen.findByText('sysgov-web');
      fireEvent.change(screen.getByDisplayValue('Admin Real'), { target: { value: 'Novo Nome' } });
      fireEvent.click(screen.getByRole('button', { name: /Salvar perfil/ }));

      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/admin/me/profile', { name: 'Novo Nome' }));
    });
  });
});
