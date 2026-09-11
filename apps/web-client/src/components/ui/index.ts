// Componentes base reais do shadcn/ui — migrados pra @sysgov/ui na Fase 3
// da unificação de UI, pra serem reaproveitados por qualquer app do
// monorepo (não só o web-client).
export {
  Button,
  buttonVariants,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  Input,
  InputPrimitive,
  Badge,
  badgeVariants,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Switch,
  Select,
  Modal,
  Dialog,
  Accordion,
  Skeleton,
  RichTextEditor,
} from '@sysgov/ui';
export type {
  ButtonProps,
  InputProps,
  BadgeProps,
  SwitchProps,
  SelectProps,
  SelectOption,
  ModalProps,
  DialogProps,
  AccordionProps,
  AccordionItemProps,
  RichTextEditorProps,
} from '@sysgov/ui';

export { AlertCard } from './AlertCard';
export type { AlertCardProps, AlertPriority } from './AlertCard';

export { StatusChip } from './StatusChip';
export type { StatusChipProps, StatusVariant } from './StatusChip';

export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

export { SystratBrand, SystratWings } from './SystratBrand';
export type { SystratBrandProps } from './SystratBrand';

export { OrgTypeBadge } from './OrgTypeBadge';
export type { OrgType } from './OrgTypeBadge';

export { OrgScopeIndicator } from './OrgScopeIndicator';
export type { OrgScopeIndicatorProps } from './OrgScopeIndicator';

export { OrgTreeNodeCard } from './OrgTreeNodeCard';
export type { OrgTreeNodeCardProps } from './OrgTreeNodeCard';

export { Field } from './Field';
export type { FieldProps } from './Field';

export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

export { Tabs } from './Tabs';
export type { TabsProps, TabsItem } from './Tabs';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { ScreenState } from './ScreenState';
export type { ScreenStateProps } from './ScreenState';

export { ValidationErrorModal } from './ValidationErrorModal';
export type { ValidationErrorModalProps } from './ValidationErrorModal';
