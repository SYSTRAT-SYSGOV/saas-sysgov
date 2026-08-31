# ADR-0002 — Multi-tenancy com Isolamento Lógico (Pool Mode)

- **Status:** Aceito (implementado)
- **Data:** 22/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

A plataforma atende múltiplos municípios em regime SaaS, exigindo separação absoluta
de registros, proteção contra vazamento acidental de dados (LGPD) e otimização de
custos de infraestrutura em nuvem.

## Decisão

Implementar **Pool Multi-tenant com Isolamento Lógico** no mesmo banco relacional.
Cada tabela de domínio possui obrigatoriamente `tenant_id` com chave estrangeira
indexada para `tenants`. A resolução do contexto é assegurada por três pilares:

1. **`ResolveTenant` (Middleware)** — identifica o tenant via cabeçalho autenticado
   ou subdomínio, registrando-o como singleton. O tenant **nunca** é lido do payload
   do usuário.
2. **`TenantContext` (Singleton)** — provedor central do tenant ativo na requisição.
3. **`TenantAware` (Global Query Scope / Trait)** — injeta `WHERE tenant_id = ?`
   automaticamente em SELECT/INSERT/UPDATE/DELETE dos Models Eloquent.

### Conformidade RN-CORE-001

Para eliminar o vazamento de papéis administrativos entre municípios, as roles Spatie
com escopo de tenant são associadas com vínculo estrito no pivot `role_user.tenant_id`.

## Consequências

- ✅ Escalabilidade simplificada e custo operacional mínimo.
- ✅ Preparado para evolução *bridge* (mover cliente de alta demanda para DB dedicado).
- ⚠️ Risco mitigado de vazamento mediante suítes obrigatórias de testes de isolamento
  de tenant como gate de deploy.

## Alternativas consideradas

- **Banco dedicado por tenant** — rejeitado pelo custo inviável de manutenção de
  centenas de instâncias RDS e complexidade de migrações em lote.
- **Multi-schema por tenant** — rejeitado pela sobrecarga no pool de conexões do MySQL.