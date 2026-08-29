# Auditoria — Fase F: Guard `web` e Alinhamento de Documentação

**Data:** 2026-08-29  
**Fase:** F

## 1. Guard `web` com driver `token` (config/auth.php)
- **Estado atual:** `defaults.guard = sanctum`; guard `web` configurado com `driver => token`, mas:
  - `routes/web.php` vazio (sem rotas web/Blade).
  - `resources/views` sem nenhum `*.blade.php` (API pura).
  - Todo o frontend é SPA (React) autenticando via Sanctum (`/api/auth/login`).
- **Conclusão:** o guard `web` **não é utilizado**. Mantê-lo como está não afeta nenhuma rota.
- **Decisão:** nesta fase **não removemos** o guard (regra: não quebrar nada). Registramos a recomendação de removê-lo em PR dedicado:
  ```php
  // Futuro: remover guard 'web' ou trocar para session quando houver rotas web reais.
  'web' => ['driver' => 'token', 'provider' => 'users'],
  ```

## 2. Versões Reais (confirmadas)
| Item | Real |
|---|---|
| Laravel | 12.67.0 |
| PHP | 8.3.28 |
| React (apps/web e apps/web-client) | 19 |
| TypeScript | 5.x |
| Tailwind CSS | v4 |
| nwidart/laravel-modules | ^11 |
| spatie/laravel-permission | ^6 |

## 3. Estrutura real do monorepo
- **Backend:** `apps/api` — monólito modular Laravel 12 + nwidart/laravel-modules.
  - Módulos: Admin, Contracts, Finance, OrgChart, Procurement, TestModule.
- **Frontend:**
  - `apps/web` — Painel Admin (porta 5175 em dev atual).
  - `apps/web-client` — Painel Cliente (porta 5174).
- **Packages:** `packages/ui` (design system), `packages/sdk` (tipos/contratos).

## 4. Ações executadas nesta fase
- Nenhuma mudança de código (somente documentação).
- Decisões registradas para PRs futuros separados.