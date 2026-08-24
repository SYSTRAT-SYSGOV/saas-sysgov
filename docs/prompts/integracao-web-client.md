# SYSGOV — Integração do web-client no Monorepo

> **Prompt único, auto-contido e por fases, para MIGRAR o frontend do cliente (`web-client`), atualmente em pasta externa/domínio local, para dentro do monorepo SYSGOV em `apps/web-client`.**
> 
> **Objetivo:** `web-client` funcionando localmente conectado ao backend Laravel (proxy Vite), consumindo `packages/ui` (DS Gov.br + paleta SYSGOV) e `packages/sdk`, com App Shell base pronto para receber módulos de negócio (Licitação, Contratos, Organograma) como plugins do shell.
> 
> Cada fase termina com critérios de aceite antes de avançar.

---

Você é um arquiteto e desenvolvedor full stack sênior especializado em React 18/TypeScript (frontend), Laravel 11 (backend) e monorepos (pnpm/npm workspaces). Sua tarefa é **integrar o frontend do cliente (`web-client`)** — que hoje está em uma pasta externa ao repositório — **dentro do monorepo SYSGOV**, em `apps/web-client`, deixando-o **funcionando localmente conectado ao backend** e **pronto para receber módulos de negócio** (Licitação, Contratos, Organograma etc.) como plugins do shell.

O padrão de código, de design e de configuração DEVE ser rígido, documentado e replicável.

---

# FASE 0 — CONTEXTO E CONTRATO (obrigatório para todas as fases)

## 0.1 Estrutura do Monorepo (destino)

```text
sysgov/
├── apps/
│   ├── api/          # Backend Laravel (módulos em apps/api/Modules)
│   ├── web-admin/    # Painel SYSTRAT (React — já no monorepo)
│   └── web-client/   # Painel do Cliente (React — DESTINO DA MIGRAÇÃO)
├── packages/
│   ├── ui/           # Design System (DS Gov.br + paleta SYSGOV)
│   └── sdk/          # SDK TypeScript gerado do OpenAPI
├── infra/
├── docs/
└── package.json      # Root com workspaces
```

## 0.2 Fonte da migração
- O `web-client` existe em pasta externa ao monorepo (domínio local / outro repositório).
- Conteúdo típico esperado na origem: app React + Vite + TypeScript (App Shell, telas, componentes), com ou sem mock do contrato de API.
- Não recriar o que já funciona — migrar, adaptar e conectar.

## 0.3 Contrato de integração (obrigatório)
- **Porta 5174** para o `web-client` (`web-admin` fica na porta dele, ex.: `5173`).
- **Proxy Vite:** `/api` e `/sanctum` → `http://localhost:8000` (backend Laravel) — elimina CORS em dev.
- **Cliente HTTP** com `baseURL` relativa `/api` (nunca URL absoluta hard-coded).
- **Consumo dos packages do monorepo:** `@sysgov/ui` (design system) e `@sysgov/sdk` (tipos/SDK) — sem duplicar dependências.
- **Design system do web-client:** DS Gov.br (componentes/estrutura) + paleta SYSGOV (emerald `#10B981` primária) — tokens centralizados em Tailwind config + CSS variables.
- **App Shell base funcional:** autenticação (local + SSO), tenant ativo, RBAC (`useCan`), sidebar dinâmica (navegação vinda do backend), roteamento com lazy loading + guard de rota.
- `moduleRegistry` e `iconMap` iniciais — vazios ou com os módulos já existentes, prontos para receber novos.
- **Rodar integrado com o backend:** `npm run dev:all` (ou comando equivalente do monorepo).

## 0.4 Stack e ferramentas
- React 18 + TypeScript (strict) + Vite + Tailwind CSS.
- Ícones `lucide-react` (nunca emojis/SVGs soltos). Componentes base Shadcn/UI ou Radix UI. NUNCA CSS inline.
- Gerenciador de pacotes do monorepo (pnpm recomendado; npm workspaces se já for o caso).
- Acessibilidade WCAG 2.1 AA + eMAG.

