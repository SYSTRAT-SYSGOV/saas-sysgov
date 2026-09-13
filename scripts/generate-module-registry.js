/**
 * Gera moduleRegistry.generated.ts para o web-client a partir do catálogo de módulos da API
 * com suporte a fallback offline direto do filesystem (apps/api/Modules e apps/web-client/src/modules).
 * 
 * Uso: node scripts/generate-module-registry.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const API_MODULES_DIR = path.join(ROOT_DIR, 'apps', 'api', 'Modules');
const WEB_MODULES_DIR = path.join(ROOT_DIR, 'apps', 'web-client', 'src', 'modules');
const OUTPUT_FILE = path.join(ROOT_DIR, 'apps', 'web-client', 'src', 'config', 'moduleRegistry.generated.ts');
const REEXPORT_FILE = path.join(ROOT_DIR, 'apps', 'web-client', 'src', 'config', 'moduleRegistry.ts');

const API_URL = process.env.SYSGOV_API_URL || 'http://localhost:8000/api/admin/module-catalog/catalog';

// Mapeamentos conhecidos e componentes nativos
const CORE_MODULE_MAP = {
  dashboard: {
    id: 'dashboard',
    name: 'Gabinete do Prefeito',
    componentPath: '@/modules/dashboard/DashboardModule',
    routePath: '',
    routes: ['', 'dashboard'],
    requiredPermission: 'dashboard.view',
    icon: 'LayoutDashboard',
  },
  org: {
    id: 'org',
    name: 'Estrutura Organizacional',
    componentPath: '@/modules/orgchart/OrgChartModule',
    routePath: 'organograma',
    routes: ['organograma', 'org'],
    requiredPermission: 'org.view',
    icon: 'Building2',
  },
  procurement: {
    id: 'procurement',
    name: 'Licitações & Compras',
    componentPath: '@/modules/procurement/ProcurementModule',
    routePath: 'licitacoes',
    requiredPermission: 'procurement.view',
    icon: 'FileCheck',
  },
  contracts: {
    id: 'contracts',
    name: 'Contratos Administrativos',
    componentPath: '@/modules/contracts/ContractsModule',
    routePath: 'contratos',
    requiredPermission: 'contracts.view',
    icon: 'Handshake',
  },
  finance: {
    id: 'finance',
    name: 'Gestão Financeira & Orçamentária',
    componentPath: '@/modules/finance/FinanceModule',
    routePath: 'financeiro',
    requiredPermission: 'finance.view',
    icon: 'DollarSign',
  },
  pedagogico: {
    id: 'pedagogico',
    name: 'Gestão Pedagógica',
    componentPath: '@/modules/pedagogico/PedagogicoModule',
    routePath: 'pedagogico',
    requiredPermission: 'pedagogico.view',
    icon: 'BookOpen',
  },
  rh: {
    id: 'rh',
    name: 'Recursos Humanos',
    componentPath: '@/modules/rh/RhModule',
    routePath: 'rh',
    requiredPermission: 'rh.view',
    icon: 'Users',
  },
  cemiterios: {
    id: 'cemiterios',
    name: 'Gestão de Cemitérios',
    componentPath: '@/modules/cemiterios/CemiteriosModule',
    routePath: 'cemiterios',
    requiredPermission: 'cemiterios.view',
    icon: 'Shield',
  },
  users: {
    id: 'users',
    name: 'Usuários & Acessos',
    componentPath: '@/modules/access/AccessManagement',
    routePath: 'usuarios',
    requiredPermission: 'users.manage',
    icon: 'ShieldCheck',
  },
  menuManager: {
    id: 'menuManager',
    name: 'Gerenciador de Menus',
    componentPath: '@/modules/access/MenuManager',
    routePath: 'gerenciar-menus',
    isAdminOnly: true,
    icon: 'Settings2',
  },
  moduleGranularity: {
    id: 'moduleGranularity',
    name: 'Granularidade de Módulos',
    componentPath: '@/modules/access/ModuleGranularityManager',
    routePath: 'granularidade-módulos',
    routes: ['granularidade-módulos', 'granularidade-modulos'],
    isAdminOnly: true,
    icon: 'Shield',
  },
  permissionMatrix: {
    id: 'permissionMatrix',
    name: 'Matriz de Permissões',
    componentPath: '@/modules/access/PermissionMatrix',
    routePath: 'matriz-permissoes',
    isAdminOnly: true,
    icon: 'Shield',
  },
  capd: {
    id: 'capd',
    name: 'Comissão de Avaliação Periódica de Desempenho (CAPD)',
    componentPath: '@/modules/capd/CapdModule',
    routePath: 'capd',
    routes: ['capd', 'capd/*'],
    requiredPermission: 'capd.view',
    icon: 'ClipboardCheck',
  },
};

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Tenta buscar o catálogo via API
async function fetchCatalogFromApi() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const json = await response.json();
    return Array.isArray(json.data) ? json.data : null;
  } catch (err) {
    return null;
  }
}

// Fallback offline lendo apps/api/Modules/*/module.json
function discoverModulesFromFilesystem() {
  const discovered = [];
  if (!fs.existsSync(API_MODULES_DIR)) return discovered;

  const entries = fs.readdirSync(API_MODULES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(API_MODULES_DIR, entry.name, 'module.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (config.alias && config.name) {
          discovered.push({
            id: entry.name,
            name: config.name,
            alias: config.alias,
            description: config.description || '',
            enabled: config.enabled !== false,
            icon: config.menu?.icon || 'Layers',
            route: config.alias,
            permission: `${config.alias}.view`,
          });
        }
      } catch {}
    }
  }
  return discovered;
}

