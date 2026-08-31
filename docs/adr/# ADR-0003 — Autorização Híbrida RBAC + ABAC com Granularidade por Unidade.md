# ADR-0003 — Autorização Híbrida RBAC + ABAC com Granularidade por Unidade

- **Status:** Aceito (implementado)
- **Data:** 31/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

A gestão pública municipal impõe estruturas departamentais complexas. Um modelo
puramente baseado em papéis (RBAC) não atende à necessidade de liberar um módulo
para a Secretaria de Saúde mantendo-o bloqueado para a Secretaria de Obras, tampouco
restringe a visualização de contratos apenas ao departamento de lotação do fiscal.

## Decisão

Unificar o controle de acesso por meio de uma arquitetura híbrida **RBAC + ABAC**,
avaliada por um serviço central `AccessService`. A hierarquia usa *Materialized Path*
na tabela `org_units` (coluna `path` indexada, ex.: `1.2.1`), permitindo resolução
recursiva de escopo.

### Esteira de autorização (determinística)

1. Resolução do tenant via `ResolveTenant`.
2. Bypass para `admin_tenant`, `platform_admin` e `support_analyst`.
3. Validação do licenciamento do módulo (`tenant_module.enabled`).
4. Liberação granular por unidade (`tenant_module_org_unit`) com herança por `path`
   e respeito a negações explícitas.
5. Validação de vigência e status (`user_module_access`).
6. Aplicação do escopo de dados via `OrgScope` (`scope_all`, `scope_recursive`,
   unidade direta).

## Consequências

- ✅ Eliminação de acessos indevidos a dados sensíveis.
- ✅ Conformidade com segregação de funções exigida pelos Tribunais de Contas.
- ✅ Flexibilidade total de configuração para o administrador municipal.
- ⚠️ Complexidade de avaliação centralizada em `AccessService` único (evita divergência).

## Alternativas consideradas

- **RBAC puro** — rejeitado por exigir proliferação geométrica de perfis por secretaria.
- **ABAC puro** — rejeitado pela sobrecarga computacional de avaliação de políticas
  dinâmicas em cada leitura.