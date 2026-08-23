import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TenantBrandingConfig } from '../types/saas';

export interface TenantInfoState {
  id: string;
  nomePrefeitura: string;
  cidade: string;
  uf: string;
  codigoIbge: string;
  cnpj?: string;
  status?: string;
  branding?: TenantBrandingConfig;
}

interface TenantContextType {
  activeTenant: TenantInfoState;
  setActiveTenant: (tenant: TenantInfoState) => void;
  updateActiveTenantBranding: (branding: TenantBrandingConfig) => void;
}

// O tenant ativo é definido exclusivamente pela sessão autenticada (login real).
// Não há município padrão: sem tenant autenticado, nenhum dado é carregado.
const defaultTenant: TenantInfoState = {
  id: '',
  nomePrefeitura: '',
  cidade: '',
  uf: '',
  codigoIbge: '',
  status: 'ATIVO',
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTenant, setActiveTenantState] = useState<TenantInfoState>(() => {
    try {
      const saved = localStorage.getItem('sgf_active_tenant');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultTenant;
  });

  const setActiveTenant = (tenant: TenantInfoState) => {
    setActiveTenantState(tenant);
    try {
      localStorage.setItem('sgf_active_tenant', JSON.stringify(tenant));
      localStorage.setItem('sgf_active_tenant_id', tenant.id);
    } catch {}
  };

  const updateActiveTenantBranding = (branding: TenantBrandingConfig) => {
    setActiveTenantState(prev => {
      const updated = { ...prev, branding };
      try {
        localStorage.setItem('sgf_active_tenant', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <TenantContext.Provider value={{ activeTenant, setActiveTenant, updateActiveTenantBranding }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenantContext deve ser usado dentro de um TenantProvider');
  return ctx;
};

