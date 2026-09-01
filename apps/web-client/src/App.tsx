import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { TenantProvider } from '@/core/tenant/TenantProvider';
import { OrgUnitProvider } from '@/core/orgunit/OrgUnitProvider';
import { AppRouter } from '@/core/router/AppRouter';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <OrgUnitProvider>
            <AppRouter />
          </OrgUnitProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