function resolveComponentPath(alias, name) {
  const studly = capitalizeFirst(alias);
  const candidates = [
    { file: path.join(WEB_MODULES_DIR, alias, `${studly}Module.tsx`), import: `@/modules/${alias}/${studly}Module` },
    { file: path.join(WEB_MODULES_DIR, alias, `${name}Module.tsx`), import: `@/modules/${alias}/${name}Module` },
    { file: path.join(WEB_MODULES_DIR, alias, 'index.tsx'), import: `@/modules/${alias}` },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.file)) {
      return candidate.import;
    }
  }
  return null;
}

function generateRegistryCode(apiModules, fsModules) {
  const merged = { ...CORE_MODULE_MAP };

  // Integrar módulos da API ou do filesystem
  const sourceModules = apiModules && apiModules.length > 0 ? apiModules : fsModules;

  for (const mod of sourceModules) {
    const alias = mod.alias;
    if (!alias || alias === 'admin') continue;

    if (!merged[alias]) {
      const route = mod.route || (mod.menu_items && mod.menu_items[0]?.route) || alias;
      const componentImport = resolveComponentPath(alias, mod.name);

      merged[alias] = {
        id: alias,
        name: mod.name,
        componentPath: componentImport, // null se ainda não houver arquivo físico
        routePath: route,
        requiredPermission: `${alias}.view`,
        icon: mod.icon || 'Layers',
        description: mod.description || '',
      };
    }
  }

  const imports = new Set([
    "import React, { lazy } from 'react';",
    "import { ModulePlaceholder } from '@/components/ModulePlaceholder';",
  ]);

  const moduleDefinitions = [];

  for (const [key, item] of Object.entries(merged)) {
    const varName = `${capitalizeFirst(key)}Component`;
    if (item.componentPath) {
      imports.add(`const ${varName} = lazy(() => import('${item.componentPath}'));`);
    } else {
      imports.add(
        `const ${varName} = lazy(async () => ({ default: () => React.createElement(ModulePlaceholder, { name: "${item.name}", alias: "${item.id}", description: "${item.description || ''}" }) }));`
      );
    }

    const routesArray = item.routes ? JSON.stringify(item.routes) : `['${item.routePath || key}']`;
    const adminOnlyFlag = item.isAdminOnly ? `\n    isAdminOnly: true,` : '';

    moduleDefinitions.push(`  ${key}: {
    id: '${item.id}',
    name: ${JSON.stringify(item.name)},
    component: ${varName},
    routePath: '${item.routePath !== undefined ? item.routePath : key}',
    routes: ${routesArray},
    requiredPermission: '${item.requiredPermission || ''}',${adminOnlyFlag}
    icon: '${item.icon || 'Layers'}',
  }`);
  }

  return `// @generated by scripts/generate-module-registry.js
// NÃO EDITE MANUALMENTE — execute \`npm run generate:registry\` para atualizar

${Array.from(imports).join('\n')}

export interface ModuleDefinition {
  id: string;
  name: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  routePath?: string;
  routes?: string[];
  requiredPermission?: string;
  isAdminOnly?: boolean;
  icon?: string;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
${moduleDefinitions.join(',\n')}
};

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[id];
}

export function getEnabledModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

export function getModuleRoute(id: string): string {
  const mod = MODULE_REGISTRY[id];
  if (!mod) return '/';
  if (mod.routePath === '') return '/';
  return mod.routePath ? \`/\${mod.routePath}\` : \`/\${id}\`;
}
`;
}

async function main() {
  console.log('--- SYSGOV Module Registry Generator ---');
  let apiModules = null;
  try {
    apiModules = await fetchCatalogFromApi();
    if (apiModules) {
      console.log(`✓ Catálogo obtido da API viva (${apiModules.length} módulos).`);
    } else {
      console.log('ℹ API offline ou inacessível — usando descoberta estática do filesystem.');
    }
  } catch {
    console.log('ℹ API offline — usando descoberta estática do filesystem.');
  }

  const fsModules = discoverModulesFromFilesystem();
  console.log(`✓ Encontrados ${fsModules.length} módulos no filesystem backend.`);

  const content = generateRegistryCode(apiModules, fsModules);

  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
  console.log(`✓ Registry gerado com sucesso em: ${OUTPUT_FILE}`);

  const reexportContent = `// @generated by scripts/generate-module-registry.js
// Re-exporta o registry gerado automaticamente

export {
  MODULE_REGISTRY,
  getModuleById,
  getEnabledModules,
  getModuleRoute,
} from './moduleRegistry.generated';
export type { ModuleDefinition } from './moduleRegistry.generated';
`;

  fs.writeFileSync(REEXPORT_FILE, reexportContent, 'utf8');
  console.log(`✓ Re-export sincronizado em: ${REEXPORT_FILE}`);
}

main();