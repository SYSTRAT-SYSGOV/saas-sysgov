import { describe, it, expect } from 'vitest';
import { MODULE_REGISTRY, getModuleById, getEnabledModules, getModuleRoute } from './moduleRegistry';

describe('moduleRegistry', () => {
  it('deve conter os módulos essenciais registrados', () => {
    expect(MODULE_REGISTRY.dashboard).toBeDefined();
    expect(MODULE_REGISTRY.org).toBeDefined();
    expect(MODULE_REGISTRY.procurement).toBeDefined();
    expect(MODULE_REGISTRY.contracts).toBeDefined();
    expect(MODULE_REGISTRY.finance).toBeDefined();
  });

  it('getModuleById deve retornar o módulo correto', () => {
    const org = getModuleById('org');
    expect(org).toBeDefined();
    expect(org?.id).toBe('org');
    expect(org?.routePath).toBe('organograma');
    expect(org?.requiredPermission).toBe('org.view');
  });

  it('getModuleRoute deve resolver a rota principal de cada módulo', () => {
    expect(getModuleRoute('dashboard')).toBe('/');
    expect(getModuleRoute('org')).toBe('/organograma');
    expect(getModuleRoute('procurement')).toBe('/licitacoes');
    expect(getModuleRoute('contracts')).toBe('/contratos');
    expect(getModuleRoute('finance')).toBe('/financeiro');
  });

  it('getEnabledModules deve retornar lista de todos os módulos', () => {
    const list = getEnabledModules();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(10);
    expect(list.some((m) => m.id === 'dashboard')).toBe(true);
  });

  it('deve conter configuração de rotas e permissões para novos módulos', () => {
    // Verifica que qualquer módulo registrado possui id, component e routes
    Object.values(MODULE_REGISTRY).forEach((mod) => {
      expect(mod.id).toBeDefined();
      expect(mod.name).toBeDefined();
      expect(mod.component).toBeDefined();
      expect(Array.isArray(mod.routes) || typeof mod.routePath === 'string').toBe(true);
    });
  });
});
