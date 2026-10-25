# Tasks

## 1. Especificação (esta change)

- [x] 1.1 Criar `apps/api/Modules/Educa/openspec/openspec.yaml`
- [x] 1.2 Criar `contracts/core.openapi.yaml` (Anos Letivos e Calendário)
- [x] 1.3 Criar `scenarios/core-academic-year.feature`
- [x] 1.4 Validar o OpenAPI com linter (`@redocly/cli lint`: 0 erros, 0 warnings)
- [x] 1.5 Aprovação do usuário sobre D-02 (módulos no catálogo, planos) e D-07 (tenant_id bigint, PK UUID)
- [x] 1.6 Branch: manter base `homolog/main` (R-02)

## 2. Scaffold (após aprovação)

- [x] 2.1 Mecanismo de licença definido: módulos no catálogo + `module-access` (D-02)
- [x] 2.2 `php artisan make:module Educa` e `module.json` com `requires: ["Admin","Access","Pessoas","OrgChart","Client"]`
- [x] 2.3 Registrar os 7 módulos no catálogo `Module`, permissões `educa.core.*` e itens em `client_menu_items` (EducaRbacSeeder)
- [x] 2.4 Teste de isolamento de tenant (`TenantIsolationTest`) antes de qualquer feature

## 3. Backend core — Anos Letivos

- [x] 3.1 Migrations `educa_academic_years`, `educa_academic_stages`, `educa_stage_types` (tenant_id foreignId, PK UUID CHAR(36), SoftDeletes, índices `(tenant_id, ...)`)
- [x] 3.2 Models com `TenantAware`; `AcademicYearStateMachine` com eventos explícitos
- [x] 3.3 `AcademicYearService` (criação, cópia do ano anterior com ajuste de bissexto, etapas, transições)
- [x] 3.4 Controllers, FormRequests e Policies HTTP para Anos Letivos e Etapas
- [x] 3.5 Testes PHPUnit para cenários `@criacao @etapas @ciclo @bissexto @tenant @rbac`

## 4. Backend core — Calendário

- [x] 4.1 Migrations `educa_academic_calendars`, `educa_calendar_days`, `educa_calendar_day_reasons`
- [x] 4.2 `CalendarService`: recálculo de totais, importação atômica da rede, publicação com LDB
- [x] 4.3 `LdbComplianceService` (200 dias e 800 horas, diagnóstico e sugestões)
- [x] 4.4 Seeders de motivos padrão (feriados nacionais, recesso, sábado letivo, planejamento)
- [x] 4.5 Testes PHPUnit para `@calendario @ldb @publicacao @rede`

## 5. Frontend (change futura)

- [x] 5.1 `apps/web-client/src/modules/educa` com `ModuleRouteGuard`; só `@sysgov/ui`
- [x] 5.2 Tipos em `@sysgov/sdk` gerados do OpenAPI
- [x] 5.3 Grade mensal do calendário com datas e totais em JetBrains Mono

## 6. Próximos contratos do core

- [x] 6.1 Escolas (`OrgUnit` + `educa_schools`), Turmas e Matriz BNCC
  - [x] Contrato OpenAPI `schools-and-classes.openapi.yaml` e cenários BDD `core-schools-and-classes.feature`
  - [x] Migrations e Models: `EducaSchool`, `EducaCourse`, `EducaGrade`, `EducaKnowledgeArea`, `EducaCurriculumComponent`, `EducaCurriculumMatrix`, `EducaMatrixComponent`, `EducaSchoolClass`, `EducaSchoolGrade`
  - [x] Services: `SchoolService` (capacidade física por turno), `CurriculumService` (revisão de carga horária da BNCC), `SchoolClassService` (trava anti-ociosidade de vagas)
  - [x] Policies e rotas da API REST sob `/api/educa/core`
  - [x] Suíte de testes automatizados `CoreSchoolsAndClassesTest` (6 testes, 36 asserções, 100% aprovados)
- [x] 6.2 Eventos do calendário e calendário por turma
  - [x] Contrato OpenAPI `calendar-events-and-classes.openapi.yaml` e cenários BDD `core-calendar-events-and-classes.feature`
  - [x] Migrations e Models: `EducaCalendarEvent`, `EducaCalendarDayClass` (pivô UUID com `TenantAware`), relações em `EducaAcademicCalendar` e `EducaCalendarDay`
  - [x] Service: `CalendarEventService` (CRUD de eventos pedagógicos/administrativos, vinculação de turmas a dias específicos e cálculo da visão de calendário por turma)
  - [x] Controller `CalendarEventController`, FormRequests, Policies e rotas da API REST sob `/api/educa/core`
  - [x] Suíte de testes automatizados `CoreCalendarEventsAndClassesTest` (2 testes, 25 asserções, 100% aprovados)
- [x] 6.3 Mapeamento de migração `Escola`/`Pedagogico` → `Educa` (R-01)
  - [x] Documento técnico e arquitetural de transição em `Modules/Educa/docs/legacy-migration-mapping.md` cobrindo princípios, De/Para de tabelas e 5 fases do cutover seguro.
