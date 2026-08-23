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

export interface KPICardProps {
  title: string;
  value: string | number;
  secondaryInfo?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  badge?: string;
  className?: string;
}

export interface AlertCardProps {
  title: string;
  description: string;
  severity: FiscalSeverity;
  countOrStatus?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export interface StatusBadgeProps {
  label: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'slate';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export interface DataCardProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export interface ActionButtonProps {
  variant?: 'solid' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}
