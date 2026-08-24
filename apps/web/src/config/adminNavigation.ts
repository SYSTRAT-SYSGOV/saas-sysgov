import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Table,
  CreditCard,
  Plug,
  ShieldAlert,
  Settings,
  UserCheck,
  FileSpreadsheet,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  Landmark,
  FileText,
  Ticket,
  BookOpen,
} from 'lucide-react';
import { AdminRole } from '../types/admin';

export interface AdminNavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'blue' | 'slate';
  description: string;
  allowedRoles?: AdminRole[];
  path?: string;
}

export interface AdminNavGroup {
  id: string;
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'core_analytics',
    title: 'PAINEL PRINCIPAL',
    items: [
      {
        id: 'admin_dashboard',
        label: 'Visão Geral & KPIs',
        shortLabel: 'Dashboard',
        icon: LayoutDashboard,
        badge: 'Ao Vivo',
        badgeColor: 'emerald',
        description: 'Métricas executivas consolidadas, receita e atividade do sistema',
      },
      {
        id: 'admin_analytics',
        label: 'Desempenho & Métricas',
        shortLabel: 'Métricas',
        icon: BarChart3,
        badge: 'Analytics',
        badgeColor: 'indigo',
        description: 'Gráficos comparativos, tendências e análises de conversão',
      },
    ],
  },
  {
    id: 'management',
    title: 'GESTÃO & CADASTROS',
    items: [
      {
        id: 'admin_users',
        label: 'Usuários & Permissões',
        shortLabel: 'Usuários',
        icon: Users,
        badge: 'RBAC',
        badgeColor: 'blue',
        description: 'Gerenciamento de contas, papéis de acesso e permissões',
      },
      {
        id: 'admin_tenants',
        label: 'Organizações & Tenants',
        shortLabel: 'Tenants',
        icon: Building2,
        badge: 'Multi-Tenant',
        badgeColor: 'amber',
        description: 'Gestão de clientes, cotas de uso, limites e subdomínios',
      },
      {
        id: 'admin_records',
        label: 'Registros & Tabelas',
        shortLabel: 'Registros',
        icon: Table,
        badge: 'CRUD',
        badgeColor: 'slate',
        description: 'Tabela de dados avançada com filtros, ordenação e exportação',
      },
      {
        id: 'admin_menus',
        label: 'Gerenciador de Menus',
        shortLabel: 'Menus',
        icon: Layers,
        badge: 'Novo',
        badgeColor: 'emerald',
        description: 'Configuração dinâmica de grupos e itens do menu lateral',
      },
    ],
  },
  {
    id: 'finance_integrations',
    title: 'FINANCEIRO & INFRAESTRUTURA',
    items: [
      {
        id: 'admin_billing',
        label: 'Faturamento & Invoices',
        shortLabel: 'Faturamento',
        icon: CreditCard,
        badge: 'MRR',
        badgeColor: 'emerald',
        description: 'Demonstrativo financeiro, histórico de faturas e planos',
      },
      {
        id: 'admin_apis',
        label: 'APIs & Integrações',
        shortLabel: 'APIs',
        icon: Plug,
        badge: 'Webhooks',
        badgeColor: 'indigo',
        description: 'Monitoramento de integradores, latência e conectores',
      },
      {
        id: 'admin_logs',
        label: 'Logs & Auditoria',
        shortLabel: 'Auditoria',
        icon: ShieldAlert,
        badge: 'Audit',
        badgeColor: 'rose',
        description: 'Rastreabilidade de ações, eventos de segurança e erros',
      },
    ],
  },
  {
    id: 'system_settings',
    title: 'SISTEMA & PREFERÊNCIAS',
    items: [
      {
        id: 'admin_settings',
        label: 'Configurações & White-Label',
        shortLabel: 'Configurações',
        icon: Settings,
        badge: 'Custom',
        badgeColor: 'slate',
        description: 'Personalização visual, logotipo, parâmetros e segurança',
      },
      {
        id: 'admin_profile',
        label: 'Meu Perfil & Segurança',
        shortLabel: 'Perfil',
        icon: UserCheck,
        description: 'Dados da conta autenticada, senha e sessões ativas',
      },
    ],
  },
  {
    id: 'contratos_contabilidade',
    title: 'CONTRATOS & CONTABILIDADE',
    items: [
      {
        id: 'contratos',
        label: 'Gestão de Contratos',
        shortLabel: 'Contratos',
        icon: FileText,
        badge: 'Lei 14.133',
        badgeColor: 'indigo',
        description: 'Ciclo de vida contratual, aditivos (25%), fiscalização e anexos',
      },
      {
        id: 'helpdesk',
        label: 'Suporte & Helpdesk',
        shortLabel: 'Helpdesk',
        icon: Ticket,
        badge: 'SLA',
        badgeColor: 'amber',
        description: 'Chamados internos com SLA automático por prioridade',
      },
      {
        id: 'contabilidade',
        label: 'Contabilidade Pública',
        shortLabel: 'Contabilidade',
        icon: BookOpen,
        badge: 'PCASP',
        badgeColor: 'emerald',
        description: 'PCASP, empenho-liquidação-pagamento e partidas dobradas',
      },
    ],
  },
];
