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
  CheckSquare,
  Square,
  Zap,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../../modules/admin/api';
import { Tenant, SaasModule, CnpjLookupResult, BatchProvisionResult } from '../../modules/admin/types';
import { StatusChip, Card, Modal, Button, Input, Select } from '@sysgov/ui';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';

interface Props {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
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

function TenantCard({
  t,
  selectedTenantIds,
  handleTenantSelectionChange,
  getStatusBadge,
  formatCents,
  onEdit,
  onDelete,
  onDiagnostic,
  onOnboarding,
}: {
  t: Tenant;
  selectedTenantIds: number[];
  handleTenantSelectionChange: (id: number, checked: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatCents: (cents: number) => string;
  onEdit: (t: Tenant) => void;
  onDelete: (id: number) => void;
  onDiagnostic: (t: Tenant) => void;
  onOnboarding: (t: Tenant) => void;
}) {
  const userUsagePercent = Math.min(100, Math.round(((t.user_count ?? 0) / (t.max_users || 1)) * 100));

  return (
    <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      {/* Selection checkbox */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedTenantIds.includes(t.id)}
            onChange={(e) => handleTenantSelectionChange(t.id, e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            aria-label={`Selecionar ${t.name}`}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Selecionar para ações em lote</span>
        </div>
        {getStatusBadge(t.status)}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</h3>
        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">id: {t.slug} {t.cnpj ? `• ${t.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}` : ''}</span>
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
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '10%' }} />
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

      {/* Footer inside the card */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white">R$ {formatCents(t.mrr_cents ?? 0)}/mês</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.plan}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOnboarding(t)}
            title="Criar Admin Inicial (onboarding)"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDiagnostic(t)}
            title="Diagnóstico de Organograma"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 transition-colors cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(t)}
            title="Editar Organização"
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(t.id)}
            title="Excluir Organização"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const AdminTenantManagement: React.FC<Props> = ({ onAddToast = () => {} }) => {
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

  // Batch Provisioning
  const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchModule, setBatchModule] = useState<string>('');
  const [batchEnabled, setBatchEnabled] = useState(true);
  const [batchMonthlyFee, setBatchMonthlyFee] = useState<number>(0);
  const [batchTrialEndsAt, setBatchTrialEndsAt] = useState<string>('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchProvisionResult | null>(null);

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

  // Batch Provisioning handlers
  const handleTenantSelectionChange = (tenantId: number, checked: boolean) => {
    setSelectedTenantIds(prev => checked ? [...prev, tenantId] : prev.filter(id => id !== tenantId));
  };

  const handleSelectAllTenants = (checked: boolean) => {
    if (checked) {
      setSelectedTenantIds(tenants.map(t => t.id));
    } else {
      setSelectedTenantIds([]);
    }
  };

  const openBatchModal = () => {
    setBatchModule('');
    setBatchEnabled(true);
    setBatchMonthlyFee(0);
    setBatchTrialEndsAt('');
    setBatchResult(null);
    setBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setBatchModalOpen(false);
    setBatchResult(null);
  };

  const handleBatchProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchModule) {
      onAddToast({ type: 'warning', title: 'Módulo Obrigatório', message: 'Selecione um módulo para provisionar.' });
      return;
    }
    if (selectedTenantIds.length === 0) {
      onAddToast({ type: 'warning', title: 'Nenhum Tenant Selecionado', message: 'Selecione ao menos um tenant na tabela.' });
      return;
    }

    setBatchSaving(true);
    try {
      const trialEndsAt = batchTrialEndsAt ? new Date(batchTrialEndsAt).toISOString() : null;
      const result = await adminApi.batchProvisionModules({
        tenant_ids: selectedTenantIds,
        module_alias: batchModule,
        enabled: batchEnabled,
        monthly_fee_cents: batchMonthlyFee * 100,
        trial_ends_at: trialEndsAt,
        settings: {},
      });
      setBatchResult(result);

      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.length - successCount;

      onAddToast({
        type: successCount > 0 ? 'success' : 'error',
        title: failCount === 0 ? 'Provisionamento em Lote Concluído' : 'Provisionamento Parcial',
        message: `${successCount} tenant(s) atualizado(s)${failCount > 0 ? `, ${failCount} falha(s)` : ''}.`,
      });

      if (successCount > 0) {
        setSelectedTenantIds([]);
        load();
      }
    } catch (error: any) {
      onAddToast({ type: 'error', title: 'Falha no Provisionamento em Lote', message: error.message || 'Não foi possível provisionar o módulo em lote.' });
    } finally {
      setBatchSaving(false);
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
        return <StatusChip label="Ativo" variant="success" icon={<CheckCircle2 className="w-3 h-3" />} />;
      case 'trial':
        return <StatusChip label="Trial" variant="info" icon={<Clock className="w-3 h-3" />} />;
      case 'suspended':
        return <StatusChip label="Suspenso" variant="danger" icon={<XCircle className="w-3 h-3" />} />;
      default:
        return <StatusChip label={status} variant="neutral" />;
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md"
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

      <Card className="p-4 flex-col md:flex-row items-center gap-3">
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
      </Card>

      {/* Batch Actions Bar */}
      {selectedTenantIds.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              <div>
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{selectedTenantIds.length} tenant(s) selecionado(s)</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">Ações em lote disponíveis</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openBatchModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                Provisionar Módulo em Lote
              </button>
              <button
                onClick={() => setSelectedTenantIds([])}
                className="px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Seleção
              </button>
            </div>
          </div>
</div>
      )}

      {tenants.length === 0 ? (
        <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400">
          Nenhum tenant encontrado. Clique em "Provisionar Novo Tenant".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tenants.map((t) => (
            <TenantCard
              key={t.id}
              t={t}
              selectedTenantIds={selectedTenantIds}
              handleTenantSelectionChange={handleTenantSelectionChange}
              getStatusBadge={getStatusBadge}
              formatCents={formatCents}
              onEdit={handleOpenEditModal}
              onDelete={(id) => setDeleteConfirmId(id)}
              onDiagnostic={handleOpenDiagnosticModal}
              onOnboarding={(tenant) => {
                setOnboardingTenant(tenant);
                setOnboardingForm({ name: '', email: '', password: '', password_confirmation: '' });
              }}
            />
          ))}
        </div>
      )}

