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
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { adminApi } from '../../modules/admin/api';
import { Tenant, SaasModule, CnpjLookupResult, BatchProvisionResult, User, Paginated } from '../../modules/admin/types';
import { StatusChip, Card, Modal, Button, Input, Select } from '@sysgov/ui';
import { Field } from '../../components/ui/Field';
import { DataTable } from '@sysgov/ui';
import { useFormValidationModal } from '@sysgov/ui';

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
  modules: ['org', 'contracts'],
};

const EXCLUDED_MODULE_ALIASES = ['dashboard', 'admin', 'client', 'users', 'rh', 'cemiterio', 'procurement'];

const VIEW_MODE_KEY = 'sysgov_admin_tenants_view';
type ViewMode = 'cards' | 'table';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const readStoredViewMode = (): ViewMode => {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
};

const storeViewMode = (mode: ViewMode) => {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // storage indisponível (modo privado/bloqueado): a preferência só vale na sessão
  }
};

const formatCnpj = (cnpj?: string | null) =>
  cnpj ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—';

const formatCents = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TenantActions({
  t,
  onEdit,
  onDelete,
  onDiagnostic,
  onOnboarding,
}: {
  t: Tenant;
  onEdit: (t: Tenant) => void;
  onDelete: (id: number) => void;
  onDiagnostic: (t: Tenant) => void;
  onOnboarding: (t: Tenant) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onOnboarding(t)}
        title="Administradores do tenant"
        className="p-1.5 rounded-lg text-status-warning hover:bg-status-warning-bg border border-status-warning-border  transition-colors cursor-pointer"
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDiagnostic(t)}
        title="Diagnóstico de Organograma"
        className="p-1.5 rounded-lg text-primary hover:bg-accent border border-primary  transition-colors cursor-pointer"
      >
        <Network className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(t)}
        title="Editar Organização"
        className="p-1.5 rounded-lg text-primary hover:bg-accent border border-primary/30  transition-colors cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(t.id)}
        title="Excluir Organização"
        className="p-1.5 rounded-lg text-status-danger hover:bg-status-danger-bg border border-status-danger-border  transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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
    <div key={t.id} className="bg-card border border-border  rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      {/* Selection checkbox */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedTenantIds.includes(t.id)}
            onChange={(e) => handleTenantSelectionChange(t.id, e.target.checked)}
            className="w-4 h-4 rounded border-border text-status-warning focus:ring-ring cursor-pointer"
            aria-label={`Selecionar ${t.name}`}
          />
          <span className="text-xs text-muted-foreground ">Selecionar para ações em lote</span>
        </div>
        {getStatusBadge(t.status)}
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground ">{t.name}</h3>
        <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">id: {t.slug} {t.cnpj ? `• ${t.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}` : ''}</span>
      </div>

      {t.domain && (
        <div className="flex items-center gap-1.5 text-xs text-primary bg-accent  px-2.5 py-1 rounded-md mb-4 border border-primary/30 ">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-mono text-[11px]">{t.domain}</span>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Assentos de Usuário</span>
            <span className="font-mono font-semibold text-foreground ">{(t.user_count ?? 0)} / {t.max_users} ({userUsagePercent}%)</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${userUsagePercent > 85 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${userUsagePercent}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Armazenamento</span>
            <span className="font-mono font-semibold text-foreground ">0 GB / {(t.storage_limit_mb / 1024).toFixed(0)} GB</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '10%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Módulos Ativos</span>
            <span className="font-mono text-muted-foreground">{t.modules?.filter((m) => m.pivot?.enabled && !EXCLUDED_MODULE_ALIASES.includes(m.alias)).length ?? 0}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(t.modules ?? []).filter((m) => m.pivot?.enabled && !EXCLUDED_MODULE_ALIASES.includes(m.alias)).map((m) => (
              <span key={m.id} className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted text-muted-foreground ">{m.alias}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer inside the card */}
      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
        <div>
          <span className="block font-mono text-xs font-bold text-foreground ">R$ {formatCents(t.mrr_cents ?? 0)}/mês</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.plan}</span>
        </div>
        <TenantActions t={t} onEdit={onEdit} onDelete={onDelete} onDiagnostic={onDiagnostic} onOnboarding={onOnboarding} />
      </div>
    </div>
  );
}

export const AdminTenantManagement: React.FC<Props> = ({ onAddToast = () => {} }) => {
  const { modal: modalValidacao, validar, invalidar, tratarErro } = useFormValidationModal();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<SaasModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [meta, setMeta] = useState<Paginated<Tenant>['meta']>();

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

  // Administradores do tenant (RN-USR-011): lista, cadastro, edição e desativação
  const [onboardingTenant, setOnboardingTenant] = useState<Tenant | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingChecking, setOnboardingChecking] = useState(false);
  const [tenantAdmins, setTenantAdmins] = useState<User[]>([]);
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [deactivatingAdmin, setDeactivatingAdmin] = useState<User | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const emptyAdminForm = { name: '', email: '', password: '', password_confirmation: '' };
  const [onboardingForm, setOnboardingForm] = useState(emptyAdminForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        adminApi.getTenants({
          q: searchQuery || undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          page,
          per_page: perPage,
          sort: sorting[0]?.id,
          direction: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
        }),
        adminApi.getModules(),
      ]);
      const lastPage = tRes.meta?.last_page ?? 1;
      if ((tRes.data?.length ?? 0) === 0 && page > lastPage && lastPage >= 1) {
        // Página fora do intervalo (ex.: depois de excluir o último item da última página)
        setPage(lastPage);
        return;
      }
      setTenants(tRes.data ?? []);
      setMeta(tRes.meta);
      setModules(mRes ?? []);
    } catch (error: any) {
      console.error('Erro ao carregar tenants:', error);
      onAddToast({ type: 'error', title: 'Falha ao carregar', message: error.message || 'Não foi possível carregar os tenants.' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus, page, perPage, sorting, onAddToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Os indicadores usam os totais do conjunto filtrado inteiro (meta.summary), não só da página atual.
  const summary = meta?.summary;
  const totalMRR = summary?.mrr_cents ?? tenants.reduce((acc, t) => acc + (t.mrr_cents ?? 0), 0);
  const totalUsers = summary?.user_count ?? tenants.reduce((acc, t) => acc + (t.user_count ?? 0), 0);
  const activeCount = summary?.active ?? tenants.filter((t) => t.status === 'active').length;
  const totalTenants = summary?.total ?? meta?.total ?? tenants.length;
  const lastPage = meta?.last_page ?? 1;

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
    if (!validar([['Nome da Organização / Cliente', formData.name], ['Identificador (Slug)', formData.slug]])) return;
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao salvar', message: error.message || 'Não foi possível salvar o tenant.' });
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao excluir', message: error.message || 'Não foi possível excluir o tenant.' });
    }
  };

  // Batch Provisioning handlers
  const handleTenantSelectionChange = (tenantId: number, checked: boolean) => {
    setSelectedTenantIds(prev => checked ? [...prev, tenantId] : prev.filter(id => id !== tenantId));
  };

  // "Selecionar todos" atua sobre a página atual e preserva a seleção feita em outras páginas.
  const handleSelectAllTenants = (checked: boolean) => {
    const pageIds = tenants.map((t) => t.id);
    setSelectedTenantIds((prev) => (checked ? Array.from(new Set([...prev, ...pageIds])) : prev.filter((id) => !pageIds.includes(id))));
  };

  // Mudar busca/filtro volta para a página 1 e limpa a seleção (evita ação em lote sobre itens ocultos).
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    setSelectedTenantIds([]);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
    setSelectedTenantIds([]);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    storeViewMode(mode);
  };

  const handlePerPageChange = (size: number) => {
    setPerPage(size);
    setPage(1);
  };

  const handleSortingChange = (next: SortingState) => {
    setSorting(next);
    setPage(1);
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
    if (!validar([['Módulo', batchModule]])) return;
    if (selectedTenantIds.length === 0) {
      invalidar([['Tenants', 'Selecione ao menos um tenant na tabela.']]);
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
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha no Provisionamento em Lote', message: error.message || 'Não foi possível provisionar o módulo em lote.' });
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

  const loadTenantAdmins = async (tenant: Tenant) => {
    setOnboardingChecking(true);
    try {
      const admins = await adminApi.listTenantAdmins(tenant.id);
      setTenantAdmins(admins);
      // Sem administradores: abre direto o formulário de cadastro
      setAdminFormOpen(admins.length === 0);
    } catch (error: any) {
      setTenantAdmins([]);
      setAdminFormOpen(true);
      onAddToast({ type: 'error', title: 'Falha ao listar administradores', message: error.message || 'Não foi possível carregar os administradores.' });
    } finally {
      setOnboardingChecking(false);
    }
  };

  const handleOpenOnboarding = async (tenant: Tenant) => {
    setOnboardingTenant(tenant);
    setEditingAdmin(null);
    setDeactivatingAdmin(null);
    setDeactivateReason('');
    setOnboardingForm(emptyAdminForm);
    await loadTenantAdmins(tenant);
  };

  const closeAdminsModal = () => {
    setOnboardingTenant(null);
    setEditingAdmin(null);
    setDeactivatingAdmin(null);
    setAdminFormOpen(false);
    setTenantAdmins([]);
    setOnboardingForm(emptyAdminForm);
  };

  const startAddAdmin = () => {
    setEditingAdmin(null);
    setOnboardingForm(emptyAdminForm);
    setAdminFormOpen(true);
  };

  const startEditAdmin = (admin: User) => {
    setEditingAdmin(admin);
    setOnboardingForm({ name: admin.name, email: admin.email, password: '', password_confirmation: '' });
    setAdminFormOpen(true);
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingTenant) return;

    if (onboardingForm.password && onboardingForm.password !== onboardingForm.password_confirmation) {
      invalidar([['Confirmação de senha', 'A confirmação de senha não confere.']]);
      return;
    }

    if (editingAdmin) {
      if (!validar([['Nome do administrador', onboardingForm.name]])) return;
      setOnboardingSaving(true);
      try {
        await adminApi.updateTenantAdmin(onboardingTenant.id, editingAdmin.id, {
          name: onboardingForm.name,
          ...(onboardingForm.password ? { password: onboardingForm.password, password_confirmation: onboardingForm.password_confirmation } : {}),
        });
        onAddToast({ type: 'success', title: 'Administrador atualizado', message: `${editingAdmin.email} foi atualizado.` });
        setEditingAdmin(null);
        setOnboardingForm(emptyAdminForm);
        await loadTenantAdmins(onboardingTenant);
      } catch (error: any) {
        if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao atualizar', message: error.message || 'Não foi possível atualizar o administrador.' });
      } finally {
        setOnboardingSaving(false);
      }
      return;
    }

    // Novo administrador. Se o e-mail já for de um usuário existente, o backend o reaproveita
    // e mantém o nome e a senha atuais; por isso nome/senha só são exigidos aqui para e-mail novo (validado no backend).
    if (!validar([['E-mail do administrador', onboardingForm.email]])) return;
    setOnboardingSaving(true);
    try {
      await adminApi.createTenantAdmin(onboardingTenant.id, {
        email: onboardingForm.email.trim(),
        ...(onboardingForm.name.trim() ? { name: onboardingForm.name } : {}),
        ...(onboardingForm.password ? { password: onboardingForm.password, password_confirmation: onboardingForm.password_confirmation } : {}),
      });
      onAddToast({
        type: 'success',
        title: 'Administrador cadastrado',
        message: `${onboardingForm.email} agora administra ${onboardingTenant.name}. No primeiro acesso será exigida a configuração do MFA.`,
      });
      setOnboardingForm(emptyAdminForm);
      await loadTenantAdmins(onboardingTenant);
    } catch (error: any) {
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao cadastrar', message: error.message || 'Não foi possível cadastrar o administrador.' });
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleDeactivateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingTenant || !deactivatingAdmin) return;
    if (!validar([['Motivo da desativação', deactivateReason]])) return;
    if (deactivateReason.trim().length < 10) {
      invalidar([['Motivo da desativação', 'Informe o motivo da desativação (mínimo de 10 caracteres).']]);
      return;
    }
    setOnboardingSaving(true);
    try {
      await adminApi.deactivateTenantAdmin(onboardingTenant.id, deactivatingAdmin.id, deactivateReason.trim());
      onAddToast({ type: 'success', title: 'Administrador desativado', message: `${deactivatingAdmin.email} não administra mais ${onboardingTenant.name}.` });
      setDeactivatingAdmin(null);
      setDeactivateReason('');
      await loadTenantAdmins(onboardingTenant);
    } catch (error: any) {
      if (!tratarErro(error)) onAddToast({ type: 'error', title: 'Falha ao desativar', message: error.message || 'Não foi possível desativar o administrador.' });
    } finally {
      setOnboardingSaving(false);
    }
  };

  const isActiveTenantAdmin = (admin: User) =>
    admin.is_active && !!onboardingTenant && !!admin.tenants?.some((t) => t.id === onboardingTenant.id && t.status === 'active');

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

  // Colunas da visualização em tabela. Os ids das colunas ordenáveis são os campos aceitos em `sort` pela API.
  const allPageSelected = tenants.length > 0 && tenants.every((t) => selectedTenantIds.includes(t.id));
  const tableColumns = useMemo<ColumnDef<Tenant>[]>(() => [
    {
      id: 'select',
      enableSorting: false,
      header: () => (
        <input
          type="checkbox"
          checked={allPageSelected}
          onChange={(e) => handleSelectAllTenants(e.target.checked)}
          className="w-4 h-4 rounded border-border text-status-warning focus:ring-ring cursor-pointer"
          aria-label="Selecionar todos desta página"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedTenantIds.includes(row.original.id)}
          onChange={(e) => handleTenantSelectionChange(row.original.id, e.target.checked)}
          className="w-4 h-4 rounded border-border text-status-warning focus:ring-ring cursor-pointer"
          aria-label={`Selecionar ${row.original.name}`}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: 'Organização',
      cell: ({ row }) => (
        <div className="text-left">
          <span className="block text-sm font-semibold text-foreground ">{row.original.name}</span>
          <span className="block text-[11px] font-mono text-muted-foreground">{row.original.slug}</span>
        </div>
      ),
    },
    { id: 'cnpj', enableSorting: false, header: 'CNPJ', cell: ({ row }) => <span className="font-mono text-xs">{formatCnpj(row.original.cnpj)}</span> },
    { accessorKey: 'type', header: 'Tipo', cell: ({ row }) => <span className="text-xs">{row.original.type}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => getStatusBadge(row.original.status) },
    { accessorKey: 'plan', header: 'Plano', cell: ({ row }) => <span className="text-xs uppercase tracking-wider">{row.original.plan}</span> },
    {
      id: 'mrr_cents',
      enableSorting: false,
      header: 'MRR',
      cell: ({ row }) => <span className="font-mono text-xs">R$ {formatCents(row.original.mrr_cents ?? 0)}</span>,
    },
    {
      id: 'user_count',
      enableSorting: false,
      header: 'Usuários',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.user_count ?? 0}<span className="text-muted-foreground"> / {row.original.max_users}</span></span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Criado em',
      cell: ({ row }) => <span className="text-xs">{new Date(row.original.created_at).toLocaleDateString('pt-BR')}</span>,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <TenantActions
            t={row.original}
            onEdit={handleOpenEditModal}
            onDelete={(id) => setDeleteConfirmId(id)}
            onDiagnostic={handleOpenDiagnosticModal}
            onOnboarding={handleOpenOnboarding}
          />
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tenants, selectedTenantIds, allPageSelected]);

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-status-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {modalValidacao}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border  shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-status-warning" />
            Gestão Multi-Tenant & Organizações Clientes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
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
        <div className="bg-card border border-border  rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Tenants em Operação</span>
            <span className="text-2xl font-extrabold text-foreground font-mono tabular-nums">{activeCount} <span className="text-xs font-normal text-muted-foreground">/ {totalTenants} total</span></span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        </div>
        <div className="bg-card border border-border  rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">MRR Total (Módulos + Domínio)</span>
            <span className="text-2xl font-extrabold text-primary font-mono tabular-nums">R$ {formatCents(totalMRR)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
        </div>
        <div className="bg-card border border-border  rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Usuários Conectados</span>
            <span className="text-2xl font-extrabold text-primary font-mono tabular-nums">{totalUsers}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Users className="w-5 h-5" /></div>
        </div>
      </div>

      <Card className="p-4 flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, slug, CNPJ ou domínio..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-muted border border-border  text-foreground  focus:outline-none focus:ring-2 focus:ring-ring w-full md:w-auto"
        >
          <option value="ALL">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspensos</option>
        </select>
        <div className="inline-flex rounded-lg border border-border overflow-hidden shrink-0" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            onClick={() => handleViewModeChange('cards')}
            aria-pressed={viewMode === 'cards'}
            title="Visualizar em cards"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'cards' ? 'bg-status-warning text-foreground' : 'bg-muted  text-muted-foreground  hover:bg-accent '}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('table')}
            aria-pressed={viewMode === 'table'}
            title="Visualizar em tabela"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-status-warning text-foreground' : 'bg-muted  text-muted-foreground  hover:bg-accent '}`}
          >
            <List className="w-3.5 h-3.5" /> Tabela
          </button>
        </div>
      </Card>

      {/* Batch Actions Bar */}
      {selectedTenantIds.length > 0 && (
        <div className="bg-status-warning-bg/70 border border-status-warning-border  rounded-xl p-4 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-status-warning" />
              <div>
                <span className="text-sm font-semibold text-status-warning ">{selectedTenantIds.length} tenant(s) selecionado(s)</span>
                <span className="text-xs text-status-warning ml-2">Ações em lote disponíveis</span>
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
                className="px-3 py-2 text-xs font-semibold text-status-warning hover:bg-status-warning-bg  rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar Seleção
              </button>
            </div>
          </div>
</div>
      )}

      {viewMode === 'table' ? (
        <DataTable<Tenant, unknown>
          columns={tableColumns}
          data={tenants}
          loading={loading}
          emptyMessage='Nenhum tenant encontrado. Clique em "Provisionar Novo Tenant".'
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          paginationState={{
            currentPage: meta?.current_page ?? page,
            totalPages: lastPage,
            onPageChange: setPage,
            total: meta?.total ?? tenants.length,
            perPage,
            onPerPageChange: handlePerPageChange,
          }}
          sorting={{ state: sorting, onChange: handleSortingChange }}
        />
      ) : tenants.length === 0 ? (
        <div className="col-span-full py-16 text-center text-muted-foreground ">
          Nenhum tenant encontrado. Clique em "Provisionar Novo Tenant".
        </div>
      ) : (
        <>
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
                onOnboarding={handleOpenOnboarding}
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground " data-testid="cards-pagination">
            <span>
              {totalTenants} tenant(s) • Página {meta?.current_page ?? page} de {lastPage}
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5">
                Por página
                <select
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  aria-label="Tenants por página"
                  className="px-2 py-1 rounded-md bg-muted border border-border  text-foreground "
                >
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Próxima</Button>
            </div>
          </div>
        </>
      )}

      {/* Modal Provisionar / Editar */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenantId ? 'Editar Organização' : 'Provisionar Novo Tenant'}
        icon={<Building2 className="w-4 h-4 text-status-warning" />}
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
            <form noValidate id="tenant-form" onSubmit={handleSaveTenant} className="space-y-4">
              {/* CNPJ lookup */}
              {!editingTenantId && (
                <div className="p-3.5 rounded-xl bg-accent/70 border border-primary/30 ">
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-primary" /> Consultar pelo CNPJ (autopreenchimento)
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
                    <div className="mt-2 text-[11px] font-mono text-primary bg-accent  rounded-md px-2.5 py-1.5">
                      {cnpjLookup.razao_social} — {cnpjLookup.municipio}/{cnpjLookup.uf} {cnpjLookup.cnae_fiscal_descricao ? `• ${cnpjLookup.cnae_fiscal_descricao}` : ''}
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Nome da Organização / Cliente *"
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
                <label className="block text-xs font-semibold text-foreground mb-2">Módulos Liberados (cada um com mensalidade própria)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {modules.filter((m) => !EXCLUDED_MODULE_ALIASES.includes(m.alias)).map((m) => {
                    const checked = formData.modules.includes(m.alias);
                    return (
                      <label key={m.id} className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-status-warning-bg ' : 'border-border  hover:border-status-warning-border'}`}>
                        <span className="flex items-start gap-2">
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            const next = e.target.checked
                              ? [...formData.modules, m.alias]
                              : formData.modules.filter((a) => a !== m.alias);
                            setFormData({ ...formData, modules: next });
                          }} className="mt-0.5 w-4 h-4 rounded text-status-warning focus:ring-ring" />
                          <span>
                            <span className="block text-xs font-semibold text-foreground ">{m.name}</span>
                            <span className="block text-[10px] text-muted-foreground">{m.description}</span>
                          </span>
                        </span>
                        <span className="font-mono text-xs font-bold text-status-warning ">R$ {formatCents(m.monthly_fee_cents)}</span>
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
              <div className="p-3.5 rounded-xl border border-border space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.customDomainEnabled} onChange={(e) => setFormData({ ...formData, customDomainEnabled: e.target.checked })} className="mt-0.5 w-4 h-4 rounded text-status-warning focus:ring-ring" />
                  <span>
                    <span className="block text-xs font-semibold text-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-status-warning" /> Domínio customizado (subdomínio ou domínio da prefeitura) — opcional</span>
                    <span className="block text-[10px] text-muted-foreground">Acesso pelo próprio domínio do cliente. Taxa mensal adicional.</span>
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-status-success-bg/70 border border-status-success-border ">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Receita mensal recorrente estimada</span>
                <span className="font-mono text-sm font-extrabold text-primary ">R$ {formatCents(previewMrrCents)}/mês</span>
              </div>

            </form>
      </Modal>

      {/* Modal Diagnóstico de Organograma */}
      <Modal
        open={!!diagnosticTenant}
        onClose={() => setDiagnosticTenant(null)}
        title="Diagnóstico de Organograma (Read-Only)"
        icon={<Network className="w-5 h-5 text-primary" />}
        size="xl"
        footer={<Button variant="outline" onClick={() => setDiagnosticTenant(null)}>Fechar</Button>}
      >
        {diagnosticTenant && (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-muted-foreground -mt-2 mb-2">{diagnosticTenant.name} ({diagnosticTenant.slug})</span>

            <div className="mb-4 p-3.5 rounded-xl bg-status-warning-bg border border-status-warning-border  text-status-warning  text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-status-warning shrink-0" /><span><strong>Escopo SYSTRAT:</strong> Visualização read-only. O CRUD é exclusivo do município.</span></div>
              <button type="button" onClick={() => handleSeedTenantOrgChart(diagnosticTenant.id)} disabled={isSeedingOrgChart} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shrink-0 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${isSeedingOrgChart ? 'animate-spin' : ''}`} />
                {isSeedingOrgChart ? 'Semeando...' : 'Inicializar / Semear Organograma'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 rounded-2xl bg-muted border border-border  min-h-[260px]">
              {isLoadingOrgChart ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground"><RefreshCw className="w-7 h-7 animate-spin text-primary" /><span className="text-xs font-mono">Consultando árvore hierárquica...</span></div>
              ) : orgChartTree && orgChartTree.length > 0 ? (
                <div className="space-y-3 font-mono text-xs">
                  {orgChartTree.map(function renderNode(node: any, depth = 0): React.ReactNode {
                    return (
                      <div key={node.id} className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border  shadow-2xs" style={{ marginLeft: `${depth * 20}px` }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-primary bg-accent  px-2 py-0.5 rounded border border-primary/30  tabular-nums">{node.code}</span>
                            <span className="font-bold text-foreground truncate font-sans">{node.name}</span>
                            <span className="text-[11px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{node.type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums"><span>Nível {node.level}</span><span>Path: {node.path}</span></div>
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
                  <Landmark className="w-10 h-10 text-muted-foreground mx-auto" />
                  <span className="block text-xs font-bold text-foreground ">Nenhuma unidade cadastrada.</span>
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
            <form noValidate id="batch-provision-form" onSubmit={handleBatchProvision} className="space-y-4">
              <p className="text-xs text-muted-foreground ">
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
                  options={modules.filter(m => !EXCLUDED_MODULE_ALIASES.includes(m.alias)).map(m => ({ value: m.alias, label: `${m.name} (${m.alias})` }))}
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
                <div className="p-3 rounded-xl bg-muted border border-border  space-y-2">
                  <h4 className="text-xs font-semibold text-foreground ">Resultado do Último Provisionamento</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-primary font-mono">
                      Sucessos: {batchResult.results.filter(r => r.success).length}
                    </div>
                    <div className="text-status-danger font-mono">
                      Falhas: {batchResult.results.filter(r => !r.success).length}
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalhes</summary>
                    <div className="mt-1 max-h-32 overflow-y-auto custom-scrollbar text-[10px] font-mono space-y-1">
                      {batchResult.results.map((r, i) => (
                        <div key={i} className={r.success ? 'text-primary' : 'text-status-danger'}>
                          {r.success ? '✓' : '✗'} Tenant #{r.tenant_id} — {r.module_alias} {r.error ? `(${r.error})` : ''}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

            </form>
      </Modal>

      {/* Modal Administradores do Tenant (RN-USR-011): vários administradores por tenant */}
      <Modal
        open={!!onboardingTenant}
        onClose={closeAdminsModal}
        title={onboardingTenant ? `Administradores — ${onboardingTenant.name}` : 'Administradores'}
        icon={<KeyRound className="w-4 h-4 text-status-warning" />}
        size="2xl"
        footer={
          <>
            <Button variant="outline" onClick={closeAdminsModal}>Fechar</Button>
            {adminFormOpen && !deactivatingAdmin && (
              <Button type="submit" form="onboarding-form" isLoading={onboardingSaving} disabled={onboardingChecking} leftIcon={!onboardingSaving ? (editingAdmin ? <Edit2 className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />) : undefined}>
                {editingAdmin ? 'Salvar Alterações' : 'Cadastrar Administrador'}
              </Button>
            )}
            {deactivatingAdmin && (
              <Button type="submit" form="deactivate-admin-form" variant="destructive" isLoading={onboardingSaving}>
                Desativar Administrador
              </Button>
            )}
          </>
        }
      >
        {onboardingTenant && onboardingChecking && (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando administradores…
          </div>
        )}
        {onboardingTenant && !onboardingChecking && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              <strong>{onboardingTenant.name}</strong> ({onboardingTenant.slug}) pode ter quantos administradores forem necessários. Cada administrador tem a role <strong className="font-mono">admin_tenant</strong> e precisa configurar o MFA no primeiro acesso. O tenant sempre mantém ao menos um administrador ativo.
            </p>

            {tenantAdmins.length > 0 && (
              <ul className="divide-y divide-border border border-border  rounded-xl">
                {tenantAdmins.map((admin) => {
                  const active = isActiveTenantAdmin(admin);
                  return (
                    <li key={admin.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold truncate">{admin.name}</span>
                        <span className="block text-xs font-mono text-muted-foreground truncate">{admin.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip label={active ? 'Ativo' : 'Inativo'} variant={active ? 'success' : 'neutral'} />
                        <StatusChip label={admin.mfa_enabled ? 'MFA ativo' : 'MFA pendente'} variant={admin.mfa_enabled ? 'info' : 'neutral'} />
                        <Button variant="outline" size="sm" onClick={() => startEditAdmin(admin)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>Editar</Button>
                        {active && (
                          <Button variant="outline" size="sm" onClick={() => { setDeactivatingAdmin(admin); setDeactivateReason(''); setAdminFormOpen(false); }} leftIcon={<XCircle className="w-3.5 h-3.5" />}>Desativar</Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {deactivatingAdmin && (
              <form noValidate id="deactivate-admin-form" onSubmit={handleDeactivateAdmin} className="space-y-3 border border-status-danger-border rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  Desativar <strong>{deactivatingAdmin.email}</strong> como administrador. A ação fica registrada na auditoria.
                  Se for o último administrador ativo, a desativação é tratada como <strong>emergência</strong> e o tenant ficará sem administrador até que outro seja cadastrado.
                </p>
                <Input
                  label="Motivo *"
                  minLength={10}
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Ex: Servidor desligado do órgão"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setDeactivatingAdmin(null)}>Cancelar</Button>
              </form>
            )}

            {!adminFormOpen && !deactivatingAdmin && (
              <Button variant="outline" onClick={startAddAdmin} leftIcon={<UserPlus className="w-3.5 h-3.5" />}>Adicionar administrador</Button>
            )}

            {adminFormOpen && !deactivatingAdmin && (
              <form noValidate id="onboarding-form" onSubmit={handleOnboarding} className="space-y-4">
                <p className="text-xs font-semibold">{editingAdmin ? `Editar ${editingAdmin.email}` : 'Novo administrador'}</p>
                <Input
                  label={editingAdmin ? 'Nome *' : 'Nome'}
                  required={!!editingAdmin}
                  value={onboardingForm.name}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                  placeholder="Ex: Prefeito Titular"
                />
                <Input
                  label="E-mail *"
                  type="email"
                  required={!editingAdmin}
                  disabled={!!editingAdmin}
                  value={onboardingForm.email}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                  placeholder="admin@araucaria.pr.gov.br"
                  className="font-mono"
                  helperText={editingAdmin ? 'E-mail não pode ser alterado por aqui.' : 'Se o e-mail já tiver cadastro, o usuário é reaproveitado e o nome e a senha atuais são mantidos.'}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={editingAdmin ? 'Nova senha' : 'Senha (usuário novo)'}
                    type="password"
                    minLength={8}
                    value={onboardingForm.password}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, password: e.target.value })}
                    helperText="Mín. 8 chars, maiúscula, minúscula, número e símbolo."
                    placeholder={editingAdmin ? 'Deixe em branco para não alterar' : undefined}
                  />
                  <Input
                    label="Confirmar senha"
                    type="password"
                    required={!!onboardingForm.password}
                    minLength={8}
                    value={onboardingForm.password_confirmation}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, password_confirmation: e.target.value })}
                  />
                </div>
                {tenantAdmins.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setAdminFormOpen(false); setEditingAdmin(null); setOnboardingForm(emptyAdminForm); }}>Cancelar</Button>
                )}
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Excluir Organização"
        icon={<AlertTriangle className="w-5 h-5 text-status-danger" />}
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
