import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { TenantProvider } from '@/core/tenant/TenantProvider';
import { AppRouter } from '@/core/router/AppRouter';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <AppRouter />
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
