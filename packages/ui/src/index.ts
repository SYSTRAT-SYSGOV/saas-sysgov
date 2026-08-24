export const sysgovTokens = {
  primary: '#10b981', // Verde Esmeralda
  navigationDark: '#0a1128', // Dark Navy Fundo
  surfaceDark: '#101a3a', // Superfície Dark
  cardDark: '#152244', // Card Dark
  borderDark: '#1a2a52', // Borda Dark
  secondaryIndigo: '#6366f1',
  secondaryCyan: '#06b6d4',
  secondaryAmber: '#f59e0b',
  fiscalRegular: '#168821', // Conforme
  fiscalAttention: '#ffcd07', // Atenção / Alerta
  fiscalCritical: '#e52207', // Crítico / Excedido
  fiscalNeutral: '#0284c7', // Informativo
} as const;

export type FiscalSeverity = 'regular' | 'attention' | 'critical' | 'info';

// Export components
export * from './components/AlertCard';
export * from './components/Badge';
export * from './components/Button';
export * from './components/Card';
export * from './components/Input';
export * from './components/KpiCard';
export * from './components/StatusChip';
export * from './components/SystratBrand';
export * from './components/Table';
export * from './components/OrgTypeBadge';
export * from './components/OrgTreeNodeCard';
export * from './components/OrgScopeIndicator';
