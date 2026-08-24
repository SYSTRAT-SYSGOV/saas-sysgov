import React from 'react';
import { Shield, ShieldAlert, Building2, UserCheck } from 'lucide-react';

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
  className = '',
}) => {
  if (isUnrestricted) {
    return (
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium ${className}`}
      >
        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <span className="font-bold text-emerald-800">Escopo Global (ABAC):</span> Visão irrestrita de todas as unidades municipais
        </div>
      </div>
    );
  }

  if (managedUnitsCount > 0) {
    return (
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium ${className}`}
      >
        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
        <div>
          <span className="font-bold text-indigo-800">Escopo Hierárquico:</span> Gestor de {managedUnitsCount} unidade(s) + sub-unidades subordinadas
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium ${className}`}
    >
      <UserCheck className="w-4 h-4 text-slate-600 shrink-0" />
      <div>
        <span className="font-bold text-slate-900">Lotação Direta:</span> {primaryUnitName ?? 'Unidade Departamental'} ({primaryUnitRole ?? 'Membro'})
      </div>
    </div>
  );
};