## 0.5 Design System (obrigatório no web-client)
- **Tokens (Tailwind config + CSS variables):** Primary: `#10B981` (hover `#059669`, light `#D1FAE5`) | Institucional: `#1351B4` (links) | Fundo: `#F5F6F8` | Surface: `#FFFFFF` | Border: `#E1E3E6` | Texto: `#1B1B1B`/`#444444`/`#6B6B6B`.
- **Status:** Success `#168821` | Warning `#F2A71B` | Danger `#E52207` | Info `#155BCB`.
- **Tipografia:** `JetBrains Mono` OBRIGATÓRIA para dados técnicos (`R$`, `%`, datas, CNPJ, códigos, status); labels de formulário uppercase mono 10px bold.
- Cards brancos, borda `#E1E3E6`, radius 12px. Botões solid (emerald) e ghost. Grids Bento (1/2/3 colunas).
- **White-label por tenant:** ler settings do tenant (`customPrimaryColor`, `customLogoUrl`, `title`/`subtitle`, `hideProviderBranding`) — NUNCA hard-coded.

---

# FASE A — PREPARAÇÃO E ANÁLISE DA ORIGEM

### Objetivo
Entender o estado atual do `web-client` na pasta externa, garantir backup e mapear o que será migrado vs adaptado vs descartado.

### Entregáveis Técnicos
1. **Inventário da pasta de origem (executar antes de mover):**
   - Listar estrutura: `src/`, `public/`, `package.json`, `vite.config.ts`, `tsconfig.json`, `.env*`, `tailwind.config.*`, `index.html`.
   - Identificar: versões (React, Vite, TS), dependências existentes, componentes próprios vs de bibliotecas, mocks de API, telas criadas.
   - Mapear o que migra 1:1 (componentes, telas, hooks) e o que será substituído (mocks → chamadas reais; componentes duplicados → `@sysgov/ui`).
2. **Backup e ramo de trabalho:**
   - Confirmar commit/backup da pasta de origem (`git tag` ou cópia) antes de qualquer movimento.
   - Criar branch de integração no monorepo (ex.: `feat/web-client-integration`).
3. **Verificação do monorepo destino:**
   - Confirmar que `apps/`, `packages/ui` e `packages/sdk` existem e que o root `package.json` tem workspaces configurados.
   - Confirmar a porta do `web-admin` para não conflitar (5174 deve estar livre).

### Critérios de Aceitação da Fase A
- [ ] Inventário documentado (estrutura, dependências, versões)
- [ ] Backup/commit da origem garantido
- [ ] Workspaces do monorepo confirmados e porta 5174 livre

---

# FASE B — MIGRAÇÃO DA PASTA E AJUSTE DE CONFIGURAÇÕES

### Objetivo
Mover o `web-client` para `apps/web-client` e ajustar toda a configuração para viver no monorepo.

### Entregáveis Técnicos
1. **Mover a pasta:**
   ```bash
   mv /caminho/para/web-client ./apps/web-client
   ```
   - Preservar `src/`, `public/`, `index.html`.
   - Remover do `web-client`: lockfiles próprios (`package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`) e `node_modules/` — o monorepo gerencia.

2. **`package.json` (`apps/web-client/package.json`):**
   ```json
   {
     "name": "@sysgov/web-client",
     "private": true,
     "version": "0.1.0",
     "type": "module",
     "scripts": {
       "dev": "vite --port 5174",
       "build": "tsc -b && vite build",
       "preview": "vite preview",
       "lint": "eslint .",
       "test": "vitest run"
     },
     "dependencies": {
       "@sysgov/ui": "*",
       "@sysgov/sdk": "*",
       "react": "^18.3.1",
       "react-dom": "^18.3.1",
       "react-router-dom": "^6.26.0",
       "lucide-react": "^0.400.0",
       "axios": "^1.7.0"
     },
     "devDependencies": {
       "@vitejs/plugin-react": "^4.3.0",
       "typescript": "^5.5.0",
       "vite": "^5.4.0",
       "tailwindcss": "^3.4.0",
       "@types/react": "^18.3.0",
       "@types/react-dom": "^18.3.0"
     }
   }
   ```
   *Regra:* dependências que existem em `packages/ui` e `packages/sdk` NÃO devem ser duplicadas desnecessariamente — consumir via workspace.

