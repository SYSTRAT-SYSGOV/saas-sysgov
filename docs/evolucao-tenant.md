# Plano de Evolução do Tenant — Fase H (Documento de Planejamento)

**Data:** 2026-08-29  
**Status:** Planejamento — NENHUMA mudança estrutural executada

## 1. Próximos Passos Planejados
A evolução do módulo de tenant (multi-tenancy) seguirá passos incrementais, SEMPRE aditivos e com testes de regressão como gate.

### 1.1 Módulo Platform/Núcleo (separação do Admin)
- **Objetivo:** Extrair o núcleo multi-tenant do módulo Admin para um módulo `Platform` dedicado.
- **Por que:** Hoje Admin acumula responsabilidades de tenant, RBAC, MFA, auditoria e SaaS. Separar reduz acoplamento.
- **Como:** PR aditivo — criar módulo Platform, mover models/serviços/middleware, manter aliases/forwarders no Admin para não quebrar código existente. NUNCA remover controllers do Admin.
- **Risco:** Baixo (apenas mover arquivos + criar aliases). Testes de regressão garantem contratos.

### 1.2 White-Label Avançado
- **Objetivo:** Permitir que cada tenant personalize logos, cores, domínio, e-mail e SMS.
- **Já existe:** `settings` (JSON) no Tenant, `applyWhiteLabelTheme()` no frontend.
- **Próximo passo:** Adicionar upload de logo via Storage, validação de domínio, e templates de e-mail/SMS por tenant.
- **Migrations:** Aditivas (novas colunas em `tenants` ou tabela separada `tenant_branding`).

### 1.3 Feature Flags por Tenant
- **Objetivo:** Controlar quais funcionalidades cada tenant tem acesso (além dos módulos).
- **Tabela proposta:** `tenant_features` (tenant_id, feature_slug, enabled).
- **Relação com módulos:** Módulos são o catálogo; feature flags são sub-funcionalidades dentro de cada módulo.
- **Migrations:** Aditivas (nova tabela, sem alterar `tenant_module`).

### 1.4 Dashboard + Radar de Gestão
- **Objetivo:** Métricas consolidadas por tenant (licitações, contratos, finanças, RH, org chart).
- **Já existe:** `GET /api/access/dashboard` (web-client), `GET /api/admin/monitoring` (admin).
- **Próximo passo:** Expandir monitoring com indicadores de saúde por tenant (erros, filas, uso de storage).

## 2. Contrato de Módulo (DoD para novos módulos)
Cada novo módulo DEVE seguir:
1. `tenant_id` em todas as tabelas de negócio + índice composto `(tenant_id, ...)`.
2. Model usa trait `TenantAware` (global scope + auto-set tenant_id).
3. Policies autorizam com `$user->hasPermission(...)`.
4. Controller usa `$this->authorize()` + `TenantContext`.
5. Teste de isolamento (Tenant A não vê dados do Tenant B).
6. Chamadas externas via Outbox (nunca síncronas em controllers).
7. Auditoria via `AuditLogger` em toda mutação.
8. PHPStan sem novos erros; suíte de regressão verde.

## 3. NÃO Executado nesta Rodada
- Nenhuma mudança estrutural (migrations, models, controllers) foi executada.
- Nenhum dado foi alterado ou removido.
- Este documento é apenas planejamento, aguardando aprovação para execução.