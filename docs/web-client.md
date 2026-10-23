# SYSGOV — Frontend Web-Client (`apps/web-client`)

Este documento descreve a arquitetura, execução local, integração com o backend, design system e guia para extensão de módulos no frontend do cliente (`apps/web-client`).

---

## 🏛️ 1. Arquitetura e Estrutura de Pastas

O `web-client` é um SPA moderno construído com React 19, TypeScript, Vite e Tailwind CSS, consumindo os pacotes `@sysgov/ui` (Design System Gov.br + SYSGOV) e `@sysgov/sdk` (Tipos e Cliente de API) através de workspaces do monorepo.

```text
apps/web-client/
├── public/                 # Assets estáticos e logos
├── src/
│   ├── components/
│   │   ├── audit/         # AuditTimeline - trilha de auditoria por registro
│   │   └── ui/            # Componentes shadcn/ui locais
│   ├── config/
│   │   ├── iconMap.ts     # Mapeador de ícones Lucide para menu dinâmico
│   │   ├── moduleRegistry.ts # Registro de módulos de negócio lazy
│   │   └── theme.ts       # Tokens e funções de White-label dinâmico
│   ├── core/
│   │   ├── api/
│   │   │   └── client.ts  # Axios configurado (baseURL: /api, interceptors)
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx # Contexto de autenticação e multi-tenant
│   │   │   └── useAuth.ts  # Hook de autenticação
│   │   ├── export/
│   │   │   └── useExport.ts # Hook unificado para exportação CSV/JSON
│   │   ├── layout/
│   │   │   ├── AppShell.tsx # Shell unificado (Sidebar + TopBar + Conteúdo)
│   │   │   ├── Sidebar.tsx  # Menu drawer responsivo com seletor de unidade
│   │   │   ├── TopBar.tsx  # Cabeçalho com breadcrumbs e perfil
│   │   │   └── Footer.tsx   # Rodapé institucional Gov.br / White-label
│   │   ├── orgunit/
│   │   │   ├── OrgUnitProvider.tsx # Contexto de unidade + ABAC
│   │   │   └── index.ts
│   │   ├── rbac/
│   │   │   └── useCan.ts   # Hook de controle de acesso
│   │   ├── router/
│   │   │   └── AppRouter.tsx # Roteador com guards e lazy loading
│   │   └── tenant/
│   │       ├── TenantProvider.tsx # Contexto de tenant e tema
│   │       └── useTenant.ts  # Hook do tenant ativo
│   ├── modules/            # Módulos de negócio lazy-loaded
│   │   ├── access/        # AccessManagement, ModuleGranularityManager, MenuManager, PermissionMatrix
│   │   ├── cemiterios/    # Gestão de Cemitérios
│   │   ├── contracts/     # Contratos & Aditivos
│   │   ├── dashboard/     # Painel Geral / Visão Estratégica
│   │   ├── finance/       # Execução Financeira
│   │   ├── orgchart/      # Organograma (árvore, tabela, cards)
│   │   ├── pedagogico/    # Pedagógico / Educação
│   │   ├── procurement/    # Licitações & Editais
│   │   ├── rh/            # Recursos Humanos & Folha
│   │   └── users/         # Usuários (listagem, MFA)
│   ├── pages/              # Páginas de nível superior
│   │   ├── LoginPage.tsx   # Login local e SSO (Gov.br / OpenID Connect)
│   │   ├── ProfilePage.tsx # Perfil (dados, senha, sessões, permissões)
│   │   ├── TenantSelectorPage.tsx # Seleção de órgão/município
│   │   ├── ForbiddenPage.tsx # Página 403 (sem permissão)
│   │   └── NotFoundPage.tsx # Página 404
│   ├── test/
│   │   └── setup.ts        # Setup Vitest (@testing-library/jest-dom)
│   ├── App.tsx             # Componente raiz com Providers
│   ├── index.css           # Estilos globais e CSS vars (GOV.BR + SYSGOV)
│   └── main.tsx            # Ponto de entrada React
├── package.json            # Scripts, dependências do workspace
├── tsconfig.json           # Configuração TypeScript e aliases
└── vite.config.ts         # Configuração Vite (porta 5174, proxies /api e /sanctum)
```

---

## 🚀 2. Como Rodar Localmente

### Portas Oficiais do Monorepo:
- **Backend Laravel (`apps/api`)**: `http://localhost:8000`
- **Painel Admin (`apps/web`)**: `http://localhost:5173`
- **Painel Cliente (`apps/web-client`)**: `http://localhost:5174`

### Passo a Passo de Execução:

1. **Terminal 1 — Backend Laravel**:
   ```bash
   cd apps/api
   php artisan serve --port=8000
   ```

