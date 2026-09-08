import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserAccessModule } from './UserAccessModule';

// Mock child components to keep the test focused and fast
vi.mock('./UserManagement', () => ({
  UserManagement: () => <div data-testid="user-management-tab">Conteúdo Usuários</div>,
}));

vi.mock('./RoleManagement', () => ({
  RoleManagement: () => <div data-testid="role-management-tab">Conteúdo Roles</div>,
}));

vi.mock('./PermissionManagement', () => ({
  PermissionManagement: () => <div data-testid="permission-management-tab">Conteúdo Permissões</div>,
}));

vi.mock('./InvitationsPage', () => ({
  InvitationsPage: () => <div data-testid="invitations-page-tab">Conteúdo Convites</div>,
}));

vi.mock('./AnalystManagement', () => ({
  default: () => <div data-testid="analyst-management-tab">Conteúdo Analistas</div>,
}));

describe('UserAccessModule', () => {
  it('renderiza todas as abas (Usuários, Roles, Permissões, Convites, Analistas)', () => {
    render(
      <MemoryRouter>
        <UserAccessModule />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permissões/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convites/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analistas/i })).toBeInTheDocument();

    // Default tab is users
    expect(screen.getByTestId('user-management-tab')).toBeInTheDocument();
  });

  it('permite alternar entre as abas ao clicar nelas', () => {
    render(
      <MemoryRouter>
        <UserAccessModule />
      </MemoryRouter>
    );

    // Clica em Roles
    fireEvent.click(screen.getByRole('button', { name: /roles/i }));
    expect(screen.getByTestId('role-management-tab')).toBeInTheDocument();

    // Clica em Permissões
    fireEvent.click(screen.getByRole('button', { name: /permissões/i }));
    expect(screen.getByTestId('permission-management-tab')).toBeInTheDocument();

    // Clica em Convites
    fireEvent.click(screen.getByRole('button', { name: /convites/i }));
    expect(screen.getByTestId('invitations-page-tab')).toBeInTheDocument();

    // Clica em Analistas
    fireEvent.click(screen.getByRole('button', { name: /analistas/i }));
    expect(screen.getByTestId('analyst-management-tab')).toBeInTheDocument();
  });
});
