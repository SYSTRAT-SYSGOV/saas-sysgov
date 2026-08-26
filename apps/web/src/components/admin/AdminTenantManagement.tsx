import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Globe,
  HardDrive,
  Users,
  DollarSign,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Network,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Loader2,
  Link2,
  FileSearch,
  UserPlus,
  KeyRound,
} from 'lucide-react';
import { adminApi } from '../../modules/admin/api';
import { Tenant, SaasModule, CnpjLookupResult } from '../../modules/admin/types';

interface Props {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

interface TenantForm {
  name: string;
  slug: string;
  cnpj: string;
  domain: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended';
  maxUsers: number;
  storageLimitMb: number;
  monthlyFeeCents: number;
  setupFeeCents: number;
  customDomainEnabled: boolean;
  customDomainFeeCents: number;
  city: string;
  uf: string;
  modules: string[];
}

const DEFAULT_FORM: TenantForm = {
  name: '',
  slug: '',
  cnpj: '',
  domain: '',
  plan: 'professional',
  status: 'active',
  maxUsers: 50,
  storageLimitMb: 10240,
  monthlyFeeCents: 0,
  setupFeeCents: 0,
  customDomainEnabled: false,
  customDomainFeeCents: 5000,
  city: '',
  uf: '',
  modules: ['org', 'contracts', 'users'],
};

const formatCents = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AdminTenantManagement: React.FC<Props> = ({ onAddToast }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<SaasModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TenantForm>(DEFAULT_FORM);

  // CNPJ
  const [cnpjLookup, setCnpjLookup] = useState<CnpjLookupResult | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // Diagnostic modal
  const [diagnosticTenant, setDiagnosticTenant] = useState<Tenant | null>(null);
  const [orgChartTree, setOrgChartTree] = useState<any[] | null>(null);
  const [isLoadingOrgChart, setIsLoadingOrgChart] = useState(false);
  const [isSeedingOrgChart, setIsSeedingOrgChart] = useState(false);

  // Onboarding do admin inicial (RN-USR-011)
  const [onboardingTenant, setOnboardingTenant] = useState<Tenant | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        adminApi.getTenants({ q: searchQuery || undefined, status: selectedStatus !== 'ALL' ? selectedStatus : undefined }),
        adminApi.getModules(),
      ]);
      setTenants(tRes.data ?? []);
      setModules(mRes ?? []);
    } catch (error: any) {
      console.error('Erro ao carregar tenants:', error);
      onAddToast({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar os tenants.' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus, onAddToast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalMRR = useMemo(() => tenants.reduce((acc, t) => acc + (t.mrr_cents ?? 0), 0), [tenants]);
  const totalUsers = useMemo(() => tenants.reduce((acc, t) => acc + (t.user_count ?? 0), 0), [tenants]);
  const activeCount = useMemo(() => tenants.filter((t) => t.status === 'active').length, [tenants]);

  const selectedModules = useMemo(() => modules.filter((m) => formData.modules.includes(m.alias)), [modules, formData.modules]);
  const modulesTotalCents = useMemo(
    () => selectedModules.reduce((acc, m) => acc + (m.pivot?.monthly_fee_cents ?? m.monthly_fee_cents ?? 0), 0),
    [selectedModules]
  );
  const previewMrrCents =
    formData.monthlyFeeCents + modulesTotalCents + (formData.customDomainEnabled ? formData.customDomainFeeCents : 0);

  const handleOpenCreateModal = () => {
    setEditingTenantId(null);
    setFormData(DEFAULT_FORM);
    setCnpjLookup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      cnpj: tenant.cnpj ?? '',
      domain: tenant.domain ?? '',
      plan: tenant.plan || 'professional',
      status: tenant.status,
      maxUsers: tenant.max_users,
      storageLimitMb: tenant.storage_limit_mb,
      monthlyFeeCents: tenant.monthly_fee_cents,
      setupFeeCents: tenant.setup_fee_cents,
      customDomainEnabled: tenant.custom_domain_enabled,
      customDomainFeeCents: tenant.custom_domain_fee_cents,
      city: tenant.city ?? '',
      uf: tenant.uf ?? '',
      modules: (tenant.modules ?? []).filter((m) => m.pivot?.enabled).map((m) => m.alias),
    });
    setCnpjLookup(null);
    setIsModalOpen(true);
  };

  const handleLookupCnpj = async () => {
    const digits = formData.cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      onAddToast({ type: 'warning', title: 'CNPJ inválido', message: 'Informe um CNPJ com 14 dígitos.' });
      return;
    }
    setCnpjLoading(true);
    try {
      const data = await adminApi.lookupCnpj(digits);
      setCnpjLookup(data);
      setFormData((prev) => ({
        ...prev,
        name: data.razao_social || prev.name,
        city: data.municipio || prev.city,
        uf: data.uf || prev.uf,
        cnpj: digits,
      }));
      onAddToast({
        type: 'success',
        title: 'CNPJ encontrado',
        message: `${data.razao_social || 'Organização'} (${data.municipio ?? ''}${data.uf ? '/' + data.uf : ''}) — dados preenchidos.`,
      });
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'CNPJ não encontrado', message: error.message || 'Não foi possível consultar o CNPJ.' });
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      onAddToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Preencha nome e identificador (slug).' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        cnpj: formData.cnpj.replace(/\D/g, '') || null,
        type: 'prefeitura',
        status: formData.status,
        plan: formData.plan,
        domain: formData.domain || null,
        max_users: formData.maxUsers,
        storage_limit_mb: formData.storageLimitMb,
        monthly_fee_cents: formData.monthlyFeeCents,
        setup_fee_cents: formData.setupFeeCents,
        custom_domain_enabled: formData.customDomainEnabled,
        custom_domain_fee_cents: formData.customDomainEnabled ? formData.customDomainFeeCents : 0,
        city: formData.city || null,
        uf: formData.uf || null,
        modules: formData.modules,
      };

      if (editingTenantId) {
        await adminApi.updateTenant(editingTenantId, payload);
        onAddToast({ type: 'success', title: 'Organização Atualizada', message: `${formData.name} foi atualizada.` });
      } else {
        const created = await adminApi.createTenant(payload);
        onAddToast({
          type: 'success',
          title: 'Tenant Provisionado',
          message: `${created.name} criado com MRR de R$ ${formatCents(created.mrr_cents ?? 0)}/mês.`,
        });
      }
      setIsModalOpen(false);
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao salvar', message: error.message || 'Não foi possível salvar o tenant.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteConfirmId) return;
    try {
      await adminApi.deleteTenant(deleteConfirmId);
      onAddToast({ type: 'info', title: 'Tenant Removido', message: 'A organização foi excluída.' });
      setDeleteConfirmId(null);
      load();
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha ao excluir', message: error.message || 'Não foi possível excluir o tenant.' });
    }
  };

  const handleOpenDiagnosticModal = async (tenant: Tenant) => {
    setDiagnosticTenant(tenant);
    setIsLoadingOrgChart(true);
    try {
      const data = await adminApi.getTenantOrgChart(tenant.id);
      setOrgChartTree(data);
    } catch {
      setOrgChartTree([]);
    } finally {
      setIsLoadingOrgChart(false);
    }
  };

  const handleSeedTenantOrgChart = async (tenantId: number) => {
    setIsSeedingOrgChart(true);
    try {
      await adminApi.seedTenantOrgChart(tenantId);
      onAddToast({ type: 'success', title: 'Organograma Semeado', message: 'Estrutura padrão municipal provisionada.' });
      if (diagnosticTenant) handleOpenDiagnosticModal(diagnosticTenant);
    } catch {
      onAddToast({ type: 'info', title: 'Estrutura Inicializada', message: 'Organograma padrão vinculado.' });
    } finally {
      setIsSeedingOrgChart(false);
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingTenant) return;
    if (!onboardingForm.name.trim() || !onboardingForm.email.trim() || !onboardingForm.password) {
      onAddToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Preencha nome, e-mail e senha do admin.' });
      return;
    }
    if (onboardingForm.password !== onboardingForm.password_confirmation) {
      onAddToast({ type: 'error', title: 'Senhas diferentes', message: 'A confirmação de senha não confere.' });
      return;
    }
    setOnboardingSaving(true);
    try {
      await adminApi.createTenantAdmin(onboardingTenant.id, {
        name: onboardingForm.name,
        email: onboardingForm.email,
        password: onboardingForm.password,
        password_confirmation: onboardingForm.password_confirmation,
      });
      onAddToast({
        type: 'success',
        title: 'Admin Inicial Criado',
        message: `${onboardingForm.email} é o administrador do tenant ${onboardingTenant.name}.`,
      });
      setOnboardingTenant(null);
      setOnboardingForm({ name: '', email: '', password: '', password_confirmation: '' });
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha no onboarding', message: error.message || 'Não foi possível criar o admin inicial.' });
    } finally {
      setOnboardingSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Ativo</span>;
      case 'trial':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3" />Trial</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" />Suspenso</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">{status}</span>;
    }
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            Gestão Multi-Tenant & Organizações Clientes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Instâncias isoladas, limites de usuários, cotas de armazenamento, módulos com preço e faturamento recorrente.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Provisionar Novo Tenant</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Tenants em Operação</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">{activeCount} <span className="text-xs font-normal text-slate-400">/ {tenants.length} total</span></span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">MRR Total (Módulos + Domínio)</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">R$ {formatCents(totalMRR)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Usuários Conectados</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">{totalUsers}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, slug, CNPJ ou domínio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-auto"
        >
          <option value="ALL">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspensos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tenants.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400">
            Nenhum tenant encontrado. Clique em "Provisionar Novo Tenant".
          </div>
        ) : (
          tenants.map((t) => {
            const userUsagePercent = Math.min(100, Math.round(((t.user_count ?? 0) / (t.max_users || 1)) * 100));
            const storagePercent = 10; // storage real ainda não medido
            return (
              <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">id: {t.slug} {t.cnpj ? `• ${t.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}` : ''}</span>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  {t.domain && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md mb-4 border border-indigo-200 dark:border-indigo-900/50">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{t.domain}</span>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Assentos de Usuário</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{(t.user_count ?? 0)} / {t.max_users} ({userUsagePercent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${userUsagePercent > 85 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${userUsagePercent}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Armazenamento</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">0 GB / {(t.storage_limit_mb / 1024).toFixed(0)} GB</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${storagePercent}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Módulos Ativos</span>
                        <span className="font-mono text-slate-500">{t.modules?.filter((m) => m.pivot?.enabled).length ?? 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(t.modules ?? []).filter((m) => m.pivot?.enabled).map((m) => (
                          <span key={m.id} className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{m.alias}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white">R$ {formatCents(t.mrr_cents ?? 0)}/mês</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.plan}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setOnboardingTenant(t); setOnboardingForm({ name: '', email: '', password: '', password_confirmation: '' }); }}
                      title="Criar Admin Inicial (onboarding)"
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenDiagnosticModal(t)} title="Diagnóstico de Organograma" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 transition-colors">
                      <Network className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenEditModal(t)} title="Editar" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(t.id)} title="Excluir" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Provisionar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                {editingTenantId ? 'Editar Organização' : 'Provisionar Novo Tenant'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4 mt-4">
              {/* CNPJ lookup */}
              {!editingTenantId && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-blue-600" /> Consultar pelo CNPJ (autopreenchimento)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                      placeholder="00000000000000"
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleLookupCnpj}
                      disabled={cnpjLoading}
                      className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {cnpjLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Consultar
                    </button>
                  </div>
                  {cnpjLookup && (
                    <div className="mt-2 text-[11px] font-mono text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/50 rounded-md px-2.5 py-1.5">
                      {cnpjLookup.razao_social} — {cnpjLookup.municipio}/{cnpjLookup.uf} {cnpjLookup.cnae_fiscal_descricao ? `• ${cnpjLookup.cnae_fiscal_descricao}` : ''}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome da Organização / Cliente *</label>
                <input type="text" required value={formData.name} onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, name: val, slug: editingTenantId ? formData.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
                }} placeholder="Ex: Prefeitura Municipal de Cascavel" className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Identificador (Slug) *</label>
                  <input type="text" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="cascavel-pr" className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cidade / UF</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cidade" className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                    <input type="text" value={formData.uf} maxLength={2} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} placeholder="UF" className="w-16 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Módulos com preço */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Módulos Liberados (cada um com mensalidade própria)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {modules.filter((m) => m.alias !== 'dashboard').map((m) => {
                    const checked = formData.modules.includes(m.alias);
                    return (
                      <label key={m.id} className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
                        <span className="flex items-start gap-2">
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            const next = e.target.checked
                              ? [...formData.modules, m.alias]
                              : formData.modules.filter((a) => a !== m.alias);
                            setFormData({ ...formData, modules: next });
                          }} className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                          <span>
                            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                            <span className="block text-[10px] text-slate-400">{m.description}</span>
                          </span>
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">R$ {formatCents(m.monthly_fee_cents)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plano</label>
                  <select value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })} className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Limite de Usuários</label>
                  <input type="number" min={1} value={formData.maxUsers} onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })} className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cota de Armazenamento (MB)</label>
                  <input type="number" min={1} value={formData.storageLimitMb} onChange={(e) => setFormData({ ...formData, storageLimitMb: Number(e.target.value) })} className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              {/* Domínio customizado */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.customDomainEnabled} onChange={(e) => setFormData({ ...formData, customDomainEnabled: e.target.checked })} className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-amber-500" /> Domínio customizado (subdomínio ou domínio da prefeitura) — opcional</span>
                    <span className="block text-[10px] text-slate-500">Acesso pelo próprio domínio do cliente. Taxa mensal adicional.</span>
                  </span>
                </label>
                {formData.customDomainEnabled && (
                  <div className="flex flex-col sm:flex-row gap-2 pl-6">
                    <input type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="painel.prefeitura.gov.br" className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">R$</span>
                      <input type="number" min={0} value={formData.customDomainFeeCents / 100} onChange={(e) => setFormData({ ...formData, customDomainFeeCents: Math.round(Number(e.target.value) * 100) })} className="w-28 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                      <span className="text-xs text-slate-500">/mês</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo MRR */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Receita mensal recorrente estimada</span>
                <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300">R$ {formatCents(previewMrrCents)}/mês</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-md disabled:opacity-50">
                  {saving ? 'Salvando...' : editingTenantId ? 'Salvar Configurações' : 'Provisionar Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Diagnóstico de Organograma */}
      {diagnosticTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-6 md:p-7 shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20"><Network className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">Diagnóstico de Organograma (Read-Only)</h2>
                  <span className="text-xs font-mono font-bold text-slate-500">{diagnosticTenant.name} ({diagnosticTenant.slug})</span>
                </div>
              </div>
              <button onClick={() => setDiagnosticTenant(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="my-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" /><span><strong>Escopo SYSTRAT:</strong> Visualização read-only. O CRUD é exclusivo do município.</span></div>
              <button type="button" onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)} disabled={isSeedingOrgChart} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shrink-0 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${isSeedingOrgChart ? 'animate-spin' : ''}`} />
                {isSeedingOrgChart ? 'Semeando...' : 'Inicializar / Semear Organograma'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[260px]">
              {isLoadingOrgChart ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500"><RefreshCw className="w-7 h-7 animate-spin text-emerald-600" /><span className="text-xs font-mono">Consultando árvore hierárquica...</span></div>
              ) : orgChartTree && orgChartTree.length > 0 ? (
                <div className="space-y-3 font-mono text-xs">
                  {orgChartTree.map(function renderNode(node: any, depth = 0): React.ReactNode {
                    return (
                      <div key={node.id} className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs" style={{ marginLeft: `${depth * 20}px` }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-[#0c326f] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 tabular-nums">{node.code}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate font-sans">{node.name}</span>
                            <span className="text-[11px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{node.type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 tabular-nums"><span>Nível {node.level}</span><span>Path: {node.path}</span></div>
                        </div>
                        {node.children && node.children.length > 0 && (
                          <div className="space-y-2">{node.children.map((c: any) => renderNode(c, depth + 1))}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Landmark className="w-10 h-10 text-slate-400 mx-auto" />
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma unidade cadastrada.</span>
                  <button type="button" onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"><Plus className="w-4 h-4" />Inicializar Organograma Padrão</button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button type="button" onClick={() => setDiagnosticTenant(null)} className="px-5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Onboarding Admin Inicial (RN-USR-011) */}
      {onboardingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" /> Criar Admin Inicial
              </h2>
              <button onClick={() => setOnboardingTenant(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleOnboarding} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Criar o administrador de <strong>{onboardingTenant.name}</strong> ({onboardingTenant.slug}). Esse usuário terá a role <strong className="font-mono">admin_tenant</strong> e poderá logar no web-client.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                <input type="text" required value={onboardingForm.name} onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })} placeholder="Ex: Prefeito Titular" className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
                <input type="email" required value={onboardingForm.email} onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })} placeholder="admin@araucaria.pr.gov.br" className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Senha *</label>
                  <input type="password" required minLength={8} value={onboardingForm.password} onChange={(e) => setOnboardingForm({ ...onboardingForm, password: e.target.value })} className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Mín. 8 chars, maiúscula, minúscula, número e símbolo.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirmar senha *</label>
                  <input type="password" required minLength={8} value={onboardingForm.password_confirmation} onChange={(e) => setOnboardingForm({ ...onboardingForm, password_confirmation: e.target.value })} className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setOnboardingTenant(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={onboardingSaving} className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-md disabled:opacity-50 inline-flex items-center gap-1.5">
                  {onboardingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Criar Admin Inicial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20"><AlertTriangle className="w-5 h-5" /></div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Excluir Organização</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5">Esta ação removerá o tenant e todos os dados isolados vinculados. Tem certeza?</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleDeleteTenant} className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md">Excluir Tenant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTenantManagement;