2. **Terminal 2 — Frontend**:
   ```bash
   cd apps/web-client
   npm run dev
   ```

3. **Acesso no Navegador**:
   - Acesse [http://localhost:5174](http://localhost:5174)
   - O proxy reverso no `vite.config.ts` encaminha `/api` e `/sanctum` para `http://localhost:8000`

---

## 🧩 3. Como Registrar um Novo Módulo de Negócio

Para adicionar um novo módulo ao `web-client`:

### 1. Criar o componente em `src/modules/{nome}/`:
```tsx
// src/modules/almoxarifado/AlmoxarifadoModule.tsx
import React from 'react';
import { PageHeader, Card, DataTable } from '@/components/ui';

export const AlmoxarifadoModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Almoxarifado" subtitle="Gestão de estoques" />
      {/* Conteúdo */}
    </div>
  );
};
export default AlmoxarifadoModule;
```

### 2. Registrar no `src/config/moduleRegistry.ts`:
```typescript
almoxarifado: {
  id: 'almoxarifado',
  name: 'Almoxarifado',
  component: lazy(() => import('@/modules/almoxarifado/AlmoxarifadoModule')),
  requiredPermission: 'almoxarifado.view',
},
```

### 3. Adicionar a rota no `src/core/router/AppRouter.tsx`:
```tsx
const AlmoxarifadoComp = MODULE_REGISTRY.almoxarifado.component;

// Na seção Routes:
<Route
  path="almoxarifado"
  element={
    <ModuleRouteGuard moduleId="almoxarifado">
      <AlmoxarifadoComp />
    </ModuleRouteGuard>
  }
/>
```

---

## 🔒 4. Autenticação e Gestão de Sessão

- **Token**: `apiClient` injeta `Authorization: Bearer <token>` e `X-Tenant-ID` automaticamente.
- **Tratamento 401**: limpa storage e redireciona para `/login`.
- **Navegação**: Sidebar 100% vinda do backend via `AuthProvider`.
- **Controle de acesso**: `useCan()` — `can()`, `hasModule()`, `hasRole()`.

### Guards Disponíveis:
- `ProtectedRoute` — exige autenticação
- `ModuleRouteGuard` — exige módulo ativo (`hasModule`)
- `AdminRouteGuard` — exige role `admin_tenant`

---

## 🎨 5. Design System e Tokens

### Componentes shadcn/ui Locais (`@/components/ui`):
`Button`, `Card`, `Badge`, `DataTable`, `Dialog`, `Field`, `Select`, `Switch`, `Tabs`, `Accordion`, `Modal`, `KpiCard`, `StatusChip`, `OrgTypeBadge`, `OrgScopeIndicator`, `OrgTreeNodeCard`, `EmptyState`, `Skeleton`, `PageHeader`, `SearchInput`, `ConfirmDialog`, `ScreenState`

### Tokens Obrigatórios:
| Token | Uso |
|---|---|
| `text-primary` | Títulos e elementos principais |
| `text-muted-foreground` | Textos secundários |
| `bg-primary` | Fundos primários |
| `bg-success/10` | Indicadores de sucesso |
| `bg-destructive` | Ações destrutivas |
| `border-border` | Bordas consistentes |
| `font-mono tabular-nums` | Dados técnicos (R$, %, CNPJ, datas) |

### Cores Hardcoded PROIBIDAS:
Não use `bg-[#...]`, `text-[#...]`, `border-[#...]` nos módulos. Use tokens semânticos.

---

## 🧪 6. Comandos de Validação

```bash
# Tests unitários (Vitest)
cd apps/web-client
npm run test

# Checagem de tipos (TypeScript)
npm run typecheck

# Build de produção
npm run build
```

### Testes Implementados:
- `AuthProvider.test.tsx` — contexto de autenticação
- `useCan.test.tsx` — hook de permissões
- `PageHeader.test.tsx` — componente de cabeçalho
- `ScreenState.test.tsx` — estados de tela
- `ConfirmDialog.test.tsx` — dialog de confirmação
- `DataTable.test.tsx` — tabela com ordenação
- `iconMap.test.ts` — mapeador de ícones

---

## 📦 7. Padrão de Módulo de Negócio

Todo módulo de negócio deve seguir:

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { PageHeader, Card, DataTable, ScreenState, SearchInput, Button } from '@/components/ui';
import { useExport } from '@/core/export';
import { apiClient } from '@/core/api/client';

export const MeuModulo: React.FC = () => {
  const { exportData } = useExport();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Carregar dados da API
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/meu-modulo');
      setData(res.data?.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Colunas da DataTable
  const columns = useMemo(() => [
    { id: 'col1', header: 'Coluna 1', accessorKey: 'col1', cell: ({ row }) => <span>{row.original.col1}</span> },
  ], []);

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Meu Módulo" />
      <ScreenState type="loading" title="Carregando..." />
    </div>
  );

  if (error) return (
    <div className="space-y-6">
      <PageHeader title="Meu Módulo" />
      <ScreenState type="error" title="Erro" description={error} onAction={load} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Módulo"
        subtitle="Descrição do módulo"
        actions={<Button onClick={() => exportData(data, { filename: 'export', format: 'csv', BOM: true })}>Exportar</Button>}
      />
      <Card noPadding>
        <div className="p-3 border-b border-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." />
        </div>
        <div className="p-3">
          <DataTable columns={columns} data={data} pageSize={10} />
        </div>
      </Card>
    </div>
  );
};

export default MeuModulo;
```

### 7.1 Padrão de grades (`DataTable`)

Toda grade de dados do portal segue o padrão da tela do Licita:

- **`DataTable` de `@/components/ui`**, com `exportable`, `exportFileName` e `exportTitle` (exporta CSV, XLSX e PDF de todas as
  linhas filtradas), paginação e seletor de linhas por página (ligados por padrão — não desligue). Tabela `<table>` feita à
  mão não é aceita para listagens.
- **Exportação:** colunas com `accessorKey`/`accessorFn` e cabeçalho em texto saem sozinhas (valor simples). Coluna com `cell`
  customizada declara `meta.exportValue` com o que a célula mostra na tela. `meta.exportIgnore` tira uma coluna do arquivo.
- **Ações da linha:** coluna `acoes` **à esquerda**, com cabeçalho vazio, usando `ActionsMenu` de `@sysgov/ui`. Com mais de uma ação
  vira dropdown (⋮); com uma só, o botão fica direto na linha (o `ActionsMenu` já faz isso). Ações condicionais entram no
  array `items` com `...(condição ? [item] : [])`.
- **Testes:** para acionar um item do menu use `acionarMenu` de `src/test-utils/acoesMenu.ts`.

---

### 7.2 Validação de formulários (`useFormValidationModal`)

Erro de campo (obrigatório vazio ou 422 do backend) aparece sempre na `ValidationErrorModal`, um item por campo — o mesmo padrão do Licita. Nada de balão nativo (`required` HTML), `alert()` nem mensagem crua do Laravel.

```tsx
const { modal, validar, invalidar, tratarErro } = useFormValidationModal();

const salvar = async () => {
  if (!validar([['Nome', nome], ['E-mail', email]])) return; // abre a modal com os vazios
  if (senha !== confirmacao) { invalidar([['Confirmar senha', 'A senha e a confirmação não coincidem.']]); return; }
  try { await api.salvar(...); }
  catch (err) { if (!tratarErro(err)) notify(getApiErrorMessage(err)); } // 422 → modal; outros → mensagem única
};
return <>{modal}…</>;
```

- Em `<form>`, usar `noValidate` e não usar `required` nos inputs (o `*` no rótulo continua).
- Botão "Avançar"/"Salvar" não fica `disabled` por campo faltando: o clique abre a modal.
- Hooks compartilhados que não renderizam JSX (ex.: `useAcao` de Cemitérios e Pessoas) usam a modal global: `tratarErroValidacaoGlobal(err)`, `validarObrigatoriosGlobal(campos)` e `invalidarGlobal(problemas)`, de `@/lib/validationModalHost`. O `ValidationModalHost` é montado uma vez no `AppShell`.
- Quando um teste abre a modal, ela deixa o resto da tela inacessível (`aria-hidden`): feche com o botão "Entendi" antes de interagir de novo.
- Spec: `openspec/changes/padronizar-validacao-formularios-modal`.

## 📝 8. Rotas Registradas

| Rota | Módulo | Guard |
|---|---|---|
| `/` | Dashboard | `ModuleRouteGuard` |
| `/organograma` | OrgChart | `ModuleRouteGuard` |
| `/licitacoes` | Procurement | `ModuleRouteGuard` |
| `/contratos` | Contracts | `ModuleRouteGuard` |
| `/financeiro` | Finance | `ModuleRouteGuard` |
| `/pedagogico` | Pedagogico | `ModuleRouteGuard` |
| `/rh` | Rh | `ModuleRouteGuard` |
| `/cemiterios` | Cemiterios | `ModuleRouteGuard` |
| `/usuarios` | Users | `ModuleRouteGuard` |
| `/gerenciar-menus` | MenuManager | `AdminRouteGuard` |
| `/granularidade-módulos` | ModuleGranularity | `AdminRouteGuard` |
| `/matriz-permissoes` | PermissionMatrix | `AdminRouteGuard` |
| `/perfil` | ProfilePage | `ProtectedRoute` |
| `/login` | LoginPage | Público |
| `/*` | NotFoundPage | — |