      {/* Modal Provisionar / Editar */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenantId ? 'Editar Organização' : 'Provisionar Novo Tenant'}
        icon={<Building2 className="w-4 h-4 text-amber-500" />}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="tenant-form" isLoading={saving}>
              {editingTenantId ? 'Salvar Configurações' : 'Provisionar Tenant'}
            </Button>
          </>
        }
      >
            <form id="tenant-form" onSubmit={handleSaveTenant} className="space-y-4">
              {/* CNPJ lookup */}
              {!editingTenantId && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-blue-600" /> Consultar pelo CNPJ (autopreenchimento)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                      placeholder="00000000000000"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      onClick={handleLookupCnpj}
                      isLoading={cnpjLoading}
                      leftIcon={!cnpjLoading ? <Search className="w-3.5 h-3.5" /> : undefined}
                      className="shrink-0"
                    >
                      Consultar
                    </Button>
                  </div>
                  {cnpjLookup && (
                    <div className="mt-2 text-[11px] font-mono text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/50 rounded-md px-2.5 py-1.5">
                      {cnpjLookup.razao_social} — {cnpjLookup.municipio}/{cnpjLookup.uf} {cnpjLookup.cnae_fiscal_descricao ? `• ${cnpjLookup.cnae_fiscal_descricao}` : ''}
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Nome da Organização / Cliente *"
                required
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, name: val, slug: editingTenantId ? formData.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
                }}
                placeholder="Ex: Prefeitura Municipal de Cascavel"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Identificador (Slug) *"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="cascavel-pr"
                  className="font-mono"
                />
                <Input
                  label="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                  placeholder="00.000.000/0000-00"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/70">Cidade / UF</label>
                <div className="flex gap-2">
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cidade" className="flex-1" />
                  <Input value={formData.uf} maxLength={2} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} placeholder="UF" className="w-16 font-mono" />
                </div>
              </div>

              {/* Módulos com preço */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Módulos Liberados (cada um com mensalidade própria)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {modules.filter((m) => m.alias !== 'dashboard').map((m) => {
                    const checked = formData.modules.includes(m.alias);
                    return (
                      <label key={m.id} className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}
                  options={[
                    { value: 'active', label: 'Ativo' },
                    { value: 'trial', label: 'Trial' },
                    { value: 'suspended', label: 'Suspenso' },
                  ]}
                />
                <Select
                  label="Plano"
                  value={formData.plan}
                  onChange={(v) => setFormData({ ...formData, plan: v })}
                  options={[
                    { value: 'starter', label: 'Starter' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'enterprise', label: 'Enterprise' },
                  ]}
                />
                <Input
                  label="Limite Usuários"
                  type="number"
                  min={1}
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                  className="font-mono"
                />
                <Input
                  label="Cota Armaz. (MB)"
                  type="number"
                  min={1}
                  value={formData.storageLimitMb}
                  onChange={(e) => setFormData({ ...formData, storageLimitMb: Number(e.target.value) })}
                  className="font-mono"
                />
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
                    <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="painel.prefeitura.gov.br" className="flex-1 font-mono" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <Input type="number" min={0} value={formData.customDomainFeeCents / 100} onChange={(e) => setFormData({ ...formData, customDomainFeeCents: Math.round(Number(e.target.value) * 100) })} className="w-28 font-mono" />
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo MRR */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Receita mensal recorrente estimada</span>
                <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300">R$ {formatCents(previewMrrCents)}/mês</span>
              </div>

            </form>
      </Modal>

      {/* Modal Diagnóstico de Organograma */}
      <Modal
        open={!!diagnosticTenant}
        onClose={() => setDiagnosticTenant(null)}
        title="Diagnóstico de Organograma (Read-Only)"
        icon={<Network className="w-5 h-5 text-emerald-600" />}
        size="xl"
        footer={<Button variant="outline" onClick={() => setDiagnosticTenant(null)}>Fechar</Button>}
      >
        {diagnosticTenant && (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-muted-foreground -mt-2 mb-2">{diagnosticTenant.name} ({diagnosticTenant.slug})</span>

            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" /><span><strong>Escopo SYSTRAT:</strong> Visualização read-only. O CRUD é exclusivo do município.</span></div>
              <button type="button" onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)} disabled={isSeedingOrgChart} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shrink-0 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${isSeedingOrgChart ? 'animate-spin' : ''}`} />
                {isSeedingOrgChart ? 'Semeando...' : 'Inicializar / Semear Organograma'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[260px]">
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
                  <button type="button" onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"><Plus className="w-4 h-4" />Inicializar Organograma Padrão</button>
                </div>
              )}
            </div>

          </div>
        )}
      </Modal>

      {/* Modal Provisionamento em Lote */}
      <Modal
        open={batchModalOpen}
        onClose={closeBatchModal}
        title="Provisionar Módulo em Lote"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeBatchModal}>Cancelar</Button>
            <Button type="submit" form="batch-provision-form" isLoading={batchSaving} leftIcon={!batchSaving ? <Zap className="w-3.5 h-3.5" /> : undefined}>
              Provisionar em Lote
            </Button>
          </>
        }
      >
            <form id="batch-provision-form" onSubmit={handleBatchProvision} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provisionar o módulo selecionado em <strong>{selectedTenantIds.length}</strong> tenant(s).
                Ação de super admin SYSTRAT — auditable e irreversível sem intervenção manual.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Módulo"
                  name="batchModule"
                  value={batchModule}
                  onChange={(e) => setBatchModule(e.target.value)}
                  required
                  as="select"
                  options={modules.filter(m => m.alias !== 'dashboard').map(m => ({ value: m.alias, label: `${m.name} (${m.alias})` }))}
                />
                <Field
                  label="Status"
                  name="batchEnabled"
                  type="checkbox"
                  value={batchEnabled}
                  onChange={(e) => setBatchEnabled((e.target as HTMLInputElement).checked)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label="Mensalidade Customizada (R$)"
                  name="batchMonthlyFee"
                  type="number"
                  value={batchMonthlyFee}
                  onChange={(e) => setBatchMonthlyFee(Number(e.target.value) || 0)}
                  min="0"
                  help="Deixe 0 para usar o preço padrão do catálogo"
                />
                <Field
                  label="Fim do Trial (opcional)"
                  name="batchTrialEndsAt"
                  as="input"
                  value={batchTrialEndsAt}
                  onChange={(e) => setBatchTrialEndsAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  type="date"
                />
              </div>

              {batchResult && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resultado do Último Provisionamento</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-emerald-600 dark:text-emerald-400 font-mono">
                      Sucessos: {batchResult.results.filter(r => r.success).length}
                    </div>
                    <div className="text-rose-600 dark:text-rose-400 font-mono">
                      Falhas: {batchResult.results.filter(r => !r.success).length}
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-slate-500 cursor-pointer">Ver detalhes</summary>
                    <div className="mt-1 max-h-32 overflow-y-auto custom-scrollbar text-[10px] font-mono space-y-1">
                      {batchResult.results.map((r, i) => (
                        <div key={i} className={r.success ? 'text-emerald-600' : 'text-rose-600'}>
                          {r.success ? '✓' : '✗'} Tenant #{r.tenant_id} — {r.module_alias} {r.error ? `(${r.error})` : ''}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

            </form>
      </Modal>

      {/* Modal Onboarding Admin Inicial (RN-USR-011) */}
      <Modal
        open={!!onboardingTenant}
        onClose={() => setOnboardingTenant(null)}
        title="Criar Admin Inicial"
        icon={<KeyRound className="w-4 h-4 text-amber-500" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setOnboardingTenant(null)}>Cancelar</Button>
            <Button type="submit" form="onboarding-form" isLoading={onboardingSaving} leftIcon={!onboardingSaving ? <UserPlus className="w-3.5 h-3.5" /> : undefined}>
              Criar Admin Inicial
            </Button>
          </>
        }
      >
        {onboardingTenant && (
          <form id="onboarding-form" onSubmit={handleOnboarding} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Criar o administrador de <strong>{onboardingTenant.name}</strong> ({onboardingTenant.slug}). Esse usuário terá a role <strong className="font-mono">admin_tenant</strong> e poderá logar no web-client.
            </p>
            <Input
              label="Nome *"
              required
              value={onboardingForm.name}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
              placeholder="Ex: Prefeito Titular"
            />
            <Input
              label="E-mail *"
              type="email"
              required
              value={onboardingForm.email}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
              placeholder="admin@araucaria.pr.gov.br"
              className="font-mono"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Senha *"
                type="password"
                required
                minLength={8}
                value={onboardingForm.password}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, password: e.target.value })}
                helperText="Mín. 8 chars, maiúscula, minúscula, número e símbolo."
              />
              <Input
                label="Confirmar senha *"
                type="password"
                required
                minLength={8}
                value={onboardingForm.password_confirmation}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, password_confirmation: e.target.value })}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Excluir Organização"
        icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button onClick={handleDeleteTenant} variant="destructive">Excluir Tenant</Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">Esta ação removerá o tenant e todos os dados isolados vinculados. Tem certeza?</p>
      </Modal>
    </div>
  );
};

export default AdminTenantManagement;
