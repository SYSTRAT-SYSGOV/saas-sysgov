import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';
import { AppShell } from '@/core/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { TenantSelectorPage } from '@/pages/TenantSelectorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { Loader2 } from 'lucide-react';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gov-page flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-gov-primary animate-spin" />
        <span className="font-mono text-xs text-gov-text-muted">Autenticando sessão segura...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Module Access Guard
const ModuleRouteGuard: React.FC<{ moduleId: string; children: React.ReactElement }> = ({
  moduleId,
  children,
}) => {
  const { hasModule, can } = useCan();
  const moduleDef = MODULE_REGISTRY[moduleId];

  if (!hasModule(moduleId)) {
    return <Navigate to="/404" replace />;
  }

  if (moduleDef?.requiredPermission && !can(moduleDef.requiredPermission)) {
    return <Navigate to="/404" replace />;
  }

  return children;
};

// Admin-only route guard (admin_tenant only)
const AdminRouteGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gov-primary" />
      </div>
    );
  }
  const isAdminTenant = user?.roles?.includes('admin_tenant') ?? false;
  if (!isAdminTenant) {
    return <Navigate to="/404" replace />;
  }
  return children;
};

export const AppRouter: React.FC = () => {
  const DashboardComp = MODULE_REGISTRY.dashboard.component;
  const OrgComp = MODULE_REGISTRY.org.component;
  const ProcurementComp = MODULE_REGISTRY.procurement.component;
  const ContractsComp = MODULE_REGISTRY.contracts.component;
  const FinanceComp = MODULE_REGISTRY.finance.component;
  const PedagogicoComp = MODULE_REGISTRY.pedagogico.component;
  const RhComp = MODULE_REGISTRY.rh.component;
  const CemiteriosComp = MODULE_REGISTRY.cemiterios.component;
  const UsersComp = MODULE_REGISTRY.users.component;
  const MenuManagerComp = MODULE_REGISTRY.menuManager.component;
  const ModuleGranularityComp = MODULE_REGISTRY.moduleGranularity.component;

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/selecionar-tenant" element={<TenantSelectorPage />} />
      <Route path="/selecionar-orgao" element={<TenantSelectorPage />} />

      {/* Protected AppShell Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <ModuleRouteGuard moduleId="dashboard">
              <DashboardComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="organograma"
          element={
            <ModuleRouteGuard moduleId="org">
              <OrgComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="licitacoes"
          element={
            <ModuleRouteGuard moduleId="procurement">
              <ProcurementComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="contratos"
          element={
            <ModuleRouteGuard moduleId="contracts">
              <ContractsComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="financeiro"
          element={
            <ModuleRouteGuard moduleId="finance">
              <FinanceComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="pedagogico"
          element={
            <ModuleRouteGuard moduleId="pedagogico">
              <PedagogicoComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="rh"
          element={
            <ModuleRouteGuard moduleId="rh">
              <RhComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="cemiterios"
          element={
            <ModuleRouteGuard moduleId="cemiterios">
              <CemiteriosComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="usuarios"
          element={
            <ModuleRouteGuard moduleId="users">
              <UsersComp />
            </ModuleRouteGuard>
          }
        />
        <Route
          path="gerenciar-menus"
          element={
            <AdminRouteGuard>
              <MenuManagerComp />
            </AdminRouteGuard>
          }
        />
        <Route
          path="granularidade-módulos"
          element={
            <AdminRouteGuard>
              <ModuleGranularityComp />
            </AdminRouteGuard>
          }
        />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
