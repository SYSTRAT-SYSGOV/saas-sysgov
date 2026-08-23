import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { ToastContainer } from './components/Toast';
import { ToastMessage, ComparativeMode } from './types/fiscal';
import { DashboardPage } from './pages/DashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { AdminConfigProvider, useAdminConfig } from './contexts/AdminConfigContext';

function MainDashboardApp() {
  const { isAuthenticated, authRole, logout } = useAuthContext();
  const { config } = useAdminConfig();

  const [ano, setAno] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<string>('admin_dashboard');
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sidebar Retrátil States (Aberto por padrão em Desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
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

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('admin_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('admin_dark_mode', String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  // Comparative states
  const [comparativeMode, setComparativeMode] = useState<ComparativeMode>('anual');
  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [isComparativoAnual, setIsComparativoAnual] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('todas');

  // Toast Helpers
  const addToast = (toastData: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const newToast: ToastMessage = {
      ...toastData,
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    setToasts((prev) => [newToast, ...prev.filter((t) => t.title !== newToast.title)].slice(0, 4));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPeriod('todos');
    setSelectedUnidade('todas');
    setComparativeMode('anual');
    setIsComparativoAnual(false);
    setSelectedMonth(8);
    setSelectedQuarter(1);
  };

  const handleLogout = () => {
    logout();
    addToast({
      type: 'info',
      title: 'Sessão Encerrada',
      message: 'Você saiu da plataforma administrativa com segurança.',
    });
  };

  // =========================================================================
  // GATEWAY DE AUTENTICAÇÃO: Se não estiver logado, exibe Login Master
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <AdminLoginPage
        onLoginSuccess={() => {
          setActiveTab('admin_dashboard');
          addToast({
            type: 'success',
            title: 'Sessão Autenticada',
            message: 'Bem-vindo ao Painel Administrativo Universal.',
          });
        }}
      />
    );
  }

  // =========================================================================
  // AMBIENTE AUTENTICADO: Dashboard Master & Painel Administrativo Universal
  // =========================================================================
  return (
    <div className="dashboard-full min-h-screen bg-slate-50 dark:bg-[#0a1128] text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden max-w-full transition-colors duration-200">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onClearAll={() => setToasts([])}
      />

      {/* Sidebar Retrátil Lateral Sofisticada */}
      {!isPresentationMode && (
        <SidebarNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
          isPinned={isSidebarPinned}
          onTogglePinned={handleTogglePinned}
          authRole={authRole}
          cidade={config.appName}
        />
      )}

      {/* Main Layout Area com Margem Dinâmica da Sidebar */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pl-0 ${
          isSidebarOpen ? 'lg:pl-80' : 'lg:pl-16'
        }`}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
          <DashboardPage
            activeTab={activeTab}
            ano={ano}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            selectedUnidade={selectedUnidade}
            setSelectedUnidade={setSelectedUnidade}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isComparativoAnual={isComparativoAnual}
            onToggleComparativoAnual={setIsComparativoAnual}
            comparativeMode={comparativeMode}
            onComparativeModeChange={setComparativeMode}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedQuarter={selectedQuarter}
            onQuarterChange={setSelectedQuarter}
            onResetFilters={handleResetFilters}
            activeTenant={{
              id: 'tenant-01',
              nomePrefeitura: config.companyName,
              cidade: config.appName,
              uf: 'BR',
              codigoIbge: '0000000',
            }}
            authRole={authRole}
            onNavigateToTab={setActiveTab}
            onAddToast={addToast}
            isPresentationMode={isPresentationMode}
          />
        </main>

        <footer className="bg-[#0a1128] border-t border-[#1a2a52] text-slate-400 text-xs py-5 mt-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">
                {config.appName} — {config.appSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-xs font-mono">
              {config.showPoweredBy && (
                <span>Powered by {config.companyName}</span>
              )}
              <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                v2.5.0-universal
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AdminConfigProvider>
      <AuthProvider>
        <TenantProvider>
          <MainDashboardApp />
        </TenantProvider>
      </AuthProvider>
    </AdminConfigProvider>
  );
}
