# Proposal

## Why

O SYSGOV não possui módulo de gestão escolar municipal completo. Já existem `Modules/Escola` (cadastro escolar) e `Modules/Pedagogico` (notas, conselho, frequência), mas sem calendário letivo, sem ciclo de vida do ano letivo e sem verificação dos mínimos da LDB (Lei 9.394/1996, art. 24, I: **200 dias** e **800 horas**). O legado i-Educar (engenharia reversa em `docs/legacy/i-educar/_reversa_sdd`) confirma que essa verificação **nunca existiu em código executável** (Calendario, RC-09) e que o bloqueio por janela de datas não tinha consumidor (AcademicYear, AY-11).

O módulo **SYS-Educa** reconstrói as regras de valor do i-Educar sobre os 5 pilares do SYSGOV, dividido em submódulos ativáveis por plano do município. Esta change inicializa o módulo pela especificação (Spec-First) e entrega o contrato do submódulo `core`: **Anos Letivos e Calendário**.

## What Changes

- **Novo módulo `Educa`** em `apps/api/Modules/Educa/`, com manifesto `openspec/openspec.yaml` declarando 7 submódulos (`core`, `secretaria`, `pedagogico`, `servidores`, `educacenso`, `transporte`, `comunicacao`), planos mínimos e dependências.
- **Contrato OpenAPI 3.1** `core.openapi.yaml`: anos letivos, etapas, transições de estado, lote, conformidade LDB, calendários, dias e motivos de dia.
- **Cenários BDD** `core-academic-year.feature`: LDB, ciclo de vida, lote, tenant, RBAC, licença e auditoria.
- **Ciclo de vida do ano letivo**: `planning → active → frozen ⇄ active → evaluation_phase → closed` (state-machines.md §3); `closed` torna o ano imutável.
- **Calendário** com data ISO por dia e flag `is_school_day`, calendário padrão da rede (`school_id` nulo) e importação atômica para escolas.
- **RBAC** `educa.core.{recurso}.{acao}`.
- **Licenciamento por submódulo** via catálogo de módulos existente (`module-access:{alias}`) — ver design D-02.

Fora desta change: migrations, models, controllers, telas, e contratos de Escolas, Turmas e Matriz Curricular (próxima change do `core`).

## Capabilities

### New Capabilities

- `educa/core-anos-letivos`: ciclo de vida, etapas, cópia do ano anterior, lote e conformidade LDB.
- `educa/core-calendario`: calendário por escola e da rede, dias letivos, motivos, publicação com mínimos da LDB.
- `educa/submodulos-entitlements`: ativação e dependência de submódulos por licença do tenant.

### Modified Capabilities

<!-- Nenhuma. Sobreposição com Escola/Pedagogico é registrada como risco, sem alterar suas specs. -->

## Impact

- **Backend**: novo módulo; integra Access, Pessoas, OrgChart, Client e Protocolo (sem alterá-los).
- **Frontend**: `apps/web-client/src/modules/educa` em change futura; paleta GOV.BR azul; só `@sysgov/ui`; datas e códigos técnicos em JetBrains Mono.
- **Dados**: tabelas `educa_*` com `tenant_id` bigint (`foreignId`) e PK UUID, `SoftDeletes`, auditoria obrigatória.
- **Risco**: sobreposição conceitual com `Escola` e `Pedagogico` (design R-01).
