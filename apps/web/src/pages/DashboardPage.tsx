import React from 'react';
import { FilterBar } from '../components/FilterBar';
import { Module1KPIs } from '../components/Module1KPIs';
import { Module2Receitas } from '../components/Module2Receitas';
import { Module3Despesas } from '../components/Module3Despesas';
import { Module4LRF } from '../components/Module4LRF';
import { Module5Captacao } from '../components/Module5Captacao';
import { Module6Fundeb } from '../components/Module6Fundeb';
import { ModuleSiconfiExplorer } from '../components/ModuleSiconfiExplorer';
import { ModuleAIDiagnostico } from '../components/ModuleAIDiagnostico';
import { ModuleObrasMap } from '../components/ModuleObrasMap';
import { SaaSAdminPanel } from '../components/SaaSAdminPanel';
import { TenantUserManagement } from '../components/TenantUserManagement';
import { PainelDoPrefeito } from '../components/PainelDoPrefeito';
import { BenchmarkMunicipal } from '../components/BenchmarkMunicipal';
import { SeloConformidade } from '../components/SeloConformidade';
import { AlertasPrazosCriticos } from '../components/AlertasPrazosCriticos';
import { SimuladorCenariosLoa } from '../components/SimuladorCenariosLoa';
import { PainelGestaoPage } from '../components/PainelGestao/PainelGestaoPage';

// Universal Admin Views
import { AdminDashboardOverview } from '../components/admin/AdminDashboardOverview';
import { AdminAnalyticsView } from '../components/admin/AdminAnalyticsView';
import { AdminUserManagement } from '../components/admin/AdminUserManagement';
import { AdminTenantManagement } from '../components/admin/AdminTenantManagement';
import { AdminGenericDataTable } from '../components/admin/AdminGenericDataTable';
import { AdminFinancialBilling } from '../components/admin/AdminFinancialBilling';
import { AdminApiIntegrations } from '../components/admin/AdminApiIntegrations';
import { AdminAuditLogs } from '../components/admin/AdminAuditLogs';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminUserProfile } from '../components/admin/AdminUserProfile';

import {
  FiscalKPIs,
  RevenueSource,
  ExpenseNature,
  ExpenseFunction,
  LRFLimit,
  FundebData,
  FiscalAlert,
  EmendaParlamentar,
  ConvenioRecurso,
  ObraAraucaria,
  ObrasSummary,
  SiconfiApiStatus,
  ComparativeAnalysis,
  ComparativeMode,
  MonthlyComparativeAnalysis,
  QuarterlyComparativeAnalysis,
  ToastMessage,
} from '../types/fiscal';
import { RefreshCw } from 'lucide-react';

