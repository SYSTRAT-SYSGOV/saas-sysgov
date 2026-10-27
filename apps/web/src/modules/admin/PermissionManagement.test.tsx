import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PermissionManagement } from './PermissionManagement';
import { adminApi } from './api';

vi.mock('./api', () => ({
  adminApi: {
    getPermissions: vi.fn(),
    createPermission: vi.fn(),
    updatePermission: vi.fn(),
    deletePermission: vi.fn(),
  },
}));

describe('PermissionManagement', () => {
  it('lista só as permissões de módulos ativos', async () => {
    vi.mocked(adminApi.getPermissions).mockResolvedValue([
      { id: 1, name: 'Visualizar Organograma', slug: 'org.view', module: 'org', module_enabled: true },
      { id: 2, name: 'Visualizar Financeiro', slug: 'finance.view', module: 'finance', module_enabled: false },
    ]);

    render(<PermissionManagement />);

    expect(await screen.findByText('org.view')).toBeInTheDocument();
    expect(screen.queryByText('finance.view')).not.toBeInTheDocument();
    expect(screen.queryByText('Visualizar Financeiro')).not.toBeInTheDocument();
  });
});