3. **`tsconfig.json` (`apps/web-client/tsconfig.json`):**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "useDefineForClassFields": true,
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "skipLibCheck": true,
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@sysgov/ui": ["../../packages/ui/src"],
         "@sysgov/sdk": ["../../packages/sdk/src"]
       }
     },
     "include": ["src"]
   }
   ```

4. **`vite.config.ts` (`apps/web-client/vite.config.ts`) — conexão local ao backend:**
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 5174,
       proxy: {
         '/api': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
         '/sanctum': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
       },
     },
     resolve: {
       alias: {
         '@': '/src',
       },
     },
   });
   ```

5. **`.env` (`apps/web-client/.env`):**
   ```env
   VITE_API_URL=/api
   VITE_APP_NAME=SYSGOV
   ```

6. **Instalar dependências a partir do root do monorepo:**
   ```bash
   pnpm install # (ou npm install no root — instala todos os workspaces)
   ```

### Critérios de Aceitação da Fase B
- [ ] Pasta movida para `apps/web-client` sem `node_modules`/lockfiles próprios
- [ ] `package.json` com nome `@sysgov/web-client` e scripts corretos
- [ ] `tsconfig.json` com paths para `@sysgov/ui` e `@sysgov/sdk`
- [ ] `vite.config.ts` na porta 5174 com proxy `/api` → `localhost:8000`
- [ ] `.env` com `VITE_API_URL=/api`
- [ ] `pnpm install` / `npm install` concluído sem erros

---

# FASE C — CONEXÃO COM OS PACKAGES DO MONOREPO

### Objetivo
Fazer o `web-client` consumir `packages/ui` (Design System) e `packages/sdk` (tipos) — e adaptar o código migrado para usar os componentes/tokens do design system em vez de duplicações.

### Entregáveis Técnicos
1. **`packages/ui` — wiring do design system:**
   - Garantir que os tokens do `web-client` (Fase 0.5) estejam no Tailwind config + CSS variables.
   - Substituir componentes duplicados do código migrado por componentes de `@sysgov/ui` (`Button`, `Card`, `Badge`, `Input`, `StatusChip`, `Table` etc.), quando equivalentes existirem.
   - Manter DS Gov.br + paleta SYSGOV (emerald `#10B981`) — NUNCA hard-coded; suportar white-label (CSS variable `--color-primary` sobrescrita pelo tenant).
2. **`packages/sdk` — tipos do contrato de API:**
   - Garantir que `LoginResponse`, `TenantInfo`, `TenantSettings`, `MenuGroup`, `MenuItem` (e demais tipos do contrato) existam no SDK ou criar `src/types/navigation.ts` local como ponte até o SDK ser regenerado.
   - Substituir mocks (ex.: `mockLoginResponse.ts`) pelo consumo real da API — ou manter o mock APENAS como fallback de desenvolvimento com flag de ambiente (`VITE_USE_MOCK=true`), documentado.
3. **Importações:**
   - Migrar imports: `@sysgov/ui` para componentes, `@sysgov/sdk` para tipos, `@/` para código local.
   - Rodar `tsc --noEmit` e corrigir tipos até zero erros.

### Critérios de Aceitação da Fase C
- [ ] Tokens DS Gov.br + paleta SYSGOV centralizados e aplicados
- [ ] Componentes migrados usando `@sysgov/ui` (sem duplicação significativa)
- [ ] Tipos do contrato vindo do SDK/ponte local
- [ ] `tsc --noEmit` sem erros

---

# FASE D — BASE DO APP SHELL (core, layout, router, páginas)

### Objetivo
Garantir o App Shell do `web-client` funcional dentro do monorepo: autenticação, tenant, RBAC, sidebar dinâmica, roteamento com lazy loading e páginas base.

### Entregáveis Técnicos (estrutura alvo)

