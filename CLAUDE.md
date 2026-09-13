# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SYSGOV — SaaS multi-tenant de governança e gestão pública da SYSTRAT (fiscal/orçamentário, licitações,
organograma, integrações PNCP/Siconfi/TCE). Monorepo npm workspaces:

- `apps/api` — Laravel 13 (PHP 8.4) monólito modular via `nwidart/laravel-modules`, porta 8000.
- `apps/web` — Painel Admin SYSTRAT, React 19 + TS + Tailwind v4, porta 5173 (dark navy palette).
- `apps/web-client` — Painel do Cliente/Órgão Público, React 19 + TS + Tailwind v4, porta 5174 (paleta GOV.BR azul).
- `packages/ui` (`@sysgov/ui`) — design system compartilhado (shadcn/ui + Radix + CVA).
- `packages/sdk` (`@sysgov/sdk`) — SDK/tipos TypeScript de contrato com a API.

`AGENTS.md` is the primary, mandatory contract for AI agents in this repo — read it before making
architectural, multi-tenant, security, or design-system decisions. It in turn points to
`DESIGN_SYSTEM.md` and to two files at repo root (`# PADRÃO SYSGOV — ...md`, `# PADRÃO VISUAL SYSGOV — ...md`)
that are the canonical, non-negotiable architecture/design contracts — do not invent architecture,
colors, or components outside of them.

## Commands

Run from repo root unless noted.

```bash
npm install                 # install all workspaces
npm run dev                 # boots API (php artisan serve) + both frontends, waits for API health check
npm run dev:admin           # apps/web only (Vite, :5173)
npm run dev:client          # apps/web-client only (Vite, :5174)
npm run dev:all             # both frontends concurrently (no API)
npm run build               # build --workspaces --if-present
npm run typecheck           # tsc --noEmit across workspaces
npm run lint                # workspace lint (web/web-client: tsc --noEmit)
npm test                    # test --workspaces --if-present (frontend: vitest run)
npm run generate:registry   # regenerate apps/web-client/src/config/moduleRegistry.generated.ts from API's module catalog (falls back to reading apps/api/Modules + apps/web-client/src/modules from disk if the API isn't running)
```

Backend (`apps/api`), PHP 8.4 required (`scripts/set-php-84.bat` on Windows if PATH has an older PHP):

```bash
cd apps/api
composer test                                    # vendor/bin/phpunit (full suite: Modules + Tests)
vendor/bin/phpunit --filter TestName             # single test
vendor/bin/phpunit Modules/Licita/Tests/Feature/SomeTest.php   # single file
composer static                                  # phpstan analyse (larastan)
composer lint                                     # php -l over app/ + Modules/
php artisan make:module {NomeDoModulo}           # scaffold a new business module (tenant-aware + isolation test) — see skill below
```

phpunit.xml at repo root runs the Feature suite over `apps/api/Modules` and `apps/api/Tests` against an
in-memory sqlite DB — tests must not depend on external services.

Frontend workspaces (`apps/web`, `apps/web-client`) each expose: `dev`, `build`, `typecheck`, `test`
(vitest run), `test:watch`, `lint` (alias for typecheck).

## Architecture

### Backend: modular monolith, not microservices
Every business domain lives in `apps/api/Modules/{Name}` (current modules: Admin, Capd, Client,
Contracts, Finance, Licita, OrgChart, Procurement). A module is self-contained: `Config/`,
`Database/Migrations|Seeders/`, `Http/{Controllers,Middleware,Requests,Resources}/`, `Models/`,
`Policies/`, `Providers/`, `Routes/api.php` (registered via the module's own `RouteServiceProvider`,
never in a global `web.php`), `Services/`, `Events/`, `Listeners/`, `Tests/`, `module.json` (name, alias,
priority, providers, `requires` for cross-module dependencies, `permissions`, `menu` metadata for the
sidebar). Extraction into real services is explicitly deferred until proven necessary — don't design for it.

