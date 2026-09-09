import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SystemBrandingConfig } from '../types/admin';
import { DEFAULT_ADMIN_CONFIG } from '../config/adminConfig';

interface AdminConfigContextType {
  config: SystemBrandingConfig;
  updateConfig: (newConfig: Partial<SystemBrandingConfig>) => void;
  resetConfig: () => void;
  isCompactSidebar: boolean;
  toggleCompactSidebar: () => void;
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'sysgov_admin_config';

export const AdminConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemBrandingConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_ADMIN_CONFIG;
  });

  const [isCompactSidebar, setIsCompactSidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sysgov_sidebar_compact') === 'true';
    } catch {
      return false;
    }
  });

  // Aplica o tema escolhido (Accent Theme) na raiz do documento via
  // data-theme, lido pelos overrides de CSS em src/index.css (seção
  // "5c. Presets de Tema do Admin"). Roda a cada mudança de config e
  // uma vez no boot, para refletir o que veio do localStorage.
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', config.themeId);
    } catch {}
  }, [config.themeId]);

  const updateConfig = (newConfig: Partial<SystemBrandingConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_ADMIN_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const toggleCompactSidebar = () => {
    setIsCompactSidebar(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sysgov_sidebar_compact', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <AdminConfigContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        isCompactSidebar,
        toggleCompactSidebar,
      }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
};

export const useAdminConfig = () => {
  const context = useContext(AdminConfigContext);
  if (!context) {
    throw new Error('useAdminConfig must be used within an AdminConfigProvider');
  }
  return context;
};