```text
apps/web-client/src/
├── core/
│   ├── api/client.ts              # Cliente HTTP (axios) — baseURL '/api', interceptors (Bearer token, 401/403/422)
│   ├── auth/AuthProvider.tsx      # Contexto: token, user, tenants, tenant ativo, modules, permissions, navigation
│   ├── auth/useAuth.ts            # Hook de autenticação (login, loginSso, selectTenant, logout)
│   ├── tenant/TenantProvider.tsx  # Contexto do tenant ativo + white-label (CSS var --primary, logo, title)
│   ├── tenant/useTenant.ts        # Hook do tenant + getSetting(key)
│   ├── rbac/useCan.ts             # Hook de permissão: can('licitacao.view')
│   ├── layout/AppShell.tsx        # Sidebar + TopBar + conteúdo
│   ├── layout/Sidebar.tsx         # Sidebar dinâmica (navigation do backend; grupos MAIÚSCULAS, atalhos, badges)
│   ├── layout/TopBar.tsx          # Breadcrumb, filtros de contexto (ano/cidade), ações à direita
│   └── router/AppRouter.tsx       # Rotas dinâmicas + guard de rota (auth + permissão) + lazy loading
├── config/
│   ├── moduleRegistry.ts          # Registro de módulos de UI (alias → path, lazy component, permission)
│   └── iconMap.ts                 # string → componente lucide (getIcon(name))
├── pages/
│   ├── LoginPage.tsx              # Login local + SSO (OpenID Connect), white-label
│   ├── TenantSelectorPage.tsx     # Seleção de tenant (se múltiplos)
│   └── NotFoundPage.tsx
└── types/
    └── navigation.ts              # Tipos do contrato (LoginResponse, TenantInfo, MenuGroup...)
```

### Regras obrigatórias
- **Cliente HTTP:** `baseURL` relativa `/api`; interceptor injeta Bearer token; trata `401` (logout + redirect `/login`), `403` (acesso negado), `422` (propaga erros de validação).
- **Estratégia de token (decisão explícita, documentada em comentário no AuthProvider):** preferir httpOnly cookie + CSRF (mais seguro contra XSS); se MVP usar `localStorage`, EXIGIR CSP estrita e nunca armazenar dados sensíveis além do token.
- **AuthProvider:** `login(email, password)` → `POST /api/auth/login`; `loginSso()` → redirect OpenID Connect; `selectTenant(tenantId)` → `POST /api/auth/select-tenant` (atualiza tenant ativo + modules/permissions/navigation); `logout()` → `POST /api/auth/logout`; persistir sessão entre reloads.
- **Sidebar dinâmica:** renderiza APENAS o `navigation` retornado pelo backend (controle de menu por cliente). NUNCA decidir menus no frontend. Aplicar white-label do tenant ativo.
- **Roteamento:** guard de rota verifica autenticação + permissão (UX); módulos via `React.lazy`; rota `/login` pública, `/selecionar-tenant` se múltiplos, demais protegidas.
- **moduleRegistry:** aliases DEVEM bater com os modules do login (aliases do `module.json` do backend). Apenas módulos ativos são registrados.
- **iconMap:** NUNCA renderizar string icon como componente — sempre via `getIcon(name)`.
- **useCan:** apenas UX — autorização real SEMPRE no backend.

### Critérios de Aceitação da Fase D
- [ ] Login (local + SSO) e seleção de tenant funcionais contra o backend real
- [ ] Sidebar dinâmica montada a partir do `navigation` do backend + white-label aplicado
- [ ] Guard de rota (auth + permissão) e lazy loading operando
- [ ] `moduleRegistry` + `iconMap` prontos para receber módulos novos

---

# FASE E — VALIDAÇÃO LOCAL, TESTES E DOCUMENTAÇÃO

### Objetivo
Garantir que o `web-client` roda localmente integrado ao backend e ao restante do monorepo, com qualidade e documentação.