New modules must be created via `php artisan make:module` (custom command — scaffolds tenant isolation
tests too), not by hand-copying another module. Full step-by-step is in the
`sysgov-module-scaffolding` skill (`.claude/skills/` and mirrored in `.agents/skills/` — see below).

### Multi-tenant is a security requirement, not a feature
Pool model with strong logical isolation, enforced at every layer:
- Every business table has `tenant_id` with composite indexes/uniqueness starting with tenant.
- Every business Eloquent model uses `App\Models\Concerns\TenantAware` (global scope + auto-set on create).
- `TenantContext` is resolved server-side by the `ResolveTenant` middleware from session/login — **never**
  trusted from the client/frontend.
- Authorization is enforced server-side always (Gates for general actions, Policies per resource), scoped
  to the object, not just the route (prevents Broken Object Level Authorization) — the frontend hiding a
  button/menu is not a security control.
- Every module needs an isolation test proving tenant A and tenant B data never cross.

### Money, external calls, audit
- Monetary values always use `App\Support\Money` with integer cents — **never `float`**.
- No direct external calls (PNCP, banks, Siconfi, TCE) from controllers — always async via the Outbox
  pattern (`outbox_messages` table / Integration Hub).
- Every mutation is recorded via `AuditLogger` into `audit_logs` (tenant_id, user_id, module, action,
  resource, before/after, IP, user_agent, timestamp).

### Frontend: App Shell + lazy-loaded modules
Both `apps/web` and `apps/web-client` are React 19 + TS + Tailwind v4 app shells that lazy-load feature
modules under `src/modules/`. `apps/web-client`'s module registry
(`src/config/moduleRegistry.generated.ts`) is generated from the API's module catalog endpoint
(`npm run generate:registry`), with an offline fallback that reads `apps/api/Modules/*/module.json`
directly — regenerate it after adding/renaming a backend module.

### Design system: `@sysgov/ui` is mandatory, no exceptions
Every UI primitive (button, card, badge, input, select, switch, table, accordion, dialog/modal, etc.)
must come from `packages/ui` (`@sysgov/ui`) — check `packages/ui/src/index.ts` before writing one, import
from there, and never hand-roll a `<div>`-based reimplementation in an app. If a primitive is missing,
add it to `packages/ui/src/components/` following `packages/ui/README.md` (shadcn/ui CLI + Radix +
`class-variance-authority`, wrapped to preserve the expected call-site API), not inside the app. A
component may live locally only if it is genuinely single-screen and is composed from `@sysgov/ui`
primitives rather than reimplementing them. This is covered in detail by the `sysgov-ui-components` skill.

Two apps, two palettes: `apps/web` (admin) uses the Dark Navy palette; `apps/web-client` uses the GOV.BR
blue palette. Both map onto the same `@sysgov/ui` semantic variables — never hard-code a color inside a
shared component. JetBrains Mono (`font-mono tabular-nums`) is mandatory for all numeric/technical data
(currency, %, CPF/CNPJ, process/contract codes, dates, metrics); institutional text uses Inter/Roboto
(`font-sans`). White-label per tenant (`customPrimaryColor`, `customLogoUrl`, portal title/subtitle,
`hideProviderSignature`) must be read from tenant config, never hard-coded. Full spec:
`DESIGN_SYSTEM.md` and `# PADRÃO VISUAL SYSGOV — Design System Obrigatório.md`.

### Skills live in two places, on purpose
Repo skills exist both in `.claude/skills/` (what Claude Code actually scans/invokes) and in
`.agents/skills/` (generic convention read by other AI tools via `AGENTS.md`/`.agents/`). They must stay
byte-identical — there's no symlink, for Windows checkout compatibility. When editing a skill, update
both copies by hand. `.claude/skills/` is the source of truth if they ever diverge.

### Git workflow
Multiple developers work on this repo concurrently. Before starting work, fetch/check the remote
(`git fetch origin`, `git log main..origin/main`) and sync (`git pull --ff-only` or a safe rebase) before
making changes. Ensure tests pass (`npm test`) before committing/pushing, using Conventional Commits.
