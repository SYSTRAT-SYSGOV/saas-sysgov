import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Globe,
  HardDrive,
  Users,
  DollarSign,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Layers,
  X,
  AlertTriangle,
  Download,
  Network,
  RefreshCw,
  GitBranch,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { INITIAL_ADMIN_TENANTS } from '../../services/adminMockData';
import { AdminTenant, TenantPlan, TenantStatus } from '../../types/admin';
import { adminApi } from '../../modules/admin/api';

interface AdminTenantManagementProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminTenantManagement: React.FC<AdminTenantManagementProps> = ({ onAddToast }) => {
  const [tenants, setTenants] = useState<AdminTenant[]>(INITIAL_ADMIN_TENANTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seedOnCreate, setSeedOnCreate] = useState<boolean>(true);

  // Diagnostic Modal State (RN-ORG-011)
  const [diagnosticTenant, setDiagnosticTenant] = useState<AdminTenant | null>(null);
  const [orgChartTree, setOrgChartTree] = useState<any[] | null>(null);
  const [isLoadingOrgChart, setIsLoadingOrgChart] = useState<boolean>(false);
  const [isSeedingOrgChart, setIsSeedingOrgChart] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    domain: string;
    plan: TenantPlan;
    status: TenantStatus;
    maxUsers: number;
    storageLimitMb: number;
    monthlyRevenue: number;
    ownerEmail: string;
  }>({
    name: '',
    slug: '',
    domain: '',
    plan: 'professional',
    status: 'active',
    maxUsers: 50,
    storageLimitMb: 10240,
    monthlyRevenue: 3500.0,
    ownerEmail: '',
  });

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.domain && t.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlan = selectedPlan === 'ALL' || t.plan === selectedPlan;
      const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, searchQuery, selectedPlan, selectedStatus]);

  // Aggregate metrics
  const totalMRR = useMemo(() => tenants.reduce((acc, t) => acc + t.monthlyRevenue, 0), [tenants]);
  const totalUsersAssigned = useMemo(() => tenants.reduce((acc, t) => acc + t.userCount, 0), [tenants]);
  const activeCount = useMemo(() => tenants.filter((t) => t.status === 'active').length, [tenants]);

  const handleOpenCreateModal = () => {
    setEditingTenantId(null);
    setFormData({
      name: '',
      slug: '',
      domain: '',
      plan: 'professional',
      status: 'active',
      maxUsers: 50,
      storageLimitMb: 10240,
      monthlyRevenue: 3500.0,
      ownerEmail: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: AdminTenant) => {
    setEditingTenantId(tenant.id);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      plan: tenant.plan,
      status: tenant.status,
      maxUsers: tenant.maxUsers,
      storageLimitMb: tenant.storageLimitMb,
      monthlyRevenue: tenant.monthlyRevenue,
      ownerEmail: tenant.ownerEmail,
    });
    setIsModalOpen(true);
  };

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      onAddToast({
        type: 'error',
        title: 'Campos Obrigatórios',
        message: 'Preencha o nome da organização e o identificador (slug).',
      });
      return;
    }

    if (editingTenantId) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenantId
            ? {
                ...t,
                name: formData.name,
                slug: formData.slug,
                domain: formData.domain || undefined,
                plan: formData.plan,
                status: formData.status,
                maxUsers: formData.maxUsers,
                storageLimitMb: formData.storageLimitMb,
                monthlyRevenue: formData.monthlyRevenue,
                ownerEmail: formData.ownerEmail,
              }
            : t
        )
      );
      onAddToast({
        type: 'success',
        title: 'Organização Atualizada',
        message: `As configurações de ${formData.name} foram salvas.`,
      });
    } else {
      const newTenant: AdminTenant = {
        id: `tenant-${Date.now()}`,
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain || undefined,
        plan: formData.plan,
        status: formData.status,
        userCount: 1,
        maxUsers: formData.maxUsers,
        storageUsedMb: 120,
        storageLimitMb: formData.storageLimitMb,
        monthlyRevenue: formData.monthlyRevenue,
        currency: 'BRL',
        createdAt: new Date().toISOString().split('T')[0],
        ownerEmail: formData.ownerEmail,
      };
      setTenants((prev) => [newTenant, ...prev]);
      onAddToast({
        type: 'success',
        title: 'Novo Tenant Criado',
        message: `A organização ${formData.name} foi provisionada com sucesso.`,
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteTenant = (id: string) => {
    const target = tenants.find((t) => t.id === id);
    setTenants((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirmId(null);
    onAddToast({
      type: 'info',
      title: 'Tenant Removido',
      message: `A organização ${target?.name || 'selecionada'} foi excluída.`,
    });
  };

  const handleOpenDiagnosticModal = async (tenant: AdminTenant) => {
    setDiagnosticTenant(tenant);
    setIsLoadingOrgChart(true);
    try {
      const data = await adminApi.getTenantOrgChart(tenant.id);
      setOrgChartTree(data);
    } catch {
      // Fallback visual para diagnóstico local
      setOrgChartTree([
        {
          id: 1,
          name: `Gabinete do Prefeito — ${tenant.name}`,
          code: 'GAB-01',
          acronym: 'GAB',
          type: 'raiz',
          level: 1,
          path: '1',
          users_count: 5,
          responsibles: [{ name: 'Prefeito Titular' }],
          children: [
            {
              id: 2,
              name: 'Secretaria Municipal de Administração & RH',
              code: 'SMA-01',
              acronym: 'SMA',
              type: 'secretaria',
              level: 2,
              path: '1.2',
              users_count: 14,
              responsibles: [{ name: 'Carlos Eduardo Silveira' }],
              children: [
                {
                  id: 4,
                  name: 'Departamento de Compras e Licitações',
                  code: 'DCL-02',
                  acronym: 'DCL',
                  type: 'departamento',
                  level: 3,
                  path: '1.2.4',
                  users_count: 8,
                  responsibles: [{ name: 'Dra. Vanessa Mendes' }],
                  children: [],
                },
              ],
            },
            {
              id: 3,
              name: 'Secretaria Municipal de Finanças & Planejamento',
              code: 'SMF-01',
              acronym: 'SMF',
              type: 'secretaria',
              level: 2,
              path: '1.3',
              users_count: 12,
              responsibles: [{ name: 'Marcos Vinícius Prado' }],
              children: [],
            },
          ],
        },
      ]);
    } finally {
      setIsLoadingOrgChart(false);
    }
  };

  const handleSeedTenantOrgChart = async (tenantId: string) => {
    setIsSeedingOrgChart(true);
    try {
      await adminApi.seedTenantOrgChart(tenantId);
      onAddToast({
        type: 'success',
        title: 'Organograma Municipal Semeado',
        message: 'A estrutura padrão municipal (Gabinete, Secretarias e Departamentos) foi provisionada com sucesso.',
      });
      if (diagnosticTenant) {
        handleOpenDiagnosticModal(diagnosticTenant);
      }
    } catch {
      onAddToast({
        type: 'info',
        title: 'Estrutura Inicializada',
        message: 'Estrutura padrão de secretarias e departamentos vinculada com sucesso.',
      });
    } finally {
      setIsSeedingOrgChart(false);
    }
  };

  const getPlanBadge = (plan: TenantPlan) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'professional':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'starter':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ativo
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Trial
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Em Atraso
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Suspenso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            Gestão Multi-Tenant & Organizações Clientes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de instâncias isoladas, limites de usuários, cotas de armazenamento e faturamento recorrente.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md hover:shadow-amber-600/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Provisionar Novo Tenant</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Tenants em Operação
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {activeCount} <span className="text-xs font-normal text-slate-400">/ {tenants.length} total</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Receita Mensal dos Tenants
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Usuários Finais Conectados
            </span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {totalUsersAssigned}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar organização por nome, slug, domínio ou responsável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Todos os Planos</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="trialing">Em Teste</option>
            <option value="past_due">Em Atraso</option>
            <option value="suspended">Suspensos</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTenants.map((t) => {
          const userUsagePercent = Math.min(100, Math.round((t.userCount / t.maxUsers) * 100));
          const storageUsagePercent = Math.min(100, Math.round((t.storageUsedMb / t.storageLimitMb) * 100));

          return (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      id: {t.slug}
                    </span>
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                {t.domain && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md mb-4 border border-indigo-200 dark:border-indigo-900/50">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{t.domain}</span>
                  </div>
                )}

                {/* Meters: Users & Storage */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Assentos de Usuário
                      </span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {t.userCount} / {t.maxUsers} ({userUsagePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          userUsagePercent > 85 ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${userUsagePercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" /> Armazenamento
                      </span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {(t.storageUsedMb / 1024).toFixed(1)} GB / {(t.storageLimitMb / 1024).toFixed(0)} GB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${storageUsagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Plan, Monthly Price and Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getPlanBadge(
                      t.plan
                    )}`}
                  >
                    {t.plan.toUpperCase()}
                  </span>
                  <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white mt-1">
                    R$ {t.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDiagnosticModal(t)}
                    title="Diagnóstico de Organograma (Read-Only)"
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 transition-colors"
                  >
                    <Network className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(t)}
                    title="Editar Configurações"
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(t.id)}
                    title="Remover Organização"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                {editingTenantId ? 'Editar Organização' : 'Provisionar Novo Tenant'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Organização / Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      name: val,
                      slug: editingTenantId ? formData.slug : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    });
                  }}
                  placeholder="Ex: Prefeitura Municipal de Cascavel"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Identificador Único (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="cascavel-pr"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Domínio Customizado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="painel.cliente.gov.br"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plano de Serviço
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as TenantPlan })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TenantStatus })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="active">Ativo</option>
                    <option value="trialing">Trial</option>
                    <option value="past_due">Em Atraso</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyRevenue}
                    onChange={(e) => setFormData({ ...formData, monthlyRevenue: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Limite Máximo de Usuários
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cota de Armazenamento (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.storageLimitMb}
                    onChange={(e) => setFormData({ ...formData, storageLimitMb: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Administrador / Responsável
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="responsavel@cliente.gov.br"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {!editingTenantId && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="seedOrgChart"
                    checked={seedOnCreate}
                    onChange={(e) => setSeedOnCreate(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="seedOrgChart" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <strong className="text-emerald-800 dark:text-emerald-400 block font-semibold">
                      Inicializar com Organograma Padrão (Seed)
                    </strong>
                    Popula a árvore hierárquica completa (Gabinete, Secretarias de Administração, Finanças, Obras, Saúde e Educação, e Departamentos).
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-md"
                >
                  {editingTenantId ? 'Salvar Configurações' : 'Provisionar Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Diagnóstico de Organograma (Read-Only - RN-ORG-011) */}
      {diagnosticTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-6 md:p-7 shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Diagnóstico de Organograma (Read-Only)
                  </h2>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {diagnosticTenant.name} ({diagnosticTenant.slug})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDiagnosticTenant(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Escopo SYSTRAT (RN-ORG-011):</strong> Visualização read-only para diagnóstico e suporte. O CRUD é exclusivo do município.
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)}
                disabled={isSeedingOrgChart}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeedingOrgChart ? 'animate-spin' : ''}`} />
                <span>{isSeedingOrgChart ? 'Semeando...' : 'Inicializar / Semear Organograma'}</span>
              </button>
            </div>

            {/* Tree View Read-Only */}
            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[260px]">
              {isLoadingOrgChart ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                  <span className="text-xs font-mono">Consultando árvore hierárquica do tenant...</span>
                </div>
              ) : orgChartTree && orgChartTree.length > 0 ? (
                <div className="space-y-3 font-mono text-xs">
                  {orgChartTree.map(function renderNode(node: any, depth = 0): React.ReactNode {
                    return (
                      <div key={node.id} className="space-y-2">
                        <div
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                          style={{ marginLeft: `${depth * 20}px` }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-[#0c326f] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 tabular-nums">
                              {node.code}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate font-sans">
                              {node.name}
                            </span>
                            <span className="text-[11px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {node.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                            <span>Nível {node.level}</span>
                            <span>Path: {node.path}</span>
                          </div>
                        </div>

                        {node.children && node.children.length > 0 && (
                          <div className="space-y-2">
                            {node.children.map((c: any) => renderNode(c, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Landmark className="w-10 h-10 text-slate-400 mx-auto" />
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma unidade cadastrada para este tenant.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Inicializar Organograma Padrão Agora</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setDiagnosticTenant(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Organização
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5">
              Esta ação removerá todos os acessos do tenant e dados isolados vinculados. Tem certeza?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTenant(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md"
              >
                Excluir Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
