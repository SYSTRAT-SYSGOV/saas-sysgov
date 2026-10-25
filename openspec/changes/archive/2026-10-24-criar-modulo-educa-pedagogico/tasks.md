# Tasks

## 1. Especificação e Contratos da Camada Pedagógica

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/pedagogico.openapi.yaml` cobrindo diário de classe, frequência e avaliação
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/pedagogico-diario-avaliacao.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_class_diaries`, `educa_attendance_records`, `educa_evaluation_rules`, `educa_evaluation_formulas`, `educa_grade_scales` e `educa_student_grades` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`

## 3. Motor de Avaliação e Serviços de Domínio

- [x] 3.1 Implementar `EvaluationFormulaEvaluator` (parser e avaliador declarativo de fórmulas aritméticas sem eval - ADR 002)
- [x] 3.2 Implementar `ClassDiaryService` (registro de aula com validação de dia letivo oficial no calendário)
- [x] 3.3 Implementar `AttendanceService` (chamada diária e abono legal de faltas para estudantes enturmados)
- [x] 3.4 Implementar `EvaluationService` (lançamento de notas, arredondamento oficial e consolidação de médias)

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de diário, frequência e notas
- [x] 4.2 Criar Policies RBAC com permissões `educa.pedagogico.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/pedagogico` protegidas por `module-access:educa-pedagogico`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `PedagogicoDiaryAndEvaluationTest.php` cobrindo todos os cenários BDD
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-pedagogico --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
