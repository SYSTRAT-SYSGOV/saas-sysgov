import { describe, it, expect } from 'vitest';
import { ADMIN_MODULE_REGISTRY, getAdminModuleByPath, getAllowedAdminModules } from '../config/adminModuleRegistry';

describe('Admin Module Registry', () => {
  it('should have all expected modules registered', () => {
    const expectedModules = [
      'admin_dashboard',
      'admin_analytics',
      'admin_users',
      'admin_tenants',
      'admin_records',
      'admin_menus',
      'admin_billing',
      'admin_apis',
      'admin_logs',
      'admin_settings',
      'admin_profile',
      'contratos',
      'helpdesk',
      'contabilidade',
    ];

    expectedModules.forEach(id => {
      expect(ADMIN_MODULE_REGISTRY[id]).toBeDefined();
      expect(ADMIN_MODULE_REGISTRY[id].id).toBe(id);
      expect(ADMIN_MODULE_REGISTRY[id].path).toBeDefined();
      expect(ADMIN_MODULE_REGISTRY[id].component).toBeDefined();
    });
  });

  it('should get module by path', () => {
    const dashboard = getAdminModuleByPath('/admin/dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.id).toBe('admin_dashboard');

    const notFound = getAdminModuleByPath('/admin/nonexistent');
    expect(notFound).toBeUndefined();
  });

  it('should filter modules by allowed roles', () => {
    const superAdminModules = getAllowedAdminModules(['SUPER_ADMIN']);
    expect(superAdminModules.length).toBeGreaterThan(0);

    const analystModules = getAllowedAdminModules(['ANALYST']);
    expect(analystModules.every(m => m.allowedRoles?.includes('ANALYST') || !m.allowedRoles)).toBe(true);

    const unknownRoleModules = getAllowedAdminModules(['UNKNOWN_ROLE']);
    expect(unknownRoleModules.length).toBe(0);
  });

  it('should have required permissions for all modules', () => {
    Object.values(ADMIN_MODULE_REGISTRY).forEach(module => {
      expect(module.requiredPermission).toBeDefined();
      expect(module.requiredPermission).toContain('.');
    });
  });

  it('should have unique paths', () => {
    const paths = Object.values(ADMIN_MODULE_REGISTRY).map(m => m.path);
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
  });
});