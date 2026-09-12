import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SidebarNav } from '@/components/SidebarNav';
import { ToastContainer } from '@/components/Toast';
import { ToastMessage, ComparativeMode } from '@/types/fiscal';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { AdminConfigProvider, useAdminConfig } from '@/contexts/AdminConfigContext';
import { ADMIN_MODULE_REGISTRY, getAdminModuleByPath, getAdminModuleById } from '@/config/adminModuleRegistry';
import { lazyWithNamedExport } from '@/lib/lazy';

const AdminLoginPage = lazyWithNamedExport(() => import('@/pages/AdminLoginPage'), 'AdminLoginPage');
const DashboardPage = lazyWithNamedExport(() => import('@/pages/DashboardPage'), 'DashboardPage');

function LoadingFallback() {
  return (
    <div className="flex h-[400px] items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        Carregando módulo administrativo...
      </span>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

interface AdminLayoutContext {
  onNavigate: (tabId: string) => void;
  onAddToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
}

export function useAdminLayoutContext() {
  return useOutletContext<AdminLayoutContext>();
}

export function ModuleRoute({ path }: { path: string }) {
  const module = getAdminModuleByPath(path);
  const layoutContext = useOutletContext<AdminLayoutContext>();
  if (!module) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  const Component = module.component;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component onNavigate={layoutContext.onNavigate} onAddToast={layoutContext.onAddToast} />
    </Suspense>
  );
}

function AdminLayout() {
  const { isAuthenticated, authRole, logout } = useAuthContext();
  const { config } = useAdminConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [ano, setAno] = React.useState<number>(2026);
  const [isPresentationMode, setIsPresentationMode] = React.useState<boolean>(false);
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isSidebarPinned, setIsSidebarPinned] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('admin_sidebar_pinned');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleTogglePinned = () => {
    setIsSidebarPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_pinned', String(next));
      } catch {}
      return next;
    });
  };

  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('admin_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('admin_dark_mode', String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  const addToast = (toastData: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const newToast: ToastMessage = {
      ...toastData,
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    setToasts((prev) => [newToast, ...prev.filter((t) => t.title !== newToast.title)].slice(0, 4));
  };

  const handleLogout = () => {
    logout();
    addToast({
      type: 'info',
      title: 'Sessão Encerrada',
      message: 'Você saiu da plataforma administrativa com segurança.',
    });
    navigate('/admin/login', { replace: true });
  };

  const handleNavigateTab = (target: string) => {
    if (target.startsWith('/')) {
      navigate(target);
    } else {
      const mod = getAdminModuleById(target) || getAdminModuleByPath(target);
      if (mod) {
        navigate(mod.path);
      } else {
        navigate(`/admin/${target}`);
      }
    }
  };

  return (
    <div className="dashboard-full min-h-screen bg-slate-50 dark:bg-[#0a1128] text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden max-w-full transition-colors duration-200">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onClearAll={() => setToasts([])}
      />

      {!isPresentationMode && (
        <SidebarNav
          activeTab={location.pathname}
          setActiveTab={handleNavigateTab}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
          isPinned={isSidebarPinned}
          onTogglePinned={handleTogglePinned}
          authRole={authRole}
          cidade={config.appName}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pl-0 ${
          isSidebarOpen ? 'lg:pl-80' : 'lg:pl-16'
        }`}
      >
        <Header
          activeTab={location.pathname}
          setActiveTab={handleNavigateTab}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
          anoSelecionado={ano}
          onSelectAno={setAno}
          tenantInfo={{
            id: 'tenant-01',
            nomePrefeitura: config.companyName,
            cidade: config.appName,
            uf: 'BR',
            codigoIbge: '0000000',
            branding: {
              isCustomized: true,
              customPortalTitle: config.appName,
              customPrimaryColor: config.primaryColor,
              showSaaSBranding: config.showPoweredBy,
            } as any,
          }}
          authRole={authRole}
        />

        <main className="flex-1 w-full max-w-full px-3 sm:px-5 lg:px-7 py-4 sm:py-5 transition-all duration-300 pb-16 overflow-x-hidden bg-slate-50 dark:bg-[#0a1128]">
          <Outlet context={{ onNavigate: handleNavigateTab, onAddToast: addToast } satisfies AdminLayoutContext} />
        </main>

        <footer className="bg-white dark:bg-[#0a1128] border-t border-slate-200 dark:border-[#1a2a52] text-slate-600 dark:text-slate-400 text-xs py-5 mt-auto transition-colors">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {config.appName} — {config.appSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-xs font-mono">
              {config.showPoweredBy && (
                <span>Powered by {config.companyName}</span>
              )}
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded">
                v2.5.0-universal
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function LoginPageWrapper() {
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <AdminLoginPage
      onLoginSuccess={() => navigate('/admin/dashboard', { replace: true })}
    />
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AdminConfigProvider>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/admin/login" element={<LoginPageWrapper />} />
              <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="/admin/dashboard" element={<ModuleRoute path="/admin/dashboard" />} />
                <Route path="/admin/analytics" element={<ModuleRoute path="/admin/analytics" />} />
                <Route path="/admin/users" element={<ModuleRoute path="/admin/users" />} />
                <Route path="/admin/roles" element={<Navigate to="/admin/users?tab=roles" replace />} />
                <Route path="/admin/permissions" element={<Navigate to="/admin/users?tab=permissions" replace />} />
                <Route path="/admin/tenants" element={<ModuleRoute path="/admin/tenants" />} />
                <Route path="/admin/records" element={<ModuleRoute path="/admin/records" />} />
                <Route path="/admin/menus" element={<ModuleRoute path="/admin/menus" />} />
                <Route path="/admin/billing" element={<ModuleRoute path="/admin/billing" />} />
                <Route path="/admin/apis" element={<ModuleRoute path="/admin/apis" />} />
                <Route path="/admin/logs" element={<ModuleRoute path="/admin/logs" />} />
                <Route path="/admin/settings" element={<ModuleRoute path="/admin/settings" />} />
                <Route path="/admin/ia" element={<ModuleRoute path="/admin/ia" />} />
                <Route path="/admin/profile" element={<ModuleRoute path="/admin/profile" />} />
                <Route path="/admin/contratos" element={<ModuleRoute path="/admin/contratos" />} />
                <Route path="/admin/helpdesk" element={<ModuleRoute path="/admin/helpdesk" />} />
                <Route path="/admin/contabilidade" element={<ModuleRoute path="/admin/contabilidade" />} />
                <Route path="/admin/module-catalog" element={<ModuleRoute path="/admin/module-catalog" />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </AdminConfigProvider>
    </BrowserRouter>
  );
}