interface DashboardPageProps {
  activeTab: string;
  ano?: number;
  selectedPeriod?: string;
  setSelectedPeriod?: (period: string) => void;
  selectedUnidade?: string;
  setSelectedUnidade?: (unidade: string) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  isComparativoAnual?: boolean;
  onToggleComparativoAnual?: (enabled: boolean) => void;
  comparativeMode?: ComparativeMode;
  onComparativeModeChange?: (mode: ComparativeMode) => void;
  selectedMonth?: number;
  onMonthChange?: (m: number) => void;
  selectedQuarter?: number;
  onQuarterChange?: (q: number) => void;
  onResetFilters?: () => void;
  summary?: FiscalKPIs | null;
  receitas?: RevenueSource[];
  porNatureza?: ExpenseNature[];
  porFuncao?: ExpenseFunction[];
  limites?: LRFLimit[];
  captacao?: {
    metaAnual: number;
    captadoAcumulado: number;
    percentualAtingimento: string;
    novasEmendas7Dias?: number;
    emendas: EmendaParlamentar[];
    convenios: ConvenioRecurso[];
  } | null;
  fundeb?: FundebData | null;
  alerts?: FiscalAlert[];
  obrasData?: { obras: ObraAraucaria[]; summary: ObrasSummary | null };
  siconfiStatus?: SiconfiApiStatus | null;
  comparativeData?: ComparativeAnalysis | null;
  monthlyComparativeData?: MonthlyComparativeAnalysis | null;
  quarterlyComparativeData?: QuarterlyComparativeAnalysis | null;
  activeTenant?: { id: string; nomePrefeitura: string; cidade: string; uf: string; codigoIbge: string; cnpj?: string };
  authRole?: 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE' | string;
  userSecretariaId?: string;
  onNavigateToTab: (tabId: string) => void;
  onAddToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  onSelectTenant?: (tenant: any) => void;
  isPresentationMode?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeTab,
  ano = 2026,
  selectedPeriod = 'todos',
  setSelectedPeriod = () => {},
  selectedUnidade = 'todas',
  setSelectedUnidade = () => {},
  searchQuery = '',
  setSearchQuery = () => {},
  isComparativoAnual = false,
  onToggleComparativoAnual = () => {},
  comparativeMode = 'anual',
  onComparativeModeChange = () => {},
  selectedMonth = 8,
  onMonthChange = () => {},
  selectedQuarter = 1,
  onQuarterChange = () => {},
  onResetFilters = () => {},
  summary = null,
  receitas = [],
  porNatureza = [],
  porFuncao = [],
  limites = [],
  captacao = null,
  fundeb = null,
  alerts = [],
  obrasData = { obras: [], summary: null },
  siconfiStatus = null,
  comparativeData = null,
  monthlyComparativeData = null,
  quarterlyComparativeData = null,
  activeTenant = {
    id: 'tenant-01',
    nomePrefeitura: 'Prefeitura Municipal',
    cidade: 'SysGov Central',
    uf: 'BR',
    codigoIbge: '0000000',
  },
  authRole = 'SUPER_ADMIN',
  userSecretariaId,
  onNavigateToTab,
  onAddToast,
  onSelectTenant,
  isPresentationMode = false,
}) => {
  const isMunicipalTab = [
    'modulo1',
    'modulo2',
    'modulo3',
    'modulo4',
    'modulo5',
    'modulo6',
    'painel_prefeito',
    'painel_gestao',
    'benchmark',
    'selo',
    'alertas_prazos',
    'simulador_loa',
    'siconfi',
    'diagnostico',
    'obras',
    'saas_admin',
    'tenant_users',
  ].includes(activeTab);

  return (
    <>
      {isMunicipalTab && !isPresentationMode && (
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          selectedUnidade={selectedUnidade}
          onUnidadeChange={setSelectedUnidade}
          onResetFilters={onResetFilters}
          comparativeMode={comparativeMode}
          onComparativeModeChange={onComparativeModeChange}
          selectedQuarter={selectedQuarter}
          onQuarterChange={onQuarterChange}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          isComparativoAnual={isComparativoAnual}
          onToggleComparativoAnual={onToggleComparativoAnual}
          anoAtual={ano}
          dataSource={summary?.dataSource}
        />
      )}

      <div>
        {/* =========================================================================
            UNIVERSAL ADMIN MODULES (Default Suite)
           ========================================================================= */}
        {(activeTab === 'admin_dashboard' || activeTab === 'dashboard') && (
          <AdminDashboardOverview onNavigate={onNavigateToTab} onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_analytics' && (
          <AdminAnalyticsView onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_users' && (
          <AdminUserManagement onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_tenants' && (
          <AdminTenantManagement onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_records' && (
          <AdminGenericDataTable onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_billing' && (
          <AdminFinancialBilling onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_apis' && (
          <AdminApiIntegrations onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_logs' && (
          <AdminAuditLogs onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_settings' && (
          <AdminSettings onAddToast={onAddToast} />
        )}

        {activeTab === 'admin_profile' && (
          <AdminUserProfile onAddToast={onAddToast} />
        )}

        {/* =========================================================================
            SPECIALIZED PRESET MODULES (Domain Views)
           ========================================================================= */}
        {activeTab === 'painel_prefeito' && (
          <PainelDoPrefeito
            activeTenant={activeTenant}
            ano={ano}
            onNavigateToTab={onNavigateToTab}
          />
        )}

        {activeTab === 'painel_gestao' && (
          <PainelGestaoPage
            tenantId={activeTenant.id}
            cidade={activeTenant.cidade}
            uf={activeTenant.uf}
            authRole={authRole as any}
            userSecretariaId={userSecretariaId}
            cnpj={activeTenant.cnpj}
          />
        )}

        {activeTab === 'modulo1' && (() => {
          const displaySummary = summary as FiscalKPIs | null;
          if (!displaySummary) {
            return (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum dado sincronizado para {ano}.
              </div>
            );
          }
          return (
            <Module1KPIs
              summary={displaySummary}
              alerts={alerts}
              ano={ano}
              onNavigateToTab={onNavigateToTab}
              isComparativoAnual={isComparativoAnual}
              comparativeData={comparativeData}
              activeMode={comparativeMode}
              monthlyComparativeData={monthlyComparativeData}
              quarterlyComparativeData={quarterlyComparativeData}
              tenantInfo={activeTenant}
            />
          );
        })()}

        {activeTab === 'modulo2' && (
          <Module2Receitas
            receitas={receitas}
            ano={ano}
            searchQuery={searchQuery}
            isComparativoAnual={isComparativoAnual}
            comparativeData={comparativeData}
            activeMode={comparativeMode}
            monthlyComparativeData={monthlyComparativeData}
            quarterlyComparativeData={quarterlyComparativeData}
          />
        )}

        {activeTab === 'modulo3' && (
          <Module3Despesas
            porNatureza={porNatureza}
            porFuncao={porFuncao}
            ano={ano}
            searchQuery={searchQuery}
            isComparativoAnual={isComparativoAnual}
            comparativeData={comparativeData}
            activeMode={comparativeMode}
            monthlyComparativeData={monthlyComparativeData}
            quarterlyComparativeData={quarterlyComparativeData}
          />
        )}

        {activeTab === 'modulo4' && (
          <Module4LRF limites={limites} ano={ano} onTriggerToast={onAddToast} />
        )}

        {activeTab === 'modulo5' && (
          captacao ? (
            <Module5Captacao
              metaAnual={captacao.metaAnual}
              captadoAcumulado={captacao.captadoAcumulado}
              percentualAtingimento={captacao.percentualAtingimento}
              emendas={captacao.emendas}
              convenios={captacao.convenios}
              searchQuery={searchQuery}
              cidade={activeTenant?.cidade || 'Araucária'}
              uf={activeTenant?.uf || 'PR'}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-mono text-slate-500">Carregando dados...</p>
            </div>
          )
        )}

        {activeTab === 'modulo6' && (
          fundeb ? (
            <Module6Fundeb fundebData={fundeb} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-mono text-slate-500">Carregando matrizes do FUNDEB e SIOPE...</p>
            </div>
          )
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkMunicipal activeTenant={activeTenant} cidade={activeTenant.cidade} uf={activeTenant.uf} />
        )}

        {activeTab === 'selo' && (
          <SeloConformidade activeTenant={activeTenant} cidade={activeTenant.cidade} uf={activeTenant.uf} ano={ano} />
        )}

        {activeTab === 'alertas_prazos' && (
          <AlertasPrazosCriticos activeTenant={activeTenant} cidade={activeTenant.cidade} uf={activeTenant.uf} />
        )}

        {activeTab === 'simulador_loa' && (
          <SimuladorCenariosLoa
            cidade={activeTenant.cidade}
            uf={activeTenant.uf}
            orcamentoBase={summary?.receitaTotalOrcada || 0}
            rclBase={summary?.rcl || 0}
            despesaPessoalBase={summary?.despesaPessoalTotal || 679029000}
          />
        )}

        {activeTab === 'siconfi' && (
          <ModuleSiconfiExplorer siconfiStatus={siconfiStatus} ano={ano} activeTenant={activeTenant} />
        )}

        {activeTab === 'diagnostico' && (
          summary ? (
            <ModuleAIDiagnostico summary={summary} ano={ano} activeTenant={activeTenant} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-mono text-slate-500">Gerando parecer...</p>
            </div>
          )
        )}

        {activeTab === 'obras' && (
          <ModuleObrasMap
            obras={obrasData.obras}
            summary={obrasData.summary}
            ano={ano}
          />
        )}

        {activeTab === 'saas_admin' && (
          <SaaSAdminPanel
            activeTenantId={activeTenant.id}
            onSelectTenantToPreview={onSelectTenant}
          />
        )}

        {activeTab === 'tenant_users' && (
          <TenantUserManagement
            tenantId={activeTenant.id}
            tenantName={activeTenant.nomePrefeitura}
            authRole={authRole as any}
          />
        )}
      </div>
    </>
  );
};
