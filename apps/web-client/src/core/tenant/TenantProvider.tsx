import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { Tenant, TenantSettings } from '@/types/navigation';
import { applyWhiteLabelTheme } from '@/config/theme';

interface TenantContextType {
  tenant: Tenant | null;
  tenants: Tenant[];
  settings: TenantSettings;
  switchTenant: (tenantId: number) => Promise<void>;
  hasMultipleTenants: boolean;
  isStandardBranding: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenant, tenants, switchTenant } = useAuth();

  const settings: TenantSettings = tenant?.settings || {
    customPrimaryColor: '#1351B4',
    title: 'Portal de Gestão',
    subtitle: tenant?.name || 'Prefeitura de Araucária',
    hideProviderBranding: false,
  };

  useEffect(() => {
    if (tenant) {
      applyWhiteLabelTheme(settings.customPrimaryColor);
      document.title = `${settings.title || 'Portal'} | ${tenant.name} — SYSGOV`;
    }
  }, [tenant, settings]);

  const value: TenantContextType = {
    tenant,
    tenants,
    settings,
    switchTenant,
    hasMultipleTenants: tenants.length > 1,
    isStandardBranding: !settings.hideProviderBranding,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
