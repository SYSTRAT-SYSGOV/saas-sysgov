import { useAuth } from '@/core/auth/useAuth';

export interface UseCanReturn {
  can: (permission?: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  hasModule: (moduleName?: string) => boolean;
  hasRole: (roleName?: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  userPermissions: string[];
  activeModules: string[];
}

export const useCan = (): UseCanReturn => {
  const { user, permissions, modules } = useAuth();

  const can = (permission?: string): boolean => {
    if (!permission) return true;
    return permissions.includes(permission) || permissions.includes('*') || permissions.includes('admin');
  };

  const canAny = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true;
    return perms.some(p => can(p));
  };

  const canAll = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true;
    return perms.every(p => can(p));
  };

  const hasModule = (moduleName?: string): boolean => {
    if (!moduleName) return true;
    return modules.includes(moduleName) || modules.includes('*');
  };

  const hasRole = (roleName?: string): boolean => {
    if (!roleName) return true;
    const userRoles = user?.roles || [];
    return userRoles.includes(roleName);
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!roleNames || roleNames.length === 0) return true;
    const userRoles = user?.roles || [];
    return roleNames.some(r => userRoles.includes(r));
  };

  return {
    can,
    canAny,
    canAll,
    hasModule,
    hasRole,
    hasAnyRole,
    userPermissions: permissions,
    activeModules: modules,
  };
};
