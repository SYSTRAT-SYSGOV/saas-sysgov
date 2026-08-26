# ADR 0004 — Estratégia de Tokens de Sessão (Bearer vs httpOnly Cookie)

- **Status:** Aceita
- **Data:** 2026-08-24
- **Decisores:** Arquitetura SYSGOV

## Contexto

O backend Laravel expõe APIs JSON consumidas por dois App Shells React
(`apps/web` = web-admin, `apps/web-client` = web-client). É preciso decidir como
transportar a sessão: token Bearer no cabeçalho `Authorization` ou cookie httpOnly
com CSRF.

## Decisão

**Token Bearer Sanctum em memória no cliente (localStorage/sessionStorage), com
`httponly` não aplicado — e mitigação por design.**

- Login retorna `token` (Sanctum personal access token) via `POST /api/auth/login`.
- O cliente armazena o token e envia `Authorization: Bearer <token>`.
- O `X-Tenant-Slug` é resolvido no backend (`ResolveTenant`), nunca confiado de
  parâmetros que definam dados.

### Mitigações adotadas

1. **XSS é a ameaça principal** — o token em localStorage é legível por scripts.
   Mitigação: CSP restritivo no frontend (sem scripts inline), validação de entrada
   no backend, e política de sessão curta (revogação em logout e reset de senha).
2. **CSRF não se aplica** ao esquema Bearer (não usa cookies de sessão),
   removendo a superfície de CSRF.
3. **Sensibilidade:** endpoints críticos (`/deactivate`, `/reset-password`)
   exigem motivos/confirmações e são auditados (RN-USR-007).

## Consequências

- Simples para SPA multi-tenant e integrações (SDK `@sysgov/sdk`).
- Risco de roubo de token via XSS é mitigado por CSP + rotação no reset/logout.
- **Migração futura:** se houver requisito de sessão server-side, mover para
  cookie httpOnly + `sanctum/csrf-cookie` mantendo as mesmas rotas.

## Alternativas rejeitadas

- **Cookie httpOnly + CSRF:** mais seguro contra XSS, porém requer `SameSite`,
  `csrf-cookie` em todas as requests, e dificulta o consumo por integrações/SDK.
