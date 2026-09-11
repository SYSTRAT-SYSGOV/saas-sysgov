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

// Utilitário de merge de classes (clsx + tailwind-merge)
export { cn } from './lib/utils';

// ============================================================
// Componentes base — reais do shadcn/ui (cva + radix-ui), migrados
// da Fase 2 da unificação de UI (ver apps/web-client). Os arquivos
// *-primitive.tsx são detalhe de implementação (não exportados) —
// só os wrappers de domínio (mesma API que os call-sites já usavam)
// saem no pacote público.
// ============================================================
export { Button, buttonVariants } from './components/button';
export type { ButtonProps } from './components/button';

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent } from './components/card';

export { Badge, badgeVariants } from './components/badge';
export type { BadgeProps } from './components/badge';

export { Input, InputPrimitive } from './components/input';
export type { InputProps } from './components/input';

export { Switch } from './components/switch';
export type { SwitchProps } from './components/switch';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/table';

export { Accordion } from './components/Accordion';
export type { AccordionProps, AccordionItemProps } from './components/Accordion';

export { Skeleton } from './components/skeleton';

export { Dialog, Modal } from './components/Dialog';
export type { DialogProps, ModalProps } from './components/Dialog';

export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';

export { RichTextEditor } from './components/RichTextEditor';
export type { RichTextEditorProps } from './components/RichTextEditor';

// ============================================================
// Componentes de domínio SYSGOV (sem equivalente no catálogo shadcn)
// ============================================================
export * from './components/AlertCard';
export * from './components/KpiCard';
export * from './components/StatusChip';
export * from './components/SystratBrand';
export * from './components/OrgTypeBadge';
export * from './components/OrgTreeNodeCard';
export * from './components/OrgScopeIndicator';
