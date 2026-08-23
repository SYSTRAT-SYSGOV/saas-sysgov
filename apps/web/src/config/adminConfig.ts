import { SystemBrandingConfig } from '../types/admin';

export const DEFAULT_ADMIN_CONFIG: SystemBrandingConfig = {
  appName: 'SysGov / Admin Suite',
  appSubtitle: 'Plataforma Administrativa & Gestão Executiva',
  companyName: 'SysGov Technologies',
  logoUrl: '',
  primaryColor: '#10b981', // Emerald Oficial do Design System
  secondaryColor: '#0c326f', // Navy / Governamental
  enableDarkMode: true,
  showPoweredBy: true,
  supportEmail: 'suporte@sysgov.online',
  version: '2.5.0-universal',
};

export const ADMIN_PERMISSIONS = [
  { id: 'users.read', label: 'Visualizar Usuários', category: 'Usuários' },
  { id: 'users.create', label: 'Criar Usuários', category: 'Usuários' },
  { id: 'users.edit', label: 'Editar Usuários', category: 'Usuários' },
  { id: 'users.delete', label: 'Excluir Usuários', category: 'Usuários' },
  { id: 'tenants.manage', label: 'Gerenciar Organizações/Tenants', category: 'Tenants' },
  { id: 'billing.view', label: 'Visualizar Faturamento e Invoices', category: 'Financeiro' },
  { id: 'billing.manage', label: 'Gerenciar Planos e Cobrança', category: 'Financeiro' },
  { id: 'apis.manage', label: 'Configurar Integrações e APIs', category: 'Integrações' },
  { id: 'logs.view', label: 'Visualizar Logs e Auditoria', category: 'Segurança' },
  { id: 'settings.edit', label: 'Alterar Configurações do Sistema', category: 'Configurações' },
  { id: 'export.data', label: 'Exportar Dados (CSV / PDF / JSON)', category: 'Relatórios' },
];

export const AVAILABLE_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin Master', description: 'Acesso irrestrito a todas as configurações e tenants' },
  { value: 'ADMIN', label: 'Administrador', description: 'Gerenciamento de usuários, dados e relatórios' },
  { value: 'MANAGER', label: 'Gerente / Gestor', description: 'Acesso a relatórios e operações do setor' },
  { value: 'OPERATOR', label: 'Operador', description: 'Criação e edição de registros diários' },
  { value: 'VIEWER', label: 'Visualizador', description: 'Acesso somente leitura' },
];
