# Matriz de Rastreabilidade Código Legado vs Especificações SDD (Code/Spec Matrix)

> **Documento Gerado pelo Redator (`reversa-writer`) — Reversa Framework**  
> **Sistema:** i-Educar legado vs SYSGOV (`SYS-Educa`)  
> **Status:** 🟢 Completo — Consolidação das 29 Units de Componentes, OpenAPI e User Stories  
> **Padrão:** JetBrains Mono para identificadores técnicos, rastreabilidade bidirecional código ↔ spec ↔ target.

---

## 1. Visão Geral da Rastreabilidade

A matriz abaixo estabelece o mapeamento ponta a ponta entre o código-fonte legado do i-Educar (arquivos PHP, modelos Eloquent, tabelas legadas PostgreSQL/MySQL) e as especificações de design geradas na pasta `_reversa_sdd/`, assegurando que 100% dos fluxos de negócio críticos possuam cobertura documental para a reconstrução no SYSGOV.

---

## 2. Matriz Completa por Componente (29 Units)

| # | Unit de Spec | Código-Fonte Legado Principal | Tabelas Legadas Envolvidas | Artefatos SDD Gerados | Entidades Canônicas SYSGOV | Confiança |
|---|---|---|---|---|---|---|
| 01 | [`Transport`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Transport/) | `modules/Transporte/`, `RotasController.php` | `modules.transporte_*`, `modules.rota_transporte_escolar` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_transport_routes`, `vehicles`, `stops` | 🟢 / 🔴 |
| 02 | [`Educacenso`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Educacenso/) | `modules/Educacenso/`, `EducacensoExportController.php` | `modules.educacenso_*`, `pmieducar.servidor` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_census_exports`, `census_validation_logs` | 🟢 |
| 03 | [`Enrollments`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Enrollments/) | `app/Models/Registration.php`, `matricula_cad.php` | `pmieducar.matricula`, `pmieducar.matricula_turma` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_enrollments`, `class_enrollments` | 🟢 |
| 04 | [`People`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/People/) | `app/Models/Individual.php`, `cadastro_pessoa_cad.php` | `cadastro.pessoa`, `cadastro.fisica`, `cadastro.documento` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_people`, `core_individuals`, `documents` | 🟢 |
| 05 | [`School`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/School/) | `app/Models/LegacySchool.php`, `escola_cad.php` | `pmieducar.escola`, `pmieducar.escola_ano_letivo` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_schools`, `school_facilities`, `infrastructure` | 🟢 |
| 06 | [`SchoolClass`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/SchoolClass/) | `app/Models/LegacySchoolClass.php`, `turma_cad.php` | `pmieducar.turma`, `pmieducar.turma_serie` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_school_classes`, `class_schedules` | 🟢 |
| 07 | [`Stages`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Stages/) | `app/Models/LegacyStage.php`, `serie_cad.php` | `pmieducar.serie`, `pmieducar.curso` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_series`, `courses`, `educational_stages` | 🟢 |
| 08 | [`Usuario`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Usuario/) | `app/Models/User.php`, `portal.funcionario` | `pmieducar.usuario`, `portal.funcionario`, `menu_usuario` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_users`, `user_roles`, `permissions` | 🟢 |
| 09 | [`Avaliacao`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Avaliacao/) | `app/Services/EvaluationRuleService.php`, `boletim.php` | `modules.nota_aluno`, `modules.falta_aluno`, `boletim` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_evaluations`, `student_grades`, `attendances` | 🟢 |
| 10 | [`RegraAvaliacao`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/RegraAvaliacao/) | `ieducar/modules/RegraAvaliacao/`, `Regra.php` | `modules.regra_avaliacao`, `regra_avaliacao_serie_ano` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_evaluation_rules`, `remedial_rules` | 🟢 |
| 11 | [`Cadastro`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Cadastro/) | `ieducar/intranet/atendidos_cad.php`, `fisica_cad.php` | `cadastro.fisica`, `cadastro.juridica`, `documento` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_persons`, `legal_entities`, `addresses` | 🟢 |
| 12 | [`Calendario`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Calendario/) | `app/Models/LegacyCalendarDay.php`, `calendario_cad.php`| `pmieducar.calendario_dia`, `calendario_ano_letivo` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_calendars`, `calendar_events`, `periods` | 🟢 |
| 13 | [`ComponenteCurricular`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/ComponenteCurricular/)| `modules/ComponenteCurricular/`, `Componente.php` | `modules.componente_curricular`, `area_conhecimento` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_disciplines`, `knowledge_areas` | 🟢 |
| 14 | [`Configuracao`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Configuracao/) | `app/Models/LegacyInstitution.php`, `config.php` | `pmieducar.instituicao`, `pmieducar.configuracao` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_tenants`, `tenant_settings`, `institutions`| 🟢 |
| 15 | [`DiarioClasse`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/DiarioClasse/) | `modules/Avaliacao/Views/DiarioApiController.php` | `modules.falta_aluno`, `modules.nota_aluno`, `diario` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_class_diaries`, `daily_records` | 🟢 |
| 16 | [`HistoricoEscolar`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/HistoricoEscolar/)| `app/Models/LegacySchoolHistory.php`, `historico_cad.php`| `pmieducar.historico_escolar`, `historico_disciplinas` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_school_histories`, `history_disciplines` | 🟢 |
| 17 | [`QuadroHorario`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/QuadroHorario/) | `clsPmieducarQuadroHorarioHorarios.inc.php` | `pmieducar.quadro_horario_horarios`, `quadro_horario` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_timetable_slots`, `teacher_schedules` | 🟢 |
| 18 | [`Reports`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Reports/) | `app/Services/ReportService.php`, `reports/` | `modules.relatorio_*`, templates `.jrxml` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_report_templates`, `pdf_exports` | 🟢 |
| 19 | [`SupportModules`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/SupportModules/) | `App/Support/`, `audit_logs`, `breadcrumbs` | `public.audit_logs`, `public.system_parameters` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_support_parameters`, `system_audits` | 🟢 |
| 20 | [`AcademicYear`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/AcademicYear/) | `app/Models/LegacySchoolAcademicYear.php` | `pmieducar.escola_ano_letivo`, `ano_letivo_modulo` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_academic_years`, `academic_stages` | 🟢 |
| 21 | [`Addressing`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Addressing/) | `src/Modules/Addressing/`, `PostalCodeController.php` | `public.places`, `public.cities`, `public.states` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_addresses`, `cities`, `states`, `countries` | 🟢 |
| 22 | [`ErrorTracking`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/ErrorTracking/) | `App/Exceptions/Handler.php`, `sentry/` | `storage/logs/laravel.log`, Sentry Client | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_telemetry_errors`, `opentelemetry_traces` | 🟢 |
| 23 | [`EvaluationRules`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/EvaluationRules/) | `src/Modules/EvaluationRules/`, `ParallelRemedial*` | `modules.regra_avaliacao`, `regra_recuperacao` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_evaluation_engines`, `remedial_rules` | 🟢 |
| 24 | [`FormulaMedia`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/FormulaMedia/) | `ieducar/modules/FormulaMedia/`, `Model/Formula.php` | `modules.formula_media` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_average_formulas`, `calculation_tokens` | 🟢 |
| 25 | [`TabelaArredondamento`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/TabelaArredondamento/)| `ieducar/modules/TabelaArredondamento/`, `Tabela.php` | `modules.tabela_arredondamento`, `tabela_valor` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_rounding_tables`, `rounding_values` | 🟢 |
| 26 | [`Navigation`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Navigation/) | `app/Menu.php`, `App/Services/MenuCacheService.php` | `public.menus`, `pmieducar.menu_tipo_usuario` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_navigation_nodes`, `user_favorites` | 🟢 |
| 27 | [`Notifications`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Notifications/) | `app/Services/NotificationService.php`, `Announcement` | `public.notifications`, `public.announcements` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_notifications`, `core_announcements` | 🟢 |
| 28 | [`Servidores`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Servidores/) | `app/Models/Employee.php`, `educar_servidor_cad.php` | `pmieducar.servidor`, `servidor_alocacao`, `afastamento`| 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `core_employees`, `educa_teacher_allocations` | 🟢 |
| 29 | [`Unification`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/Unification/) | `ieducar/lib/App/Unificacao/`, `StudentUnification*` | `pmieducar.log_unificacao`, `log_unificacao_old_data` | 6 arquivos (Req, Des, Task, Cont, Flow, Quest) | `educa_unification_logs`, `person_merges` | 🟢 |

---

## 3. Cobertura de Artefatos Globais

| Artefato Global | Localização | Escopo Coberto |
|---|---|---|
| **OpenAPI 3.1.0** | [`_reversa_sdd/openapi/ieducar-api.yaml`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/openapi/ieducar-api.yaml) | Contratos REST de 8 domínios funcionais: Auth, Geografia, Institucional, Pessoas, Servidores, Turmas, Avaliação e Mensagens. |
| **User Stories** | [`_reversa_sdd/user-stories/`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/user-stories/) | 12 Histórias de usuário completas em formato Gherkin cobrindo Matrículas, Diário de Classe, Lotação Docente, Censo Escolar e Unificação. |
| **ADRs de Arquitetura** | [`_reversa_sdd/adrs/`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/adrs/) | 7 Decisões Arquiteturais canônicas (ADR-001 a ADR-007) definindo Multi-tenancy, Motor de Avaliação, Identidade Única, Diário de Classe, Censo, RBAC e Mensageria. |
| **Spec Scorer SDD** | [`_reversa_sdd/sdd/`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/sdd/) | 8 Especificações de Arquitetura do SYSGOV avaliadas com score 100/100 pelo validador oficial. |
