# ADR-002: Módulo aditivo no monólito SYSGOV em vez de microsserviço ou sistema legado

- **Status**: Aceita
- **Data**: 2026-09-22
- **Mudança relacionada**: `openspec/changes/cemiterio-fundacao`

## Contexto

Existe um repositório legado `SYSTRAT-SYSGOV/SYS_CEMITERIO` (PHP puro, 2 commits, sem lógica de negócio). O
SYSGOV é um monólito modular (`nwidart/laravel-modules`) que já oferece multi-tenant, RBAC, auditoria com hash
encadeado, Outbox, filas e design system.

## Decisão

Implementar a gestão de cemitérios como o módulo `Cemiterio` em `apps/api/Modules/Cemiterio`, criado por
`php artisan make:module`, com rotas, controllers, policies, migrations e telas próprias, **sem alterar módulos
existentes**. O frontend fica no `apps/web-client`.

## Alternativas consideradas

- **Reconstruir o legado em PHP puro**: reimplementaria autenticação, multi-tenant, auditoria e UI; o legado
  não tem código de negócio aproveitável.
- **Microsserviço separado**: custo de infraestrutura, autenticação entre serviços e consistência distribuída
  sem necessidade comprovada; a política do repositório adia extrações até haver evidência.

## Consequências

- (+) Reuso imediato de `TenantAware`, `ResolveTenant`, `AuditLogger`, `OutboxPublisher`, `Money` e
  `@sysgov/ui`.
- (+) Transações locais entre jazigo, concessão e operações.
- (−) Deploy acoplado à plataforma; mitigado pela habilitação do módulo por tenant.
