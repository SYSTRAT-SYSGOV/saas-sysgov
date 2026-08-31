import React from 'react';
import { Shield, Building2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrgScopeIndicatorProps {
  isUnrestricted: boolean;
  primaryUnitName?: string | null;
  primaryUnitRole?: string | null;
  managedUnitsCount?: number;
  className?: string;
}

export const OrgScopeIndicator: React.FC<OrgScopeIndicatorProps> = ({
  isUnrestricted,
  primaryUnitName,
  primaryUnitRole,
  managedUnitsCount = 0,
  className,
}) => {
  if (isUnrestricted) {
    return (
      <div className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-[#0A4B12] text-xs font-medium', className)}>
        <Shield className="w-4 h-4 text-success shrink-0" />
        <div>
          <span className="font-bold text-success">Escopo Global (ABAC):</span> Visão irrestrita de todas as unidades municipais
        </div>
      </div>
    );
  }

  if (managedUnitsCount > 0) {
    return (
      <div className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-status-info-bg border border-status-info-border text-status-info text-xs font-medium', className)}>
        <Building2 className="w-4 h-4 shrink-0" />
        <div>
          <span className="font-bold">Escopo Hierárquico:</span> Gestor de {managedUnitsCount} unidade(s) + sub-unidades subordinadas
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gov-primary-light border border-gov-primary/20 text-gov-primary text-xs font-medium', className)}>
      <UserCheck className="w-4 h-4 shrink-0" />
      <div>
        <span className="font-bold">Lotação Direta:</span> {primaryUnitName ?? 'Unidade Departamental'} ({primaryUnitRole ?? 'Membro'})
      </div>
    </div>
  );
};