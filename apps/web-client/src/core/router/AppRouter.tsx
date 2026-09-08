import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';
import { AppShell } from '@/core/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { TenantSelectorPage } from '@/pages/TenantSelectorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
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

// Module Access Guard — 403 se autenticado sem permissão, 404 se módulo inexistente
const ModuleRouteGuard: React.FC<{ moduleId: string; children: React.ReactElement }> = ({ moduleId, children }) => {
  const { hasModule, can } = useCan();
  const moduleDef = MODULE_REGISTRY[moduleId];

  if (!hasModule(moduleId)) {
    return <ForbiddenPage />;
  }

  if (moduleDef?.requiredPermission && !can(moduleDef.requiredPermission)) {
    return <ForbiddenPage />;
  }

  return children;
};

// Admin-only route guard (admin_tenant only) — 403 se não for admin
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
    return <ForbiddenPage />;
  }
  return children;
};

export const AppRouter: React.FC = () => {
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
        {/* Dynamic Module Routes driven by MODULE_REGISTRY */}
        {Object.values(MODULE_REGISTRY).flatMap((moduleDef) => {
          const Component = moduleDef.component;
          const routes = moduleDef.routes && moduleDef.routes.length > 0
            ? moduleDef.routes
            : [moduleDef.routePath !== undefined ? moduleDef.routePath : moduleDef.id];

          return routes.map((route) => {
            const isIndex = route === '';
            const guardElement = moduleDef.isAdminOnly ? (
              <AdminRouteGuard>
                <Component />
              </AdminRouteGuard>
            ) : (
              <ModuleRouteGuard moduleId={moduleDef.id}>
                <Component />
              </ModuleRouteGuard>
            );

            if (isIndex) {
              return (
                <Route
                  key={`${moduleDef.id}-index`}
                  index
                  element={guardElement}
                />
              );
            }

            return (
              <Route
                key={`${moduleDef.id}-${route}`}
                path={route}
                element={guardElement}
              />
            );
          });
        })}

        <Route path="perfil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;

