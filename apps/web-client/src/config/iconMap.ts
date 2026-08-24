import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  Coins,
  GraduationCap,
  Users,
  Cross,
  Building2,
  PieChart,
  ShieldCheck,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Layers,
  HelpCircle,
  LogOut,
  Landmark,
  FileSpreadsheet,
  Briefcase,
  Vote,
  Network,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  FileSignature,
  Coins,
  GraduationCap,
  Users,
  Cross,
  Building2,
  PieChart,
  ShieldCheck,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Layers,
  HelpCircle,
  LogOut,
  Landmark,
  FileSpreadsheet,
  Briefcase,
  Vote,
  Network,
};

/**
 * Retorna o componente Lucide associado ao nome informado ou fallback padrão.
 * Nunca renderiza string crua no JSX.
 */
export function getIcon(name?: string | null): LucideIcon {
  if (!name) return Layers;
  return ICON_MAP[name] || Layers;
}
