export type TenantStatus = 'ATIVO' | 'SUSPENSO' | 'EM_IMPLANTACAO' | 'INADIMPLENTE';

export type UserRole =
  | 'MASTER_ADMIN'
  | 'PREFEITO'
  | 'SECRETARIO_FINANCAS'
  | 'CONTROLADORIA'
  | 'SECRETARIA_SETORIAL'
  | 'VISUALIZADOR_GERAL';

export interface SaaSUser {
  id: string;
  tenantId: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  role: UserRole;
  secretariaRestrita?: string | null; // e.g. 'SMOP', 'SMSA', 'SMED' or null for full access
  ativo: boolean;
  isExtra: boolean; // true if above the 2 included users
  ultimoAcesso?: string;
  createdAt: string;
}

export type ApiProviderName =
  | 'SICONFI'
  | 'SIOPS'
  | 'SIOPE'
  | 'CAUC'
  | 'PNCP'
  | 'TRANSPARENCIA_CGU'
  | 'IBGE'
  | 'IPARDES'
  | 'BACEN_SGS'
  | 'NOVO_PAC'
  | 'TRANSFEREGOV'
  | 'TCE_PR'
  | 'TCE_ESTADUAL'
  | 'PORTAL_TRANSPARENCIA'
  | 'SIOPS_SAUDE'
  | 'SIOPE_EDUCACAO'
  | 'EMENDAS_PARLAMENTARES'
  | 'ERP_LOCAL';

export interface TenantApiConfig {
  id: string;
  tenantId: string;
  providerName: ApiProviderName;
  label: string;
  baseUrl: string;
  authType: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC' | 'CERTIFICATE';
  apiKeyMasked?: string;
  customHeaders?: Record<string, string>;
  syncFrequency: string; // e.g. '0 6,18 * * *' (2x ao dia)
  ativo: boolean;
  ultimoStatus: 'SUCESSO' | 'ERRO' | 'PENDENTE' | 'EM_EXECUCAO';
  ultimaSincronizacao?: string;
  totalRegistrosSincronizados?: number;
}

export interface DiscoveredApiTemplate {
  providerName: ApiProviderName;
  label: string;
  baseUrl: string;
  authType: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC' | 'CERTIFICATE';
  apiKeyMasked?: string;
  syncFrequency: string;
  descricao: string;
  recursos: string[];
}

export interface AutoDiscoveredMunicipality {
  codigoIbge: string;
  nomePrefeitura: string;
  cidade: string;
  uf: string;
  cnpj: string;
  regiao?: string;
  mesorregiao?: string;
  populacaoEstimada?: number;
  emailFaturamento: string;
  telefoneContato: string;
  websiteOficial?: string;
  prefeitoNome?: string;
  prefeitoEmail?: string;
  secFinancasNome?: string;
  secFinancasEmail?: string;
  apisDisponiveis: DiscoveredApiTemplate[];
}

export interface TenantBrandingConfig {
  isCustomized: boolean;
  customLogoUrl?: string;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  customPortalTitle?: string;
  customSubtitle?: string;
  showSaaSBranding: boolean;
  taxaImplantacao: number;
  mensalidadeCustomizacao: number;
}

export interface TenantSummary {
  id: string;
  codigoIbge: string;
  nomePrefeitura: string;
  cidade: string;
  uf: string;
  cnpj: string;
  status: TenantStatus;
  
  // Pricing & Limits
  planoNome: string;
  valorMensalBase: number; // e.g. 1890.00 (includes 2 users)
  userLimit: number; // default 2
  valorUsuarioExtra: number; // e.g. 150.00
  diaVencimento: number;
  
  // Branding & White-Label
  branding?: TenantBrandingConfig;
  taxaImplantacao?: number;
  mensalidadeCustomizacao?: number;

  // Computed stats
  totalUsuariosAtivos: number;
  usuariosExcedentes: number;
  valorTotalMensalidade: number; // valorMensalBase + (usuariosExcedentes * valorUsuarioExtra) + mensalidadeCustomizacao
  
  // APIs count
  apisConfiguradas: number;
  apisAtivas: number;
  
  // Contacts
  emailFaturamento: string;
  telefoneContato: string;
  createdAt: string;
}

export interface SaaSInvoice {
  id: string;
  tenantId: string;
  prefeituraNome: string;
  mesReferencia: number;
  anoReferencia: number;
  valorBase: number;
  totalUsuarios: number;
  usuariosExcedentes: number;
  valorUsuariosExtras: number;
  valorCustomizacao?: number;
  taxaImplantacao?: number;
  valorTotal: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  numeroNfse?: string;
  codigoBarrasPix?: string;
}

export interface SaaSSummaryMetrics {
  totalPrefeituras: number;
  prefeiturasAtivas: number;
  mrrTotal: number; // Monthly Recurring Revenue
  totalUsuariosAtivos: number;
  totalUsuariosFaturadosExtras: number;
  faturamentoExtras: number;
  faturamentoCustomizacao: number;
  taxaInadimplencia: number;
  apisOnlinePct: number;
}

