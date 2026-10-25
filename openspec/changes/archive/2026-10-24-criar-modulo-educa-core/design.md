# Design

## Contexto

Fontes: `docs/legacy/i-educar/_reversa_sdd` (`sysgov-target-architecture.md`, `AcademicYear/`, `Calendario/`, `state-machines.md`, `adrs/`). Artefatos de contrato em `apps/api/Modules/Educa/openspec/`.

## Decisões

### D-01 — Módulo único `Educa` com submódulos lógicos
Um único módulo nwidart (`Modules/Educa`), com subpastas por submódulo (`Core/`, `Secretaria/`, …) e Service Providers condicionais por licença. Evita 7 módulos acoplados por `requires` e mantém um só manifesto.

### D-02 — Licenciamento por submódulo (**aprovado: opção A**)
O repositório **já possui** mecanismo de licença por módulo: o middleware `module-access:{alias}` (`App\Http\Middleware\EnsureModuleAccess`) consulta `Gate 'module'` → `AccessService` (gate `tenant_module.enabled` + `user_module_access`), com módulos catalogados em `Modules\Admin\Models\Module` (`alias`). Erro padrão: `403 {error, code: MODULE_ACCESS_DENIED, module}`.

Opções:
- **A (recomendada):** cada submódulo vira um `Module` do catálogo (aliases `educa`, `educa-secretaria`, `educa-pedagogico`, …) e as rotas usam `module-access:educa-<sub>`. Reaproveita 100% do que existe; `plano_minimo` vira configuração de catálogo.
- **B:** um único alias `educa` e flags internas por submódulo, exigindo tabela nova.

O contrato adota `MODULE_ACCESS_DENIED` (padrão existente) no lugar do `SUBMODULE_NOT_LICENSED` previsto inicialmente. Nomes de plano (`basico`, `intermediario`, `completo`, `addon`) foram aprovados como propostos.

### D-03 — Estados do ano letivo
Adotar `planning/active/frozen/evaluation_phase/closed` (state-machines.md). O legado só tinha `andamento` 0/1/2; a migração mapeia 0→`planning`, 1→`active`, 2→`closed`.

### D-04 — Normalização do ano
Remover colunas array do PostgreSQL (`anos_letivos smallint[]`, não portáveis para MySQL 8.4). Substituir por tabela pivô `(tenant_id, entidade, entidade_id, ano)`.

### D-05 — Dia do calendário por data ISO
`educa_calendar_days(tenant_id, calendar_id, date)` único, com `is_school_day` denormalizado. Substitui o triplo mês/dia/ano do legado.

### D-06 — Horas
LDB exige 800 h além de 200 dias. Cômputo: `carga_horaria_diaria_minutos` do calendário, sobrescrevível por dia. Publicação exige `dias ≥ 200` **e** `horas ≥ 800`. O legado não computava nenhum dos dois.

### D-07 — Identificadores e `tenant_id` (**aprovado: opção A**)
`tenants.id` é **bigint** no repositório (`foreignId('tenant_id')->constrained('tenants')` nas migrations do Pedagogico; `ModuleAccessService` tipa `int $tenantId`). O pedido original e o `target-architecture §4.1` falam em `tenant_id CHAR(36) UUID`, o que quebraria a FK, o `TenantContext` e o `TenantAware`.

Opções:
- **A (recomendada):** `tenant_id` = `foreignId` bigint, como todos os módulos existentes; chaves primárias das tabelas `educa_*` em UUID.
- **B:** migrar `tenants.id` para UUID — fora do escopo, afeta toda a plataforma.

O OpenAPI já declara `tenant_id` como `integer`.

### D-08 — Permissões
Formato `educa.{submodulo}.{recurso}.{acao}`, seguindo o pedido (`educa.core.*`). O documento de arquitetura-alvo usava `educa.anos_letivos.*`; será corrigido.

### D-09 — Janela de lançamento
O legado nunca aplicou `bloqueio_ano_letivo`. No alvo, o `core` expõe o status do ano e o calendário; a aplicação no lançamento é do submódulo `pedagogico` (cenários marcados `@integracao`).

### D-10 — Pilares
Aluno e docente referenciam `Modules\Pessoas\Models\Pessoa` (`pessoa_id`); escola é `OrgUnit` (`org_unit_id`). O prompt citava `App\Models\Person` e "Organograma"; vale o AGENTS.md §1.1.

## Riscos

- **R-01 — Sobreposição com `Modules/Escola` e `Modules/Pedagogico`.** Decisão do usuário: Educa independente; mapear sobreposição e migração em change futura. Não alterar esses módulos agora.
- **R-02 — Branch `main` acompanha `homolog/main` (em dia, 44 commits à frente) e diverge de `origin/main` (11 à frente, 6 atrás).** Decisão do usuário: trabalhar sobre a base de homologação; não integrar `origin/main` agora.
- **R-03 — Contrato incompleto do `core`.** Escolas, Turmas e Matriz BNCC ficam para a próxima change; eventos do calendário e calendário por turma dependem delas.
- **R-04 — Comando `make:module`.** O módulo foi iniciado só com `openspec/`; o scaffold executável virá com a aprovação.

## Padrões de API assumidos

Paginação Laravel (`data`, `links`, `meta`); erros `{message, code?, errors?}`; `404` para registro de outro tenant. Validar contra o estilo de `Modules/Pedagogico` e `Modules/Protocolo` antes da implementação.