### Entregáveis Técnicos
1. **Rodar integrado:**
   ```bash
   # Terminal 1 — backend
   cd apps/api && php artisan serve --port=8000

   # Terminal 2 — root do monorepo
   npm run dev:all # ou: pnpm -r --parallel dev (backend + web-admin + web-client)
   ```
   Validar: `web-admin` na porta dele, `web-client` em [http://localhost:5174](http://localhost:5174/), proxy `/api` respondendo do backend (sem erro CORS no console).

2. **Fluxo ponta a ponta (validar manualmente):**
   Acessar `/login` → autenticar (usuário real de teste) → selecionar tenant (se múltiplos) → sidebar dinâmica renderizada → white-label do tenant aplicado → navegar pelos módulos ativos → logout limpa a sessão.

3. **Testes mínimos:**
   - Vitest + Testing Library: pelo menos `AuthProvider` (login/logout/selectTenant), `useCan` (permissões), `AppRouter` (guard de rota).
   - Garantir `npm run lint` e `npm run build` passando no `web-client`.

4. **Documentação:**
   Atualizar `docs/` com: como rodar o `web-client` localmente (porta 5174, proxy, backend 8000), estrutura de pastas, como registrar novo módulo (`moduleRegistry` + `iconMap` + permissão), decisão da estratégia de token (ADR se aplicável).

5. **Integração com CI/CD:**
   Adicionar o `web-client` ao pipeline existente do monorepo: lint, test, build no CI.

### Critérios de Aceitação da Fase E
- [ ] `npm run dev:all` sobe backend + web-admin + web-client sem conflito de portas
- [ ] Login → tenant → sidebar → white-label → módulos validados ponta a ponta
- [ ] Testes de core (auth, useCan, router) passando
- [ ] `lint` + `build` do `web-client` passando no CI
- [ ] Documentação de execução local e registro de módulo atualizada

---

# FASE F (opcional, recomendada) — REGENERAR O SDK E CONECTAR O CONTRATO DE API

### Objetivo
Garantir que o `web-client` consuma tipos gerados do contrato real do backend (`LoginResponse`, `TenantInfo`, `MenuGroup` etc.) — sem divergência manual.

### Entregáveis
1. **Backend expõe o OpenAPI (se ainda não expõe):**
   - Instalar `darkaonline/l5-swagger` (ou `swagger-php` + rota `GET /api/docs.json`) no `apps/api`.
   - Garantir que as rotas do módulo Identity/Auth (`/api/auth/login`, `/api/auth/me`, `/api/auth/select-tenant`) estejam anotadas com `@OA` e retornem os Resources.
2. **Gerar o SDK:**
   ```bash
   # Na pasta packages/sdk — usando o JSON do OpenAPI do backend
   npx openapi-typescript http://localhost:8000/api/docs.json -o src/generated/api.d.ts

   # (ou, se preferir cliente HTTP tipado)
   npx openapi-generator-cli generate \
     -i http://localhost:8000/api/docs.json \
     -g typescript-axios \
     -o src/generated \
     --skip-validate-spec
   ```
3. **Expor os tipos no barrel `packages/sdk/src/index.ts`:**
   ```typescript
   export * from './generated/api';
   // Tipos de contrato usados pelo App Shell
   export type { LoginResponse, TenantInfo, TenantSettings, MenuGroup, MenuItem } from './generated/api';
   ```
4. **Web-client consome do SDK:**
   ```typescript
   // apps/web-client/src/types/navigation.ts — REMOVER (ponte provisória)
   // apps/web-client/src/core/auth/AuthProvider.tsx — importar do SDK
   import type { LoginResponse, TenantInfo, MenuGroup } from '@sysgov/sdk';
   ```
5. **CI:** adicionar job que regenera o SDK e falha se houver diff (`git diff --exit-code packages/sdk/src/generated/`).

### Critérios de Aceitação da Fase F
- [ ] `openapi-typescript` gera sem erros a partir do backend local
- [ ] `web-client` compila usando tipos do SDK (nenhum `any`/ponte local)
- [ ] CI valida que o SDK está sincronizado com o OpenAPI

---

# ANEXO 1 — ROOT DO MONOREPO (workspaces)

Antes de rodar as fases, confirme que o `package.json` raiz do monorepo está com os workspaces apontando para `apps/*` e `packages/*`:

```json
{
  "name": "sysgov",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:all": "concurrently -n api,admin,client -c blue,magenta,green \"npm run dev --workspace=@sysgov/api\" \"npm run dev --workspace=@sysgov/web-admin\" \"npm run dev --workspace=@sysgov/web-client\"",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

> Se usar `pnpm`, troque por `"packageManager": "pnpm@9.x"` no root + `pnpm-workspace.yaml` com `packages: [apps/*, packages/*]`. O script `dev:all` usa `pnpm -r --parallel dev` (o backend Laravel sobe separado com `php artisan serve --port=8000`).

---

# ANEXO 2 — TROUBLESHOOTING (problemas comuns da migração)

| Sintoma | Causa provável | Solução |
| :--- | :--- | :--- |
| `Module not found: @sysgov/ui` | Workspaces não instalados / path errado | Rodar `npm install` no root; conferir `"workspaces": ["apps/*","packages/*"]`; conferir `tsconfig` paths |
| Erro de porta 5173 em uso | Conflito com `web-admin` | Trocar `--port 5174` no script `dev` do `web-client` (ou `5175`) |
| CORS no console ao chamar `/api` | Proxy não configurado ou chamada com URL absoluta | Usar `axios.create({ baseURL: '/api' })` + proxy no `vite.config.ts`; nunca `http://localhost:8000` hard-coded no cliente |
| Login retorna 419 (CSRF) | Falta configurar `/sanctum/csrf-cookie` | No interceptor do client: `GET /sanctum/csrf-cookie` antes do login; enviar `X-XSRF-TOKEN` de cookie |
| Tipos divergentes (`LoginResponse` sem campo X) | SDK desatualizado vs backend | Rodar Fase F (regenerar SDK); enquanto isso, usar `as unknown as LoginResponse` só como último recurso documentado |
| Build lento / duplicação de React | React duplicado entre workspaces (hoisting) | Garantir `react`/`react-dom` no root como devDependencies com `^18.3.1` e remover das deps do `web-client`; usar pnpm (hoisting estrito) |
| 401 em todas as chamadas após login | Token não persistido/reenviado | Implementar interceptor de request que injeta `Authorization: Bearer` (ou cookie) + `withCredentials: true` |
| Hot reload não reflete mudanças em `packages/ui` | Vite não observa o package | Configurar `server.watch.ignored` ou usar `optimizeDeps.exclude` + `resolve.dedupe`; no pnpm, usar `preserveSymlinks` conforme docs |

---

# ANEXO 3 — SEQUÊNCIA DE EXECUÇÃO RECOMENDADA

```bash
# 1. (Fase A) Backup e branch
git checkout -b feat/web-client-integration

# 2. (Fase B) Mover e configurar
mv /caminho/para/web-client ./apps/web-client
# editar package.json, tsconfig.json, vite.config.ts, .env

# 3. (Fase B) Instalar do root
npm install

# 4. (Fase C) Conectar packages
# substituir duplicatas por @sysgov/ui e @sysgov/sdk; rodar:
npx tsc --noEmit # até zero erros

# 5. (Fase D) App Shell base
# criar core/, layout/, router/, config/, pages/ conforme estrutura

# 6. (Fase F opcional) Regenerar SDK
cd packages/sdk && npx openapi-typescript http://localhost:8000/api/docs.json -o src/generated/api.d.ts

# 7. (Fase E) Validar integrado
# Terminal 1: cd apps/api && php artisan serve --port=8000
# Terminal 2: npm run dev:all
# Acessar http://localhost:5174 → login → tenant → sidebar dinâmica
```

---

# REGRAS GERAIS (TODAS AS FASES)
1. **Nunca** mover/sobrescrever o `web-admin` ou `packages` existentes.
2. Validação de entrada, proteção de dados, gestão segura de segredos (nunca commit de `.env` com segredos), rate limiting, CORS por allowlist.
3. Código SOLID, baixo acoplamento, DRY sem abstrações excessivas, configuração por ambiente.
4. Responsivo e acessível (contraste, foco visível, aria-labels).
5. Gere código completo, pronto para uso, com imports, types, validações e comentários objetivos sobre decisões não óbvias.
6. Ao introduzir arquivos ou pastas, explique brevemente sua finalidade.
7. Prepare tudo para testes (Vitest/Testing Library) e CI.

---

# CHECKLIST FINAL (DoD da integração)
- [ ] `web-client` movido para `apps/web-client` e sem lockfiles/`node_modules` próprios
- [ ] Porta 5174 + proxy `/api` e `/sanctum` → `localhost:8000` funcionando (sem CORS em dev)
- [ ] Cliente HTTP com `baseURL` relativa `/api` + interceptors de token/erro
- [ ] Consome `@sysgov/ui` (design system DS Gov.br + paleta SYSGOV) e `@sysgov/sdk` (tipos)
- [ ] App Shell base completo: `AuthProvider`, `TenantProvider`, `useCan`, `AppShell`, Sidebar dinâmica, `TopBar`, `AppRouter` (lazy + guard)
- [ ] `moduleRegistry` + `iconMap` prontos para novos módulos
- [ ] Login (local + SSO), seleção de tenant e logout funcionais
- [ ] White-label por tenant aplicado dinamicamente (nunca hard-coded)
- [ ] `npm run dev:all` sobe tudo integrado
- [ ] Testes de core passando + `lint` + `build` no CI
- [ ] Documentação de execução local e registro de módulo atualizada
