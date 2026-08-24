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
│   │   └── ui/             # Re-exports e componentes base (@sysgov/ui)
│   ├── config/
│   │   ├── iconMap.ts      # Mapeador de ícones Lucide para menu dinâmico
│   │   ├── moduleRegistry.ts # Registro de módulos de negócio lazy
│   │   └── theme.ts        # Tokens e funções de White-label dinâmico
│   ├── core/
│   │   ├── api/
│   │   │   └── client.ts   # Axios configurado (baseURL: /api, interceptors)
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx # Contexto de autenticação, sessão e multi-tenant
│   │   │   └── useAuth.ts  # Hook de autenticação
│   │   ├── layout/
│   │   │   ├── AppShell.tsx # App Shell unificado (Sidebar + TopBar + Conteúdo)
│   │   │   ├── Sidebar.tsx  # Menu dinâmico do backend com atalhos e badges
│   │   │   ├── TopBar.tsx   # Cabeçalho com busca, contexto e ações
│   │   │   └── Footer.tsx   # Rodapé institucional Gov.br / White-label
│   │   ├── rbac/
│   │   │   └── useCan.ts    # Hook de controle de acesso (permissões, módulos, roles)
│   │   ├── router/
│   │   │   └── AppRouter.tsx # Roteador com guards e lazy loading
│   │   └── tenant/
│   │       ├── TenantProvider.tsx # Contexto de tenant e aplicação de tema
│   │       └── useTenant.ts # Hook do tenant ativo
│   ├── modules/            # Módulos de negócio como plugins do shell
│   │   ├── cemiterios/     # Módulo Gestão de Cemitérios
│   │   ├── contracts/      # Módulo Contratos & Aditivos
│   │   ├── dashboard/      # Módulo Painel Geral / Visão Estratégica
│   │   ├── finance/        # Módulo Execução Financeira
│   │   ├── pedagogico/     # Módulo Pedagógico / Educação
│   │   ├── procurement/    # Módulo Licitações & Editais
│   │   └── rh/             # Módulo Recursos Humanos & Folha
│   ├── pages/              # Páginas de nível superior
│   │   ├── LoginPage.tsx   # Login local e SSO (Gov.br / OpenID Connect)
│   │   ├── TenantSelectorPage.tsx # Seleção de órgão/município
│   │   └── NotFoundPage.tsx # Página 404 padronizada
│   ├── styles/
│   │   └── tokens.css      # CSS variables Gov.br e SYSGOV
│   ├── test/
│   │   └── setup.ts        # Setup de ambiente de testes Vitest
│   ├── App.tsx             # Componente raiz com Providers
│   ├── index.css           # Estilos globais e fontes
│   └── main.tsx            # Ponto de entrada React
├── package.json            # Scripts, dependências do workspace
├── tsconfig.json           # Configuração TypeScript e aliases
└── vite.config.ts          # Configuração Vite (porta 5174, proxies /api e /sanctum)
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

2. **Terminal 2 — Frontend Integrado**:
   ```bash
   # Executar apenas o web-client:
   npm run dev:client

   # Ou executar ambos os frontends simultaneamente:
   npm run dev:all
   ```

3. **Acesso no Navegador**:
   - Acesse [http://localhost:5174](http://localhost:5174)
   - O proxy reverso no `vite.config.ts` encaminha automaticamente `/api` e `/sanctum` para `http://localhost:8000`, eliminando erros de CORS em desenvolvimento.

---

## 🧩 3. Como Registrar um Novo Módulo de Negócio

Para adicionar um novo módulo ao `web-client` (ex: `Organograma` ou `Almoxarifado`):

### 1. Criar o componente do módulo em `src/modules/{nome}/`:
```tsx
// src/modules/organograma/OrganogramaModule.tsx
import React from 'react';
import { Card, KpiCard, Button } from '@sysgov/ui';

export const OrganogramaModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gov-text-primary font-sans">
        Estrutura Organizacional
      </h1>
      {/* Conteúdo do módulo */}
    </div>
  );
};

export default OrganogramaModule;
```

### 2. Registrar no `src/config/moduleRegistry.ts`:
```typescript
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // ... outros módulos
  organograma: {
    id: 'organograma',
    name: 'Organograma & Unidades',
    component: lazy(() => import('@/modules/organograma/OrganogramaModule')),
    requiredPermission: 'organograma.view',
  },
};
```

### 3. Registrar o ícone no `src/config/iconMap.ts` (se necessário):
```typescript
import { Network } from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  // ...
  Network,
};
```

### 4. Adicionar a rota protegida no `src/core/router/AppRouter.tsx`:
```tsx
<Route
  path="organograma"
  element={
    <ModuleRouteGuard moduleId="organograma">
      <OrganogramaComp />
    </ModuleRouteGuard>
  }
/>
```

---

## 🔒 4. Autenticação e Gestão de Sessão (ADR)

- **Estratégia de Token**:
  - `baseURL`: `/api` (relativa).
  - O `apiClient` (`axios`) injeta automaticamente o cabeçalho `Authorization: Bearer <token>` e `X-Tenant-ID`.
  - Tratamento de erro `401`: limpa o storage e redireciona automaticamente para `/login`.
  - No MVP, o token de sessão é armazenado em `localStorage` sob a chave `sysgov_auth_token` com CSP estrita, mantendo compatibilidade direta para migração transparente para cookies HttpOnly + CSRF Sanctum em produção.
- **Navegação Dinâmica**:
  - A árvore da barra lateral (`Sidebar`) é estritamente renderizada a partir da lista `navigation` retornada pelo backend na resposta de autenticação / seleção de tenant.
  - O controle de acesso visual utiliza o hook `useCan()` (`can()`, `hasModule()`, `hasRole()`).

---

## 🎨 5. Design System e White-Label

- **Padrão Obrigatório**: Padrão Digital Gov.br com paleta SYSGOV (Emerald `#10B981`, Dark Navy `#0a1128`).
- **Tipografia**:
  - Textos: `Inter` / `rawline` (`font-sans`).
  - **Dados Técnicos**: Obrigatoriamente `JetBrains Mono` (`font-mono tabular-nums`) para valores monetários (`R$`), percentuais (`%`), datas, CNPJs, códigos de processo e identificadores.
- **White-Label por Tenant**:
  - O `TenantProvider` atualiza dinamicamente as variáveis CSS `--gov-primary`, `--gov-primary-hover` e `--gov-primary-light` e os logos conforme o tenant ativo selecionado.

---

## 🧪 6. Comandos de Validação e Testes

```bash
# Executar a suíte de testes unitários (Vitest)
npm --workspace apps/web-client run test

# Executar checagem estrita de tipos (TypeScript)
npm --workspace apps/web-client run typecheck

# Executar build de produção
npm --workspace apps/web-client run build
```
