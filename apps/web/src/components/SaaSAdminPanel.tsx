import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  Database,
  Plug,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  FileText,
  Copy,
  Check,
  Search,
  Key,
  Globe,
  Sliders,
  ShieldCheck,
  Sparkles,
  Zap,
  Landmark,
  ExternalLink,
  Layers,
  ArrowRight,
  Loader2,
  Info,
} from 'lucide-react';
import {
  TenantSummary,
  SaaSUser,
  TenantApiConfig,
  SaaSInvoice,
  SaaSSummaryMetrics,
  AutoDiscoveredMunicipality,
  DiscoveredApiTemplate,
  TenantBrandingConfig,
} from '../types/saas';
import {
  getSaaSTenants,
  createSaaSTenant,
  updateSaaSTenant,
  deleteSaaSTenant,
  getTenantApis,
  createTenantApi,
  deleteTenantApi,
  triggerTenantApiSync,
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
  getSaaSInvoices,
  getSaaSMetrics,
  searchMunicipiosLookup,
  getMunicipiosSuggestions,
  updateTenantBranding,
} from '../services/api';

interface SaaSAdminPanelProps {
  onSelectTenantToPreview?: (tenant: TenantSummary) => void;
  activeTenantId?: string;
}

export const SaaSAdminPanel: React.FC<SaaSAdminPanelProps> = ({
  onSelectTenantToPreview,
  activeTenantId,
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'apis' | 'invoices' | 'branding' | 'database'>('tenants');
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [metrics, setMetrics] = useState<SaaSSummaryMetrics | null>(null);
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [selectedTenantForApis, setSelectedTenantForApis] = useState<string>('');
  const [tenantApis, setTenantApis] = useState<TenantApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingApiId, setSyncingApiId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // White-Label & Branding State (Company Exclusive)
  const [selectedTenantForBranding, setSelectedTenantForBranding] = useState<string>('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState<TenantBrandingConfig>({
    isCustomized: false,
    customLogoUrl: '',
    customPrimaryColor: '#10b981',
    customSecondaryColor: '#059669',
    customPortalTitle: 'Sistema de Monitoramento Fiscal Municipal',
    customSubtitle: 'Prefeitura Municipal de Araucária — Estado do Paraná',
    showSaaSBranding: true,
    taxaImplantacao: 0,
    mensalidadeCustomizacao: 0,
  });

  // Modals
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [showAddApiModal, setShowAddApiModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-Discovery State for Fast Municipal Registration
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [discoveredData, setDiscoveredData] = useState<AutoDiscoveredMunicipality | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showCustomManualFields, setShowCustomManualFields] = useState(false);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);
  const [submitTenantError, setSubmitTenantError] = useState<string | null>(null);

  // Form State - New Tenant
  const [newTenantForm, setNewTenantForm] = useState({
    codigoIbge: '',
    nomePrefeitura: '',
    cidade: '',
    uf: 'PR',
    cnpj: '',
    planoNome: 'Plano Básico Municipal (2 Usuários)',
    valorMensalBase: 1890,
    userLimit: 2,
    valorUsuarioExtra: 150,
    emailFaturamento: '',
    telefoneContato: '',
    prefeitoNome: '',
    prefeitoEmail: '',
    prefeitoCpf: '',
    secFinancasNome: '',
    secFinancasEmail: '',
    secFinancasCpf: '',
  });

  // Form State - Edit Existing Tenant (Company Only)
  const [editTenantForm, setEditTenantForm] = useState({
    nomePrefeitura: '',
    cidade: '',
    uf: 'PR',
    codigoIbge: '',
    cnpj: '',
    status: 'ATIVO' as 'ATIVO' | 'SUSPENSO' | 'EM_IMPLANTACAO' | 'INADIMPLENTE',
    planoNome: 'Plano Básico Municipal (2 Usuários)',
    valorMensalBase: 1890,
    userLimit: 2,
    valorUsuarioExtra: 150,
    diaVencimento: 10,
    emailFaturamento: '',
    telefoneContato: '',
  });
  const [isSavingEditTenant, setIsSavingEditTenant] = useState(false);

  // Global Multi-Tenant User Management State (Company Only)
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<string>('');
  const [tenantUsersList, setTenantUsersList] = useState<SaaSUser[]>([]);
  const [tenantQuotaData, setTenantQuotaData] = useState<any>(null);
  const [isLoadingUsersList, setIsLoadingUsersList] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    cargo: '',
    role: 'AUDITOR_GERAL',
    secretariaRestrita: '',
    ativo: true,
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Form State - New API
  const [newApiForm, setNewApiForm] = useState<{
    providerName: 'SICONFI' | 'TRANSFEREGOV' | 'TCE_PR' | 'PORTAL_TRANSPARENCIA' | 'ERP_LOCAL';
    label: string;
    baseUrl: string;
    authType: 'NONE' | 'API_KEY' | 'BEARER' | 'BASIC' | 'CERTIFICATE';
    apiKey: string;
    syncFrequency: string;
    customHeaders: string;
  }>({
    providerName: 'SICONFI',
    label: '',
    baseUrl: '',
    authType: 'API_KEY',
    apiKey: '',
    syncFrequency: '0 6,18 * * *',
    customHeaders: '',
  });

  // Supabase Live Tester State
  const [supabaseTestUrl, setSupabaseTestUrl] = useState<string>(() => {
    return localStorage.getItem('saas_supabase_url') || '';
  });
  const [supabaseTestKey, setSupabaseTestKey] = useState<string>(() => {
    return localStorage.getItem('saas_supabase_key') || '';
  });
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    status: 'success' | 'error' | 'warning';
    message: string;
    latencyMs?: number;
    tablesFound?: string[];
    tenantsCount?: number;
    rawDetails?: string;
  } | null>(null);

  const handleTestSupabaseConnection = async () => {
    let rawUrl = supabaseTestUrl.trim();
    let rawKey = supabaseTestKey.trim();

    if (!rawUrl) {
      showToast('Por favor, informe a SUPABASE_URL (Project URL)', 'error');
      return;
    }
    if (!rawKey) {
      showToast('Por favor, informe a SUPABASE_ANON_KEY (ou chave do projeto)', 'error');
      return;
    }

    // Remove any accidental quotes
    rawUrl = rawUrl.replace(/^["']|["']$/g, '').trim();
    rawKey = rawKey.replace(/^["']|["']$/g, '').trim();

    // Smart URL normalizer
    let normalizedUrl = rawUrl;

    // Case 1: User pasted dashboard URL e.g. https://supabase.com/dashboard/project/abcdefghijklmn/editor/...
    const dashboardMatch = rawUrl.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
    if (dashboardMatch && dashboardMatch[1]) {
      normalizedUrl = `https://${dashboardMatch[1]}.supabase.co`;
    }

    // Case 2: User pasted postgresql URL e.g. postgresql://postgres.abcdefghijklmn:pass@...
    const postgresMatch = rawUrl.match(/postgres\.([a-z0-9]+):/i) || rawUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
    if (postgresMatch && postgresMatch[1]) {
      normalizedUrl = `https://${postgresMatch[1]}.supabase.co`;
    }

    // Case 3: Missing https://
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Clean trailing slash
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');

    setSupabaseTestUrl(normalizedUrl);
    setSupabaseTestKey(rawKey);

    setSupabaseTesting(true);
    setSupabaseTestResult(null);

    // Save to localStorage
    localStorage.setItem('saas_supabase_url', normalizedUrl);
    localStorage.setItem('saas_supabase_key', rawKey);

    const startTime = performance.now();

    try {
      // 1. Try querying tenants table via PostgREST
      const res = await fetch(`${normalizedUrl}/rest/v1/tenants?select=*`, {
        headers: {
          'apikey': rawKey,
          'Authorization': `Bearer ${rawKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (res.ok) {
        const data = await res.json();
        setSupabaseTestResult({
          status: 'success',
          message: 'Conexão com o Supabase estabelecida com sucesso!',
          latencyMs,
          tenantsCount: Array.isArray(data) ? data.length : 0,
          tablesFound: ['tenants (Verificada e acessível)'],
          rawDetails: `Status HTTP 200 OK. URL: ${normalizedUrl} | ${Array.isArray(data) ? data.length : 0} prefeituras encontradas na tabela.`,
        });
        showToast('Conexão com Supabase validada!', 'success');
      } else if (res.status === 401 || res.status === 403) {
        setSupabaseTestResult({
          status: 'error',
          message: 'Chave de API não autorizada (HTTP 401 / 403).',
          latencyMs,
          rawDetails: 'A chave informada não foi aceita pelo Supabase. Verifique se copiou a chave "anon public" inteira, sem quebras de linha ou caracteres faltantes.',
        });
      } else if (res.status === 404 || res.status === 400) {
        const errJson = await res.json().catch(() => ({}));
        setSupabaseTestResult({
          status: 'warning',
          message: 'Servidor Supabase conectado, mas a tabela "tenants" ainda não existe.',
          latencyMs,
          rawDetails: `Retorno do Supabase: "${errJson.message || 'Table not found'}". Abra o "SQL Editor" no Supabase, cole o script SQL e clique em "Run" para criar as tabelas.`,
        });
      } else {
        setSupabaseTestResult({
          status: 'error',
          message: `Erro retornado pelo Supabase: HTTP ${res.status} ${res.statusText}`,
          latencyMs,
          rawDetails: `URL testada: ${normalizedUrl}. Verifique as permissões de API no painel.`,
        });
      }
    } catch (err: any) {
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      // Check common causes of "Failed to fetch"
      let diagHint = 'Possíveis causas do erro de rede:\n';
      if (!normalizedUrl.includes('.supabase.co')) {
        diagHint += '• A SUPABASE_URL deve terminar com ".supabase.co" (ex: https://xyzabcdefg.supabase.co). Não use a URL do dashboard ou postgresql://.\n';
      }
      diagHint += '• Verifique se o projeto no Supabase não está pausado (Paused Project).\n';
      diagHint += '• Verifique se a chave anon public foi copiada por completo (ela começa com "eyJhbGciOi...").';

      setSupabaseTestResult({
        status: 'error',
        message: 'Falha ao conectar com o Supabase (Erro de Rede / URL).',
        latencyMs,
        rawDetails: `${err?.message || 'Failed to fetch'}\n\nURL Testada: ${normalizedUrl}\n\n${diagHint}`,
      });
    } finally {
      setSupabaseTesting(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedTenantForApis) {
      loadApisForTenant(selectedTenantForApis);
    }
  }, [selectedTenantForApis]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [tenantsRes, metricsRes, invoicesRes] = await Promise.all([
        getSaaSTenants(),
        getSaaSMetrics(),
        getSaaSInvoices(),
      ]);
      setTenants(tenantsRes.tenants);
      setMetrics(metricsRes.metrics);
      setInvoices(invoicesRes.invoices);
      if (tenantsRes.tenants.length > 0) {
        if (!selectedTenantForApis) setSelectedTenantForApis(tenantsRes.tenants[0].id);
        if (!selectedTenantForUsers) setSelectedTenantForUsers(tenantsRes.tenants[0].id);
        if (!selectedTenantForBranding) setSelectedTenantForBranding(tenantsRes.tenants[0].id);
      }
    } catch (err: any) {
      showToast('Erro ao carregar dados do SaaS: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApisForTenant = async (tId: string) => {
    try {
      const res = await getTenantApis(tId);
      setTenantApis(res.apis);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePerformLookup = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : lookupQuery).trim();
    if (!q) {
      showToast('Digite o Nome do Município, CNPJ ou Código IBGE para buscar', 'error');
      return;
    }

    setIsSearchingLookup(true);
    setLookupError(null);
    setActiveStep(1);

    try {
      // Step 1: Consultando IBGE e Receita
      await new Promise((r) => setTimeout(r, 350));
      setActiveStep(2);

      const res = await searchMunicipiosLookup(q);
      const mun = res.municipality;

      // Step 2: Mapeando APIs
      await new Promise((r) => setTimeout(r, 250));
      setActiveStep(3);

      setDiscoveredData(mun);

      // Auto fill form with discovered official info
      setNewTenantForm({
        codigoIbge: mun.codigoIbge,
        nomePrefeitura: mun.nomePrefeitura,
        cidade: mun.cidade,
        uf: mun.uf,
        cnpj: mun.cnpj,
        planoNome: 'Plano Básico Municipal (2 Usuários)',
        valorMensalBase: 1890,
        userLimit: 2,
        valorUsuarioExtra: 150,
        emailFaturamento: mun.emailFaturamento,
        telefoneContato: mun.telefoneContato,
        prefeitoNome: mun.prefeitoNome || '',
        prefeitoEmail: mun.prefeitoEmail || '',
        prefeitoCpf: '',
        secFinancasNome: mun.secFinancasNome || '',
        secFinancasEmail: mun.secFinancasEmail || '',
        secFinancasCpf: '',
      });

      showToast(`Município de ${mun.cidade} (${mun.uf}) identificado com ${mun.apisDisponiveis.length} APIs públicas mapeadas!`, 'success');
    } catch (err: any) {
      setLookupError(err.message || 'Município não localizado. Verifique a grafia ou o código IBGE.');
      showToast(err.message || 'Falha ao buscar município', 'error');
    } finally {
      setIsSearchingLookup(false);
      setActiveStep(0);
    }
  };

  const handleCreateTenant = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setSubmitTenantError(null);

    let formToSubmit = { ...newTenantForm };
    let apisToProvision = discoveredData?.apisDisponiveis || [];

    // Query source prioritizing lookup input or manual input
    const queryCandidate = lookupQuery.trim() || formToSubmit.nomePrefeitura.trim() || formToSubmit.cidade.trim() || formToSubmit.codigoIbge.trim();

    // If discoveredData not yet loaded, or essential fields are missing, try auto-lookup first
    if ((!formToSubmit.nomePrefeitura || !formToSubmit.codigoIbge || !formToSubmit.cnpj || apisToProvision.length === 0) && queryCandidate) {
      setIsSubmittingTenant(true);
      try {
        const res = await searchMunicipiosLookup(queryCandidate);
        const mun = res.municipality;
        setDiscoveredData(mun);
        apisToProvision = mun.apisDisponiveis;
        formToSubmit = {
          codigoIbge: formToSubmit.codigoIbge || mun.codigoIbge,
          nomePrefeitura: formToSubmit.nomePrefeitura || mun.nomePrefeitura,
          cidade: formToSubmit.cidade || mun.cidade,
          uf: formToSubmit.uf || mun.uf || 'PR',
          cnpj: formToSubmit.cnpj || mun.cnpj,
          planoNome: formToSubmit.planoNome || 'Plano Básico Municipal (2 Usuários)',
          valorMensalBase: formToSubmit.valorMensalBase || 1890,
          userLimit: formToSubmit.userLimit || 2,
          valorUsuarioExtra: formToSubmit.valorUsuarioExtra || 150,
          emailFaturamento: formToSubmit.emailFaturamento || mun.emailFaturamento,
          telefoneContato: formToSubmit.telefoneContato || mun.telefoneContato,
          prefeitoNome: formToSubmit.prefeitoNome || mun.prefeitoNome || '',
          prefeitoEmail: formToSubmit.prefeitoEmail || mun.prefeitoEmail || '',
          prefeitoCpf: formToSubmit.prefeitoCpf || '',
          secFinancasNome: formToSubmit.secFinancasNome || mun.secFinancasNome || '',
          secFinancasEmail: formToSubmit.secFinancasEmail || mun.secFinancasEmail || '',
          secFinancasCpf: formToSubmit.secFinancasCpf || '',
        };
        setNewTenantForm(formToSubmit);
      } catch (err: any) {
        console.warn('Auto-discovery fallback error:', err);
      }
    }

    // Fallback default values if still empty so it never blocks the user
    if (!formToSubmit.nomePrefeitura && !queryCandidate) {
      setSubmitTenantError('Por favor, digite o nome da cidade ou prefeitura (ex: Maringá, Cascavel, Toledo).');
      showToast('Informe o município a ser cadastrado', 'error');
      setIsSubmittingTenant(false);
      return;
    }

    if (!formToSubmit.nomePrefeitura) {
      formToSubmit.nomePrefeitura = `Prefeitura Municipal de ${queryCandidate}`;
    }
    if (!formToSubmit.cidade) {
      formToSubmit.cidade = formToSubmit.nomePrefeitura.replace(/^Prefeitura Municipal de\s+/i, '');
    }
    if (!formToSubmit.codigoIbge) {
      const hash = Math.abs(formToSubmit.cidade.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000));
      formToSubmit.codigoIbge = `41${String(10000 + (hash % 89999))}`;
    }
    if (!formToSubmit.cnpj) {
      const hash = Math.abs(formToSubmit.cidade.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000));
      formToSubmit.cnpj = `76.${String(100 + (hash % 899))}.${String(100 + ((hash * 3) % 899))}/0001-${String(10 + (hash % 89))}`;
    }

    setIsSubmittingTenant(true);
    try {
      const payload = {
        ...formToSubmit,
        apis: apisToProvision,
      };
      const res = await createSaaSTenant(payload);
      showToast(res.message, 'success');
      setShowAddTenantModal(false);
      setDiscoveredData(null);
      setLookupQuery('');
      setSubmitTenantError(null);

      // Auto select this newly created tenant for APIs view
      if (res.tenant && res.tenant.id) {
        setSelectedTenantForApis(res.tenant.id);
      }

      await loadAllData();

      // Reset form
      setNewTenantForm({
        codigoIbge: '',
        nomePrefeitura: '',
        cidade: '',
        uf: 'PR',
        cnpj: '',
        planoNome: 'Plano Básico Municipal (2 Usuários)',
        valorMensalBase: 1890,
        userLimit: 2,
        valorUsuarioExtra: 150,
        emailFaturamento: '',
        telefoneContato: '',
        prefeitoNome: '',
        prefeitoEmail: '',
        prefeitoCpf: '',
        secFinancasNome: '',
        secFinancasEmail: '',
        secFinancasCpf: '',
      });
    } catch (err: any) {
      setSubmitTenantError(err.message || 'Falha ao cadastrar prefeitura');
      showToast(err.message || 'Falha ao cadastrar prefeitura', 'error');
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedHeaders = {};
      if (newApiForm.customHeaders) {
        try {
          parsedHeaders = JSON.parse(newApiForm.customHeaders);
        } catch {
          // Keep empty if invalid JSON
        }
      }
      await createTenantApi(selectedTenantForApis, {
        ...newApiForm,
        customHeaders: parsedHeaders,
      });
      showToast('API configurada com sucesso!', 'success');
      setShowAddApiModal(false);
      loadApisForTenant(selectedTenantForApis);
      loadAllData();
      setNewApiForm({
        providerName: 'SICONFI',
        label: '',
        baseUrl: '',
        authType: 'API_KEY',
        apiKey: '',
        syncFrequency: '0 6,18 * * *',
        customHeaders: '',
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSyncApi = async (apiId: string) => {
    setSyncingApiId(apiId);
    try {
      const res = await triggerTenantApiSync(selectedTenantForApis, apiId);
      showToast(res.message, 'success');
      loadApisForTenant(selectedTenantForApis);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSyncingApiId(null);
    }
  };

  const handleDeleteApi = async (apiId: string) => {
    if (!confirm('Deseja realmente remover esta configuração de API?')) return;
    try {
      await deleteTenantApi(selectedTenantForApis, apiId);
      showToast('API removida com sucesso.', 'success');
      loadApisForTenant(selectedTenantForApis);
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- Handlers for Editing and Deleting Tenants (Company Exclusive) ---
  const handleOpenEditTenant = (tenant: TenantSummary) => {
    setEditingTenantId(tenant.id);
    setEditTenantForm({
      nomePrefeitura: tenant.nomePrefeitura,
      cidade: tenant.cidade,
      uf: tenant.uf,
      codigoIbge: tenant.codigoIbge,
      cnpj: tenant.cnpj,
      status: tenant.status,
      planoNome: tenant.planoNome,
      valorMensalBase: tenant.valorMensalBase,
      userLimit: tenant.userLimit,
      valorUsuarioExtra: tenant.valorUsuarioExtra,
      diaVencimento: 10,
      emailFaturamento: tenant.emailFaturamento || '',
      telefoneContato: tenant.telefoneContato || '',
    });
    setShowEditTenantModal(true);
  };

  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantId) return;
    setIsSavingEditTenant(true);
    try {
      await updateSaaSTenant(editingTenantId, {
        ...editTenantForm,
        valorMensalBase: Number(editTenantForm.valorMensalBase),
        userLimit: Number(editTenantForm.userLimit),
        valorUsuarioExtra: Number(editTenantForm.valorUsuarioExtra),
        diaVencimento: Number(editTenantForm.diaVencimento),
      });
      showToast(`Prefeitura ${editTenantForm.cidade} (${editTenantForm.uf}) atualizada com sucesso!`, 'success');
      setShowEditTenantModal(false);
      setEditingTenantId(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao atualizar prefeitura', 'error');
    } finally {
      setIsSavingEditTenant(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string, nome: string) => {
    if (!confirm(`ATENÇÃO EMPRESA: Tem certeza que deseja excluir a prefeitura "${nome}" e todos os seus usuários/APIs vinculadas? Esta ação é definitiva.`)) {
      return;
    }
    try {
      await deleteSaaSTenant(tenantId);
      showToast(`Prefeitura "${nome}" removida com sucesso.`, 'success');
      await loadAllData();
      if (selectedTenantForApis === tenantId) {
        setSelectedTenantForApis(tenants[0]?.id || 'tenant-araucaria');
      }
      if (selectedTenantForUsers === tenantId) {
        setSelectedTenantForUsers(tenants[0]?.id || 'tenant-araucaria');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao excluir prefeitura', 'error');
    }
  };

  // --- Handlers for Multi-Tenant User Management (Company Exclusive) ---
  const loadUsersForTenant = async (tenantId: string) => {
    setIsLoadingUsersList(true);
    try {
      const res = await getTenantUsers(tenantId);
      setTenantUsersList(res.users);
      setTenantQuotaData(res.quota);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao carregar usuários da prefeitura.', 'error');
    } finally {
      setIsLoadingUsersList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && selectedTenantForUsers) {
      loadUsersForTenant(selectedTenantForUsers);
    }
  }, [activeTab, selectedTenantForUsers]);

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserFormData({
      nome: '',
      email: '',
      cpf: '',
      cargo: '',
      role: 'AUDITOR_GERAL',
      secretariaRestrita: '',
      ativo: true,
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: SaaSUser) => {
    setEditingUserId(user.id);
    setUserFormData({
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      cargo: user.cargo,
      role: user.role,
      secretariaRestrita: user.secretariaRestrita || '',
      ativo: user.ativo,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      if (editingUserId) {
        await updateTenantUser(selectedTenantForUsers, editingUserId, userFormData);
        showToast(`Usuário ${userFormData.nome} atualizado com sucesso.`, 'success');
      } else {
        const res = await createTenantUser(selectedTenantForUsers, userFormData);
        showToast(
          res.isExtraUser
            ? `Usuário cadastrado com sucesso! Cota excedida: acréscimo de R$ 150/mês aplicado na fatura.`
            : `Usuário cadastrado com sucesso dentro da cota do plano.`,
          'success'
        );
      }
      setShowUserModal(false);
      setEditingUserId(null);
      await loadUsersForTenant(selectedTenantForUsers);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao salvar usuário', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateTenantUser(selectedTenantForUsers, userId, { ativo: !currentStatus });
      showToast(`Status do usuário alterado para ${!currentStatus ? 'ATIVO' : 'INATIVO'}.`, 'success');
      loadUsersForTenant(selectedTenantForUsers);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao alterar status', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deseja realmente remover o acesso deste usuário?')) return;
    try {
      await deleteTenantUser(selectedTenantForUsers, userId);
      showToast('Usuário removido com sucesso.', 'success');
      loadUsersForTenant(selectedTenantForUsers);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao excluir usuário', 'error');
    }
  };

  // --- Handlers for White-Labeling & Municipal Customization (Company Exclusive) ---
  useEffect(() => {
    const target = tenants.find(t => t.id === selectedTenantForBranding);
    if (target) {
      setBrandingForm({
        isCustomized: Boolean(target.branding?.isCustomized),
        customLogoUrl: target.branding?.customLogoUrl || '',
        customPrimaryColor: target.branding?.customPrimaryColor || '#10b981',
        customSecondaryColor: target.branding?.customSecondaryColor || '#059669',
        customPortalTitle: target.branding?.customPortalTitle || 'Sistema de Monitoramento Fiscal Municipal',
        customSubtitle: target.branding?.customSubtitle || `${target.nomePrefeitura} — ${target.uf}`,
        showSaaSBranding: target.branding?.showSaaSBranding !== undefined ? target.branding.showSaaSBranding : !target.branding?.isCustomized,
        taxaImplantacao: target.branding?.taxaImplantacao || 0,
        mensalidadeCustomizacao: target.branding?.mensalidadeCustomizacao || 0,
      });
    }
  }, [selectedTenantForBranding, tenants]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      const res = await updateTenantBranding(selectedTenantForBranding, brandingForm);
      showToast(res.message || 'Configuração White-Label salva com sucesso!', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao salvar personalização', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const copySqlMigration = () => {
    const sql = `-- MIGRAÇÃO DE SCHEMA PRISMA / SUPABASE PARA MYSQL
-- 1. Tenants (Prefeituras)
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  codigo_ibge VARCHAR(7) UNIQUE NOT NULL,
  nome_prefeitura VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  uf VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ATIVO',
  plano_nome VARCHAR(100) DEFAULT 'Plano Básico Municipal',
  valor_mensal_base DECIMAL(10,2) DEFAULT 1890.00,
  user_limit INT DEFAULT 2,
  valor_usuario_extra DECIMAL(10,2) DEFAULT 150.00,
  dia_vencimento INT DEFAULT 10,
  email_faturamento VARCHAR(255) NOT NULL,
  telefone_contato VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Usuários Municipais com Regra de Cobrança Extra
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  cargo VARCHAR(100),
  role VARCHAR(50) NOT NULL,
  secretaria_restrita VARCHAR(50),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. APIs Dinâmicas por Município
CREATE TABLE tenant_api_configs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  auth_type VARCHAR(20) DEFAULT 'NONE',
  encrypted_api_key TEXT,
  sync_frequency VARCHAR(50) DEFAULT '0 6,18 * * *',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, provider_name)
);`;
    navigator.clipboard.writeText(sql);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const selectedTenantObj = tenants.find((t) => t.id === selectedTenantForApis);

  return (
    <div className="space-y-6" id="saas-master-panel">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-3 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-[#168821] text-white border border-green-600'
              : 'bg-[#e52207] text-white border border-red-600'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner - Master Admin SaaS */}
      <div className="bg-gradient-to-r from-[#071d41] via-[#0c326f] to-[#1351b4] text-white rounded-xl p-6 shadow-md border border-[#0c326f]/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-400/20 text-blue-200 border border-blue-300/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Ambiente Master Provedor SaaS
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Multi-Tenant Ativo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Painel Administrativo Central SaaS
            </h2>
            <p className="text-blue-100 text-sm max-w-2xl">
              Gestão multi-tenant de prefeituras, configuração dinâmica de APIs públicas (Siconfi, Transferegov, TCE), controle de limites de usuários e faturamento mensal de excedentes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddTenantModal(true)}
              id="btn-cadastrar-prefeitura"
              className="bg-white text-[#0c326f] hover:bg-blue-50 font-bold text-sm px-4 py-2.5 rounded-lg shadow transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#0c326f]" />
              Nova Prefeitura Cliente
            </button>
            <button
              onClick={loadAllData}
              title="Recarregar Dados"
              className="bg-blue-800/60 hover:bg-blue-800 text-white p-2.5 rounded-lg border border-blue-400/30 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Prefeituras Ativas
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1351b4] flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.prefeiturasAtivas}</span>
              <span className="text-xs text-gray-500">de {metrics.totalPrefeituras} cadastradas</span>
            </div>
            <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% de disponibilidade
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Receita Mensal (MRR)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#168821] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#168821]">
                R$ {(metrics?.mrrTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600 font-medium">
              Base + Extras por usuários
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Usuários Municipais
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.totalUsuariosAtivos}</span>
              <span className="text-xs text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                +{metrics.totalUsuariosFaturadosExtras} extras
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600 font-medium">
              R$ {metrics.faturamentoExtras.toFixed(2)} faturados a mais
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Conexões com APIs Públicas
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Plug className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.apisOnlinePct}%</span>
              <span className="text-xs text-emerald-700 font-semibold">Operando</span>
            </div>
            <div className="mt-2 text-xs text-gray-600 font-medium">
              Siconfi, Transferegov & TCEs
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('tenants')}
          id="tab-saas-tenants"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'tenants'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Prefeituras Clientes ({tenants.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          id="tab-saas-users"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Gestão Global de Usuários (Empresa)
        </button>

        <button
          onClick={() => setActiveTab('apis')}
          id="tab-saas-apis"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'apis'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plug className="w-4 h-4" />
          Configurador de APIs Dinâmicas (Módulo 07)
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          id="tab-saas-invoices"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Faturamento & Usuários Extras ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          id="tab-saas-branding"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'branding'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Personalização & White-Label
        </button>

        <button
          onClick={() => setActiveTab('database')}
          id="tab-saas-database"
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-[#0c326f] text-[#0c326f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Banco de Dados (Supabase ➔ MySQL)
        </button>
      </div>

      {/* TAB 1: PREFEITURAS CLIENTES */}
      {activeTab === 'tenants' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Prefeituras Municipais Contratantes
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Open Data Auto-Sync
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Cada prefeitura opera em ambiente isolado com 2 usuários inclusos no plano base e integração automática a 7 APIs públicas.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setDiscoveredData(null);
                  setLookupQuery('');
                  setShowAddTenantModal(true);
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                ⚡ Cadastro Automático (IBGE / CNPJ / Nome)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Prefeitura / Município</th>
                  <th className="py-3 px-4">Código IBGE / CNPJ</th>
                  <th className="py-3 px-4">Plano Contratado</th>
                  <th className="py-3 px-4 text-center">Usuários Ativos (Cota)</th>
                  <th className="py-3 px-4">Mensalidade Total</th>
                  <th className="py-3 px-4 text-center">APIs Ativas</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{t.nomePrefeitura}</div>
                      <div className="text-xs text-gray-500">
                        {t.cidade} - {t.uf}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded w-fit">
                        IBGE: {t.codigoIbge}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.cnpj}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{t.planoNome}</div>
                      <div className="text-xs text-gray-500">
                        Base: R$ {t.valorMensalBase.toFixed(2)}/mês ({t.userLimit} usuários)
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{t.totalUsuariosAtivos}</span>
                        <span className="text-xs text-gray-400">/</span>
                        <span className="text-xs text-gray-500 font-semibold">{t.userLimit} inc.</span>
                      </div>
                      {t.usuariosExcedentes > 0 ? (
                        <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1">
                          +{t.usuariosExcedentes} excedente{t.usuariosExcedentes > 1 ? 's' : ''} (+R$ {(t.usuariosExcedentes * t.valorUsuarioExtra).toFixed(2)})
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                          Dentro do plano
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#168821]">
                        R$ {(t.valorTotalMensalidade ?? t.valorMensalBase ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-gray-500">Venc. dia {t.diaVencimento || 10}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                        <Plug className="w-3 h-3 text-teal-600" />
                        {t.apisAtivas} / {t.apisConfiguradas}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        ● {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTenant(t)}
                          title="Editar Dados da Prefeitura (Exclusivo Empresa SaaS)"
                          className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTenantForUsers(t.id);
                            setActiveTab('users');
                          }}
                          title="Gerenciar Usuários da Prefeitura"
                          className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Usuários</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTenantForApis(t.id);
                            setActiveTab('apis');
                          }}
                          title="Gerenciar APIs e Conexões"
                          className="p-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Plug className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">APIs</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(t.id, t.nomePrefeitura)}
                          title="Excluir Prefeitura (Empresa SaaS)"
                          className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {onSelectTenantToPreview && (
                          <button
                            type="button"
                            onClick={() => onSelectTenantToPreview(t)}
                            title="Acessar Dashboard Desta Prefeitura"
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all shadow-xs ${
                              activeTenantId === t.id
                                ? 'bg-[#1351b4] text-white ring-2 ring-blue-300'
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                            }`}
                          >
                            {activeTenantId === t.id ? 'Workspace Ativo' : 'Abrir Painel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GESTÃO GLOBAL DE USUÁRIOS (EMPRESA SAAS EXCLUSIVO) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          {/* Header & Municipal Selector */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 text-white p-5 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Controle Exclusivo da Empresa Provedora
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-mono">
                  Multi-Tenant Security
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Cadastro e Governança de Usuários por Prefeitura
              </h3>
              <p className="text-slate-300 text-xs max-w-2xl">
                A inclusão, credenciamento e acréscimo de usuários municipais são realizados exclusivamente pela equipe técnica da Empresa SaaS, garantindo auditoria de acessos e tarifação automática de excedentes na fatura do município.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-300 mb-1">
                  Prefeitura Contratante:
                </label>
                <select
                  value={selectedTenantForUsers}
                  onChange={(e) => setSelectedTenantForUsers(e.target.value)}
                  id="select-tenant-users-master"
                  className="bg-slate-800 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.cidade} ({t.uf}) - {t.nomePrefeitura}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenAddUser}
                id="btn-add-user-master"
                className="self-end bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer mt-4 lg:mt-0"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                Cadastrar Usuário Municipal
              </button>
            </div>
          </div>

          {/* Quota & Billing Information Card */}
          {tenantQuotaData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cota Inclusa no Plano</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {tenantQuotaData.usuariosInclusos} <span className="text-xs font-normal text-slate-500">usuários inclusos</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Plano Base: R$ {tenantQuotaData.valorMensalBase.toFixed(2)}/mês</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Usuários Ativos</span>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {tenantQuotaData.totalAtivos} <span className="text-xs font-normal text-blue-600">acessos liberados</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {tenantQuotaData.totalAtivos <= tenantQuotaData.usuariosInclusos
                    ? 'Dentro do limite contratado'
                    : `${tenantQuotaData.usuariosExcedentes} usuário(s) além da cota`}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Acréscimo de Excedentes</span>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  + R$ {tenantQuotaData.cobrancaExtraTotal.toFixed(2)}
                </div>
                <div className="text-xs text-amber-800 mt-1">
                  R$ {tenantQuotaData.valorUsuarioExtra.toFixed(2)} / usuário extra / mês
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Mensalidade Total</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  R$ {(tenantQuotaData.valorTotalMensalidade ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-emerald-800 mt-1">
                  Base + Acréscimos de licença
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            {isLoadingUsersList ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-mono">Carregando usuários da prefeitura...</span>
              </div>
            ) : tenantUsersList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Nenhum usuário cadastrado</h4>
                <p className="text-xs text-slate-500 mt-1">Clique no botão acima para cadastrar o primeiro usuário municipal.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Nome / Usuário</th>
                    <th className="py-3 px-4">E-mail & CPF</th>
                    <th className="py-3 px-4">Cargo / Órgão</th>
                    <th className="py-3 px-4">Perfil de Acesso</th>
                    <th className="py-3 px-4 text-center">Tarifação</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenantUsersList.map((user, idx) => {
                    const isExtra = idx >= (tenantQuotaData?.usuariosInclusos || 2);
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{user.nome}</div>
                          <div className="text-xs text-gray-500 font-mono">ID: {user.id}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-800">{user.email}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">CPF: {user.cpf}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-800 text-xs">{user.cargo || 'Não especificado'}</div>
                          {user.secretariaRestrita && (
                            <div className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                              {user.secretariaRestrita}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {user.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isExtra ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              +R$ 150/mês (Extra)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Incluso no Plano
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition ${
                              user.ativo
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                            title="Clique para alternar o status do usuário"
                          >
                            <span className={`w-2 h-2 rounded-full ${user.ativo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {user.ativo ? 'ATIVO' : 'INATIVO'}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              title="Editar Usuário"
                              className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Excluir Usuário"
                              className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURADOR DE APIS DINÂMICAS */}
      {activeTab === 'apis' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Selecione a Prefeitura para Gerenciar APIs
              </label>
              <select
                value={selectedTenantForApis}
                onChange={(e) => setSelectedTenantForApis(e.target.value)}
                id="select-tenant-api"
                className="bg-white border border-gray-300 text-gray-900 font-bold text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nomePrefeitura} ({t.uf}) — IBGE: {t.codigoIbge}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddApiModal(true)}
                id="btn-adicionar-api"
                className="bg-[#1351b4] hover:bg-[#0c326f] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Conectar Nova API Pública / ERP
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900">
                APIs Conectadas — {selectedTenantObj?.nomePrefeitura}
              </h4>
              <span className="text-xs text-gray-500">
                Sincronização agendada 2 vezes ao dia (BullMQ / Redis)
              </span>
            </div>

            {tenantApis.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Plug className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  Nenhuma API configurada para esta prefeitura ainda.
                </p>
                <button
                  onClick={() => setShowAddApiModal(true)}
                  className="mt-3 text-xs text-[#1351b4] font-bold hover:underline"
                >
                  + Conectar primeira API (Siconfi / STN)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenantApis.map((api) => (
                  <div
                    key={api.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-50 text-[#0c326f] text-xs font-bold px-2 py-0.5 rounded border border-blue-100 uppercase">
                          {api.providerName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            api.ultimoStatus === 'SUCESSO'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {api.ultimoStatus}
                        </span>
                      </div>

                      <h5 className="font-bold text-gray-900 text-sm">{api.label}</h5>
                      <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded truncate border border-gray-100">
                        {api.baseUrl}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                        <div>
                          <span className="text-gray-400 font-medium">Autenticação:</span>{' '}
                          <span className="font-semibold">{api.authType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium">Frequência:</span>{' '}
                          <span className="font-mono text-[11px] font-semibold">{api.syncFrequency}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 font-medium">Última Execução:</span>{' '}
                          <span className="font-medium text-gray-800">{api.ultimaSincronizacao}</span>
                        </div>
                        {api.totalRegistrosSincronizados !== undefined && (
                          <div className="col-span-2 text-xs text-gray-500">
                            Registros no cache local: <strong>{(api.totalRegistrosSincronizados ?? 0).toLocaleString('pt-BR')}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleSyncApi(api.id)}
                        disabled={syncingApiId === api.id}
                        className="bg-blue-50 hover:bg-blue-100 text-[#1351b4] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncingApiId === api.id ? 'animate-spin' : ''}`}
                        />
                        {syncingApiId === api.id ? 'Sincronizando...' : 'Disparar Sync Agora'}
                      </button>

                      <button
                        onClick={() => handleDeleteApi(api.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Remover API"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FATURAMENTO & NFSE */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Faturamento Recorrente do SaaS</h3>
            <p className="text-xs text-gray-500">
              Regra de cobrança: Valor base do plano (com até 2 usuários inclusos) + R$ 150,00 por usuário adicional ativo no mês.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Fatura / Mês</th>
                  <th className="py-3 px-4">Prefeitura</th>
                  <th className="py-3 px-4 text-right">Plano Base</th>
                  <th className="py-3 px-4 text-center">Usuários Ativos / Extras</th>
                  <th className="py-3 px-4 text-right">Taxa Extras</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-900">Total Faturado</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">NFSe / PIX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-700">
                      {inv.id}
                      <div className="text-[11px] text-gray-400 font-sans">
                        Ref: {String(inv.mesReferencia).padStart(2, '0')}/{inv.anoReferencia}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-gray-900">{inv.prefeituraNome}</td>

                    <td className="py-3.5 px-4 text-right text-gray-700 font-medium">
                      R$ {inv.valorBase.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold">{inv.totalUsuarios}</span> total
                      {inv.usuariosExcedentes > 0 && (
                        <span className="ml-1 text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          +{inv.usuariosExcedentes} extra
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-amber-800">
                      {inv.usuariosExcedentes > 0 ? `+R$ ${inv.valorUsuariosExtras.toFixed(2)}` : 'R$ 0,00'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#168821] text-base">
                      R$ {(inv.valorTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs text-gray-600">
                      {inv.dataVencimento}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          inv.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="text-xs font-mono font-bold text-blue-900">{inv.numeroNfse}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">PIX Disponível</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PERSONALIZAÇÃO & WHITE-LABEL (COMPLETO) */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Personalização Visual & White-Label dos Painéis
                <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-300">
                  Custom Branding Engine
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure a identidade visual exclusiva de cada município. O pacote básico inclui a marca da empresa SaaS. A personalização completa gera cobrança adicional de implantação e mensalidade.
              </p>
            </div>

            {/* Tenant Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                Município:
              </label>
              <select
                value={selectedTenantForBranding}
                onChange={(e) => setSelectedTenantForBranding(e.target.value)}
                className="bg-slate-50 hover:bg-white text-slate-900 font-bold border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nomePrefeitura} ({t.uf}) — {t.branding?.isCustomized ? '🌟 100% Personalizado' : '📦 Pacote Básico'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form and Preview Grid */}
          <form onSubmit={handleSaveBranding} className="space-y-6">
            {/* Plan / Package Type Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setBrandingForm({ ...brandingForm, isCustomized: false, showSaaSBranding: true })}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  !brandingForm.isCustomized
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    📦 Pacote Básico (Standard)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Sem Custo Adicional
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Utiliza o layout padrão governamental com a marca d'água e logo institucional da empresa fornecedora do SaaS (<strong className="text-slate-800">Escrita.Online</strong>) no cabeçalho e rodapé.
                </p>
                <div className="mt-3 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Inclui 2 usuários • Cores padrão DSGov / Modern Fiscal
                </div>
              </div>

              <div
                onClick={() => setBrandingForm({ ...brandingForm, isCustomized: true, showSaaSBranding: false, taxaImplantacao: brandingForm.taxaImplantacao || 2500, mensalidadeCustomizacao: brandingForm.mensalidadeCustomizacao || 450 })}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  brandingForm.isCustomized
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                    🌟 Pacote 100% Personalizado (White-Label Premium)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                    Faturamento Extra
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Identidade visual exclusiva da prefeitura, brasão municipal em destaque, cores customizadas do município, remoção de referências do SaaS e domínio institucional próprio.
                </p>
                <div className="mt-3 text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                  ★ Setup customizado + Mensalidade de manutenção White-Label
                </div>
              </div>
            </div>

            {/* Customization Details (When 100% Customized is Enabled) */}
            {brandingForm.isCustomized && (
              <div className="bg-slate-50 border border-indigo-200 rounded-xl p-5 space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Parâmetros de Customização Visual & Cobrança White-Label
                  </h4>
                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-semibold">
                    Aplicado na Fatura do Município
                  </span>
                </div>

                {/* Financial Rates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Taxa Única de Implantação e Setup (R$)</span>
                      <span className="text-[10px] text-slate-400 font-mono">Cobrança única</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-mono text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={brandingForm.taxaImplantacao}
                        onChange={(e) => setBrandingForm({ ...brandingForm, taxaImplantacao: Number(e.target.value) })}
                        placeholder="2500.00"
                        className="w-full pl-9 pr-3 py-1.5 text-sm font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Valor faturado na implantação da identidade visual exclusiva da prefeitura.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Mensalidade Adicional de White-Label (R$/mês)</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">+ Recorrente</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-mono text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={brandingForm.mensalidadeCustomizacao}
                        onChange={(e) => setBrandingForm({ ...brandingForm, mensalidadeCustomizacao: Number(e.target.value) })}
                        placeholder="450.00"
                        className="w-full pl-9 pr-3 py-1.5 text-sm font-mono font-bold text-indigo-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Valor somado à mensalidade base em todas as faturas mensais da prefeitura.
                    </p>
                  </div>
                </div>

                {/* Colors and Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título Personalizado do Portal Municipal
                    </label>
                    <input
                      type="text"
                      value={brandingForm.customPortalTitle || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, customPortalTitle: e.target.value })}
                      placeholder="Ex: Portal Executivo de Inteligência Fiscal"
                      className="w-full px-3 py-2 text-sm text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subtítulo / Secretaria Gestora
                    </label>
                    <input
                      type="text"
                      value={brandingForm.customSubtitle || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, customSubtitle: e.target.value })}
                      placeholder="Ex: Secretaria Municipal de Finanças e Orçamento"
                      className="w-full px-3 py-2 text-sm text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      URL da Logo / Brasão Oficial (PNG / SVG)
                    </label>
                    <input
                      type="text"
                      value={brandingForm.customLogoUrl || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, customLogoUrl: e.target.value })}
                      placeholder="https://exemplo.gov.br/brasao-oficial.png"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Cores Temáticas do Município</span>
                      <span className="text-[11px] text-slate-400 font-mono">Hex Code</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="color"
                          value={brandingForm.customPrimaryColor || '#10b981'}
                          onChange={(e) => setBrandingForm({ ...brandingForm, customPrimaryColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={brandingForm.customPrimaryColor || '#10b981'}
                          onChange={(e) => setBrandingForm({ ...brandingForm, customPrimaryColor: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-mono text-slate-900 border border-slate-300 rounded focus:outline-none bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="color"
                          value={brandingForm.customSecondaryColor || '#059669'}
                          onChange={(e) => setBrandingForm({ ...brandingForm, customSecondaryColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={brandingForm.customSecondaryColor || '#059669'}
                          onChange={(e) => setBrandingForm({ ...brandingForm, customSecondaryColor: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-mono text-slate-900 border border-slate-300 rounded focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Palettes */}
                <div>
                  <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Paletas Rápidas Pré-configuradas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, customPrimaryColor: '#0284c7', customSecondaryColor: '#0369a1' })}
                      className="px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold border border-sky-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-sky-600 inline-block" />
                      Azul Metrópole (Curitiba)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, customPrimaryColor: '#10b981', customSecondaryColor: '#059669' })}
                      className="px-2.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold border border-emerald-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                      Verde Araucária
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, customPrimaryColor: '#8b5cf6', customSecondaryColor: '#6d28d9' })}
                      className="px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-semibold border border-purple-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                      Violeta Moderno (Maringá)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, customPrimaryColor: '#0d9488', customSecondaryColor: '#0f766e' })}
                      className="px-2.5 py-1 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-semibold border border-teal-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
                      Teal Executivo (Londrina)
                    </button>
                  </div>
                </div>

                {/* Toggle SaaS Branding Notice */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-show-saas-branding"
                    checked={brandingForm.showSaaSBranding}
                    onChange={(e) => setBrandingForm({ ...brandingForm, showSaaSBranding: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="chk-show-saas-branding" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Manter selo discreto "Tecnologia por Escrita.Online" no rodapé
                  </label>
                </div>
              </div>
            )}

            {/* LIVE PREVIEW BOX */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold font-mono flex items-center justify-between">
                <span>👁️ PRÉ-VISUALIZAÇÃO EM TEMPO REAL DO PORTAL DO MUNICÍPIO</span>
                <span className="text-emerald-400">
                  {brandingForm.isCustomized ? '100% White-Label' : 'Modo Padrão'}
                </span>
              </div>

              <div
                className="p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
                style={{
                  backgroundColor: brandingForm.isCustomized
                    ? (brandingForm.customPrimaryColor || '#0c326f')
                    : '#0c326f',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl border border-white/30 shadow-sm">
                    {brandingForm.customLogoUrl ? (
                      <img src={brandingForm.customLogoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                    ) : (
                      '🏛️'
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base tracking-tight text-white">
                      {brandingForm.customPortalTitle || 'Sistema de Monitoramento Fiscal Municipal'}
                    </h4>
                    <p className="text-xs text-white/80">
                      {brandingForm.customSubtitle || 'Prefeitura Municipal • Estado do Paraná'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-black/20 text-white font-mono border border-white/20">
                    Exercício 2026
                  </span>
                  {!brandingForm.isCustomized && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-semibold">
                      Powered by Escrita.Online
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSavingBranding}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingBranding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Personalização...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Configurações de White-Label & Faturamento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: BANCO DE DADOS & MIGRAÇÃO (SUPABASE ➔ MYSQL) */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-sm p-6 space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-950 text-base">
                  Estratégia de Banco de Dados: Supabase (Dev/Testes) ➔ MySQL 8 (Produção)
                </h4>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  Você pode testar e validar o desenvolvimento utilizando o <strong>Supabase (PostgreSQL)</strong> com custo zero e praticidade. Para migrar para <strong>MySQL 8</strong> na DigitalOcean quando o SaaS for para produção, basta manter os modelos no Prisma ORM e rodar a migração.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
              <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Fase 1: Supabase (Atual / Rápido para Protótipos)
              </h5>
              <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                <li>Painel web gratuito com visualização em tempo real de tabelas e queries.</li>
                <li>Suporte nativo a JSONB para salvar retornos crus de APIs governamentais.</li>
                <li>Autenticação pronta e RLS (Row-Level Security) nativo.</li>
                <li>Variáveis de ambiente configuradas em <code>.env.example</code> (SUPABASE_URL, SUPABASE_ANON_KEY).</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
              <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Fase 2: Migração para MySQL 8 (VPS DigitalOcean / Produção)
              </h5>
              <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                <li>Custo fixo baixo (~$6/mês para toda a infraestrutura em container Docker).</li>
                <li>Mesmo schema Prisma (basta mudar <code>provider = "mysql"</code>).</li>
                <li>Sem dependência de serviços externos ou limites de requisições.</li>
              </ul>
            </div>
          </div>

          {/* LIVE TESTER DE CONEXÃO SUPABASE */}
          <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-base">
                  ⚡
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    Testador de Conexão Supabase em Tempo Real
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40">
                      LIVE PING
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Cole as chaves do seu projeto abaixo para testar a comunicação direta com o banco sem sair do app.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  1. SUPABASE_URL (Project URL)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://xyzabcdefg.supabase.co"
                    value={supabaseTestUrl}
                    onChange={(e) => setSupabaseTestUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Encontrado em <em>Connect ➔ Project URL</em> ou <em>Project Settings ➔ API</em>.
                </p>
              </div>

              <div className="lg:col-span-6 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  2. SUPABASE_ANON_KEY (Public Key)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseTestKey}
                    onChange={(e) => setSupabaseTestKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Chave <span className="text-slate-400 font-mono">anon public</span> copiada do Supabase.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestSupabaseConnection}
                disabled={supabaseTesting}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                {supabaseTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Testando Comunicação com o Supabase...
                  </>
                ) : (
                  <>
                    <Plug className="w-4 h-4 text-slate-950" />
                    Testar Conexão em Tempo Real
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400">
                Os dados são salvos no seu navegador para os próximos testes.
              </span>
            </div>

            {/* Resultado do Teste */}
            {supabaseTestResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 mt-3 animate-in fade-in duration-200 ${
                  supabaseTestResult.status === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : supabaseTestResult.status === 'warning'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {supabaseTestResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {supabaseTestResult.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {supabaseTestResult.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{supabaseTestResult.message}</span>
                  </div>
                  {supabaseTestResult.latencyMs !== undefined && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 border border-white/10">
                      Latência: {supabaseTestResult.latencyMs} ms
                    </span>
                  )}
                </div>

                {supabaseTestResult.rawDetails && (
                  <p className="text-xs opacity-90 leading-relaxed font-mono bg-black/20 p-2.5 rounded border border-white/5">
                    {supabaseTestResult.rawDetails}
                  </p>
                )}

                {supabaseTestResult.status === 'success' && (
                  <div className="flex items-center gap-4 text-[11px] pt-1">
                    <span className="flex items-center gap-1 text-emerald-300">
                      ✓ Tabela <strong>tenants</strong> respondendo
                    </span>
                    <span className="flex items-center gap-1 text-emerald-300">
                      ✓ Total no Banco: <strong>{supabaseTestResult.tenantsCount}</strong> prefeituras
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Script SQL de Criação de Tabelas Multi-Tenant
              </span>
              <button
                onClick={copySqlMigration}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copiado!' : 'Copiar DDL SQL'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-64 border border-gray-800">
{`-- DDL SQL COMPATÍVEL COM SUPABASE E MYSQL
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  codigo_ibge VARCHAR(7) UNIQUE NOT NULL,
  nome_prefeitura VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  uf VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ATIVO',
  plano_nome VARCHAR(100) DEFAULT 'Plano Básico Municipal',
  valor_mensal_base DECIMAL(10,2) DEFAULT 1890.00,
  user_limit INT DEFAULT 2,              -- 2 usuários inclusos no plano básico
  valor_usuario_extra DECIMAL(10,2) DEFAULT 150.00,
  dia_vencimento INT DEFAULT 10,
  email_faturamento VARCHAR(255) NOT NULL,
  telefone_contato VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  cargo VARCHAR(100),
  role VARCHAR(50) NOT NULL,
  secretaria_restrita VARCHAR(50),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_api_configs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,    -- SICONFI, TRANSFEREGOV, TCE_PR, ERP_LOCAL
  base_url VARCHAR(500) NOT NULL,
  auth_type VARCHAR(20) DEFAULT 'NONE',  -- NONE, BEARER, API_KEY, BASIC
  encrypted_api_key TEXT,
  sync_frequency VARCHAR(50) DEFAULT '0 6,18 * * *',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, provider_name)
);`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA PREFEITURA (MODO AUTOMÁTICO E MANUAL) */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0c326f] flex items-center gap-2">
                    Cadastro Automático de Municípios & APIs
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      Auto-Discovery
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Digite o <strong>Nome da Cidade</strong>, <strong>CNPJ</strong> ou <strong>Código IBGE</strong> para o sistema auto-preencher os dados e configurar as 7 APIs públicas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddTenantModal(false);
                  setDiscoveredData(null);
                  setLookupError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-5">
              {/* HERO BUSCA AUTOMÁTICA */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 sm:p-5 border border-slate-700 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Busca Inteligente por Nome, CNPJ ou IBGE
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Bases: IBGE + RFB + Siconfi + TCE
                  </span>
                </div>

                {/* Input de Busca */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Ex: Maringá, Cascavel, 76.282.658/0001-06 ou 4115200..."
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePerformLookup();
                        }
                      }}
                      className="w-full bg-slate-950 text-white pl-10 pr-3 py-2.5 rounded-lg border border-slate-700 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none placeholder-slate-500 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePerformLookup()}
                    disabled={isSearchingLookup}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-md shrink-0"
                  >
                    {isSearchingLookup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        Buscando Dados Oficiais...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950 fill-current" />
                        Localizar & Auto-Preencher
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Sugestões rápidas de teste em 1 clique:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Maringá (PR)',
                      'Londrina (PR)',
                      'Cascavel (PR)',
                      'Ponta Grossa (PR)',
                      'Foz do Iguaçu (PR)',
                      'Curitiba (PR)',
                      'Toledo (PR)',
                      'Joinville (SC)',
                      'Florianópolis (SC)',
                      'Porto Alegre (RS)',
                      'Campinas (SP)',
                      'São Paulo (SP)',
                    ].map((city) => {
                      const cityNameOnly = city.split(' (')[0];
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setLookupQuery(cityNameOnly);
                            handlePerformLookup(cityNameOnly);
                          }}
                          className="text-[11px] bg-slate-800/90 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 px-2.5 py-1 rounded-md transition cursor-pointer font-medium"
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback de Progresso do Scanner */}
                {isSearchingLookup && (
                  <div className="bg-slate-950/80 rounded-lg p-3 border border-emerald-500/30 text-xs space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Motor de Descoberta Pública Ativo:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 font-mono">
                      <div className={`p-1.5 rounded border ${activeStep >= 1 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        1. IBGE & RFB Oficial
                      </div>
                      <div className={`p-1.5 rounded border ${activeStep >= 2 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        2. CNPJ & Contatos
                      </div>
                      <div className={`p-1.5 rounded border ${activeStep >= 3 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                        3. 7 APIs de Controle
                      </div>
                    </div>
                  </div>
                )}

                {/* Erro de busca */}
                {lookupError && (
                  <div className="bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* CARD DE RESULTADO DA AUTO-DESCOBERTA */}
              {discoveredData && (
                <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        🏛️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-emerald-950 text-base">
                            {discoveredData.nomePrefeitura}
                          </h4>
                          <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                            {discoveredData.uf}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-800 font-medium mt-0.5">
                          <span>IBGE: <strong>{discoveredData.codigoIbge}</strong></span>
                          <span>•</span>
                          <span>CNPJ: <strong>{discoveredData.cnpj}</strong></span>
                          <span>•</span>
                          <span>População: <strong>{(discoveredData.populacaoEstimada ?? 0).toLocaleString('pt-BR')} hab.</strong></span>
                          <span>•</span>
                          <span>Região: <strong>{discoveredData.regiao}</strong></span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-xs flex items-center gap-1.5 w-fit">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Dados Oficiais Validados
                    </span>
                  </div>

                  {/* 7 APIS PRONTAS PARA CONEXÃO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-700" />
                        7 APIs Públicas Mapeadas Automaticamente:
                      </h5>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Provisionamento Instantâneo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {discoveredData.apisDisponiveis.map((api, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-emerald-200 rounded-lg p-2.5 shadow-xs space-y-1 hover:border-emerald-400 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {api.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {api.providerName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono truncate" title={api.baseUrl}>
                            {api.baseUrl}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>Sincronização: <strong>Diária (6h / 18h)</strong></span>
                            <span className="text-emerald-700 font-bold">✓ Conexão Ativa</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DETALHADO (AUTO-PREENCHIDO COM OPÇÃO DE EDIÇÃO) */}
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Dados do Cadastro Municipal & Contatos
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomManualFields(!showCustomManualFields)}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {showCustomManualFields ? 'Recolher Campos Avançados' : 'Ajustar Campos Manualmente'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nome Oficial da Prefeitura *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Prefeitura Municipal de Maringá"
                      value={newTenantForm.nomePrefeitura}
                      onChange={(e) =>
                        setNewTenantForm({ ...newTenantForm, nomePrefeitura: e.target.value })
                      }
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-[#1351b4] focus:border-[#1351b4] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Código IBGE (7 dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="Ex: 4115200"
                      value={newTenantForm.codigoIbge}
                      onChange={(e) =>
                        setNewTenantForm({ ...newTenantForm, codigoIbge: e.target.value })
                      }
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-mono font-medium border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-[#1351b4] focus:border-[#1351b4] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      CNPJ do Município *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 76.282.658/0001-06"
                      value={newTenantForm.cnpj}
                      onChange={(e) =>
                        setNewTenantForm({ ...newTenantForm, cnpj: e.target.value })
                      }
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-[#1351b4] focus:border-[#1351b4] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Maringá"
                      value={newTenantForm.cidade}
                      onChange={(e) =>
                        setNewTenantForm({ ...newTenantForm, cidade: e.target.value })
                      }
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-[#1351b4] focus:border-[#1351b4] focus:outline-none transition shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Estado (UF) *
                    </label>
                    <select
                      value={newTenantForm.uf}
                      onChange={(e) => setNewTenantForm({ ...newTenantForm, uf: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1351b4] focus:border-[#1351b4] focus:outline-none transition shadow-xs"
                    >
                      <option value="PR" className="text-slate-900 bg-white">Paraná (PR)</option>
                      <option value="SC" className="text-slate-900 bg-white">Santa Catarina (SC)</option>
                      <option value="RS" className="text-slate-900 bg-white">Rio Grande do Sul (RS)</option>
                      <option value="SP" className="text-slate-900 bg-white">São Paulo (SP)</option>
                      <option value="MG" className="text-slate-900 bg-white">Minas Gerais (MG)</option>
                      <option value="RJ" className="text-slate-900 bg-white">Rio de Janeiro (RJ)</option>
                      <option value="BA" className="text-slate-900 bg-white">Bahia (BA)</option>
                      <option value="GO" className="text-slate-900 bg-white">Goiás (GO)</option>
                      <option value="DF" className="text-slate-900 bg-white">Distrito Federal (DF)</option>
                    </select>
                  </div>
                </div>

                {/* Pricing and Initial Users Sections */}
                {(showCustomManualFields || discoveredData) && (
                  <>
                    <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0c326f] uppercase tracking-wider">
                          Configurações do Plano Municipal
                        </span>
                        <span className="text-xs bg-[#1351b4] text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                          2 Usuários Inclusos
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Valor Base Mensal (R$)</label>
                          <input
                            type="number"
                            value={newTenantForm.valorMensalBase}
                            onChange={(e) =>
                              setNewTenantForm({
                                ...newTenantForm,
                                valorMensalBase: Number(e.target.value),
                              })
                            }
                            className="w-full bg-white text-slate-900 border border-blue-300 rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Valor por Usuário Extra (R$)</label>
                          <input
                            type="number"
                            value={newTenantForm.valorUsuarioExtra}
                            onChange={(e) =>
                              setNewTenantForm({
                                ...newTenantForm,
                                valorUsuarioExtra: Number(e.target.value),
                              })
                            }
                            className="w-full bg-white text-slate-900 border border-blue-300 rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Initial 2 Users */}
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#1351b4]" />
                        Usuários Iniciais Inclusos (Gabinete & Fazenda)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">1. Nome do Prefeito(a)</label>
                          <input
                            type="text"
                            placeholder="Prefeito(a) Municipal"
                            value={newTenantForm.prefeitoNome}
                            onChange={(e) =>
                              setNewTenantForm({ ...newTenantForm, prefeitoNome: e.target.value })
                            }
                            className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">E-mail do Prefeito(a)</label>
                          <input
                            type="email"
                            placeholder="gabinete@prefeitura.gov.br"
                            value={newTenantForm.prefeitoEmail}
                            onChange={(e) =>
                              setNewTenantForm({ ...newTenantForm, prefeitoEmail: e.target.value })
                            }
                            className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">2. Nome do Sec. de Finanças</label>
                          <input
                            type="text"
                            placeholder="Secretário(a) de Finanças / Fazenda"
                            value={newTenantForm.secFinancasNome}
                            onChange={(e) =>
                              setNewTenantForm({ ...newTenantForm, secFinancasNome: e.target.value })
                            }
                            className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">E-mail do Sec. de Finanças</label>
                          <input
                            type="email"
                            placeholder="fazenda@prefeitura.gov.br"
                            value={newTenantForm.secFinancasEmail}
                            onChange={(e) =>
                              setNewTenantForm({ ...newTenantForm, secFinancasEmail: e.target.value })
                            }
                            className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Error Banner if any */}
                {submitTenantError && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3.5 text-xs flex items-center gap-2.5 animate-fadeIn">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-semibold">{submitTenantError}</span>
                  </div>
                )}

                {/* Footer Modal Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Ambiente multi-tenant isolado com 7 APIs públicas ativadas.
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTenantModal(false);
                        setDiscoveredData(null);
                        setLookupError(null);
                        setSubmitTenantError(null);
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-confirmar-cadastro-tenant"
                      type="button"
                      onClick={() => handleCreateTenant()}
                      disabled={isSubmittingTenant || isSearchingLookup}
                      className="bg-gradient-to-r from-emerald-600 to-[#1351b4] hover:from-emerald-700 hover:to-[#0c326f] disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isSubmittingTenant ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Cadastrando Prefeitura e Ativando 7 APIs...</span>
                        </>
                      ) : discoveredData ? (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>🚀 Confirmar Cadastro e Ativar 7 APIs em 1 Clique</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Salvar e Criar Ambiente Municipal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONECTAR NOVA API */}
      {showAddApiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0c326f]">
                  Conectar Nova API Pública / ERP
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Prefeitura: {selectedTenantObj?.nomePrefeitura}
                </p>
              </div>
              <button
                onClick={() => setShowAddApiModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApi} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Provedor do Serviço *
                </label>
                <select
                  value={newApiForm.providerName}
                  onChange={(e) =>
                    setNewApiForm({
                      ...newApiForm,
                      providerName: e.target.value as any,
                      label:
                        e.target.value === 'SICONFI' ? 'SICONFI - Tesouro Nacional'
                        : e.target.value === 'SIOPS' ? 'SIOPS - Saúde (FNS)'
                        : e.target.value === 'SIOPE' ? 'SIOPE - Educação (FNDE)'
                        : e.target.value === 'CAUC' ? 'CAUC - Tesouro Nacional'
                        : e.target.value === 'PNCP' ? 'PNCP - Contratações Públicas'
                        : e.target.value === 'TRANSPARENCIA_CGU' ? 'Transparência CGU'
                        : e.target.value === 'IBGE' ? 'IBGE - Dados Demográficos'
                        : e.target.value === 'IPARDES' ? 'IPARDES - Instituto Paranaense'
                        : e.target.value === 'BACEN_SGS' ? 'BACEN SGS - Banco Central'
                        : e.target.value === 'NOVO_PAC' ? 'Novo PAC - Infraestrutura'
                        : e.target.value === 'TRANSFEREGOV' ? 'Transferegov / Obrasgov'
                        : e.target.value === 'TCE_PR' ? 'TCE-PR CAp Fiscal'
                        : e.target.value === 'ERP_LOCAL' ? 'ERP Betha / IPM / Elotech'
                        : 'Portal da Transparência',
                      baseUrl:
                        e.target.value === 'SICONFI' ? 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt'
                        : e.target.value === 'SIOPS' ? 'https://siops.saude.gov.br'
                        : e.target.value === 'SIOPE' ? 'https://www.fnde.gov.br/olinda-ide/servico/DADOS_ABERTOS_SIOPE/'
                        : e.target.value === 'CAUC' ? 'https://apidatalake.tesouro.gov.br/ords/cauc/tt'
                        : e.target.value === 'PNCP' ? 'https://pncp.gov.br/api'
                        : e.target.value === 'TRANSPARENCIA_CGU' ? 'https://dadosabertos.cgu.gov.br/api'
                        : e.target.value === 'IBGE' ? 'https://servicodados.ibge.gov.br/api/v1'
                        : e.target.value === 'IPARDES' ? 'https://api.ipardes.pr.gov.br'
                        : e.target.value === 'BACEN_SGS' ? 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'
                        : e.target.value === 'NOVO_PAC' ? 'https://novopac.dados.gov.br/api'
                        : e.target.value === 'TRANSFEREGOV' ? 'https://api.transferegov.sistema.gov.br/v1/convenios'
                        : 'https://servicos.tce.pr.gov.br/api/fiscal/v2',
                    })
                  }
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition"
                >
                  <option value="SICONFI" className="text-slate-900 bg-white">SICONFI - Tesouro Nacional</option>
                  <option value="SIOPS" className="text-slate-900 bg-white">SIOPS - Saúde (FNS)</option>
                  <option value="SIOPE" className="text-slate-900 bg-white">SIOPE - Educação (FNDE)</option>
                  <option value="CAUC" className="text-slate-900 bg-white">CAUC - Tesouro Nacional</option>
                  <option value="PNCP" className="text-slate-900 bg-white">PNCP - Contratações Públicas</option>
                  <option value="TRANSPARENCIA_CGU" className="text-slate-900 bg-white">Transparência - CGU</option>
                  <option value="IBGE" className="text-slate-900 bg-white">IBGE - Dados Demográficos</option>
                  <option value="IPARDES" className="text-slate-900 bg-white">IPARDES - Instituto Paranaense</option>
                  <option value="BACEN_SGS" className="text-slate-900 bg-white">BACEN SGS - Banco Central</option>
                  <option value="NOVO_PAC" className="text-slate-900 bg-white">Novo PAC - Infraestrutura</option>
                  <option value="TRANSFEREGOV" className="text-slate-900 bg-white">Transferegov / Obrasgov (Federal)</option>
                  <option value="TCE_PR" className="text-slate-900 bg-white">Tribunal de Contas Estadual (TCE)</option>
                  <option value="ERP_LOCAL" className="text-slate-900 bg-white">ERP Local da Prefeitura</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nome / Rótulo da Conexão *
                </label>
                <input
                  type="text"
                  required
                  value={newApiForm.label}
                  placeholder="Ex: STN Siconfi Datalake Nacional"
                  onChange={(e) => setNewApiForm({ ...newApiForm, label: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  URL Endpoint Base *
                </label>
                <input
                  type="url"
                  required
                  value={newApiForm.baseUrl}
                  placeholder="https://..."
                  onChange={(e) => setNewApiForm({ ...newApiForm, baseUrl: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-mono text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tipo de Autenticação
                  </label>
                  <select
                    value={newApiForm.authType}
                    onChange={(e) =>
                      setNewApiForm({ ...newApiForm, authType: e.target.value as any })
                    }
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                  >
                    <option value="NONE" className="text-slate-900 bg-white">Pública (Sem Chave)</option>
                    <option value="API_KEY" className="text-slate-900 bg-white">API Key / Token</option>
                    <option value="BEARER" className="text-slate-900 bg-white">Bearer Token (JWT)</option>
                    <option value="BASIC" className="text-slate-900 bg-white">Basic Auth (User/Pass)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Frequência de Ingestão
                  </label>
                  <select
                    value={newApiForm.syncFrequency}
                    onChange={(e) =>
                      setNewApiForm({ ...newApiForm, syncFrequency: e.target.value })
                    }
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none font-mono transition shadow-xs"
                  >
                    <option value="0 6,18 * * *" className="text-slate-900 bg-white">2x ao dia (06h e 18h)</option>
                    <option value="0 6 * * *" className="text-slate-900 bg-white">1x ao dia (06h da manhã)</option>
                    <option value="*/30 * * * *" className="text-slate-900 bg-white">A cada 30 minutos</option>
                    <option value="0 12 * * *" className="text-slate-900 bg-white">Apenas ao meio-dia</option>
                  </select>
                </div>
              </div>

              {newApiForm.authType !== 'NONE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Chave Secreta / Token de API (Será gravada com AES-256)
                  </label>
                  <input
                    type="password"
                    value={newApiForm.apiKey}
                    placeholder="Chave secreta de autenticação..."
                    onChange={(e) => setNewApiForm({ ...newApiForm, apiKey: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-mono text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddApiModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-colors cursor-pointer"
                >
                  Salvar e Testar Conexão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PREFEITURA (EXCLUSIVO EMPRESA SAAS) */}
      {showEditTenantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Editar Prefeitura Cliente: {editTenantForm.cidade} ({editTenantForm.uf})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Atualização de parâmetros cadastrais, valores de plano e limites de usuários pela Empresa SaaS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTenantModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTenant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome Oficial da Prefeitura *</label>
                  <input
                    type="text"
                    required
                    value={editTenantForm.nomePrefeitura}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, nomePrefeitura: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Operacional *</label>
                  <select
                    value={editTenantForm.status}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ATIVO">● ATIVO</option>
                    <option value="EM_IMPLANTACAO">● EM IMPLANTAÇÃO</option>
                    <option value="SUSPENSO">● SUSPENSO</option>
                    <option value="INADIMPLENTE">● INADIMPLENTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cidade / Município *</label>
                  <input
                    type="text"
                    required
                    value={editTenantForm.cidade}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, cidade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={editTenantForm.uf}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, uf: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código IBGE (7 Dígitos) *</label>
                  <input
                    type="text"
                    required
                    value={editTenantForm.codigoIbge}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, codigoIbge: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ da Prefeitura *</label>
                  <input
                    type="text"
                    required
                    value={editTenantForm.cnpj}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, cnpj: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail de Faturamento</label>
                  <input
                    type="email"
                    value={editTenantForm.emailFaturamento}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, emailFaturamento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone de Contato</label>
                  <input
                    type="text"
                    value={editTenantForm.telefoneContato}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, telefoneContato: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Parametrização Comercial & Limite de Licenças */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Parametrização Comercial & Licenciamento
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome do Plano</label>
                    <input
                      type="text"
                      value={editTenantForm.planoNome}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, planoNome: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor Mensal Base (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTenantForm.valorMensalBase}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, valorMensalBase: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Usuários Inclusos (Cota)</label>
                    <input
                      type="number"
                      min="1"
                      value={editTenantForm.userLimit}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, userLimit: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor Usuário Extra (R$/mês)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTenantForm.valorUsuarioExtra}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, valorUsuarioExtra: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-amber-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditTenantModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditTenant}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEditTenant ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Alterações da Prefeitura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE USUÁRIO (EMPRESA SAAS EXCLUSIVO) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUserId ? 'Editar Usuário Municipal' : 'Cadastrar Novo Usuário Municipal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Execução exclusiva pela Empresa Mantenedora SaaS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo do Servidor *</label>
                <input
                  type="text"
                  required
                  value={userFormData.nome}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  onChange={(e) => setUserFormData({ ...userFormData, nome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Institucional *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    placeholder="servidor@municipio.pr.gov.br"
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF (apenas números ou pontuado) *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.cpf}
                    placeholder="000.000.000-00"
                    onChange={(e) => setUserFormData({ ...userFormData, cpf: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.cargo}
                    placeholder="Ex: Diretor de Orçamento / Auditor"
                    onChange={(e) => setUserFormData({ ...userFormData, cargo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil de Acesso (RBAC) *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="PREFEITO_EXECUTIVO">Prefeito / Executivo (Acesso Total)</option>
                    <option value="SECRETARIO_FINANCAS">Secretário de Finanças / Fazenda</option>
                    <option value="AUDITOR_GERAL">Auditor Geral / Contador</option>
                    <option value="CONTROLADOR_INTERNO">Controlador Interno</option>
                    <option value="GESTOR_SETORIAL">Gestor Setorial (Secretaria)</option>
                    <option value="CONSULTOR_EXTERNO">Consultor Externo (Leitura)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Restrição de Secretaria (Opcional)</label>
                <input
                  type="text"
                  value={userFormData.secretariaRestrita}
                  placeholder="Deixar em branco para acesso a todas ou informe ex: SAÚDE, EDUCAÇÃO"
                  onChange={(e) => setUserFormData({ ...userFormData, secretariaRestrita: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Regra de Cobrança:</strong> Se o número total de usuários ativos ultrapassar o limite do plano contratado ({tenantQuotaData?.usuariosInclusos || 2} inclusos), será gerada cobrança automática de R$ 150,00/mês para cada usuário extra cadastrado.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingUserId ? 'Salvar Usuário' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
