# Tasks

## 1. Especificações, Contratos e Cenários BDD

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/quadro-horario.openapi.yaml` cobrindo matriz de tempos, turnos, grade da turma e alocação de aulas
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/quadro-horario-anti-choque.feature` cobrindo parametrização, alocação e bloqueio de colisão de horários
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos Eloquent (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_timetables`, `educa_timetable_slots` e `educa_timetable_lessons` com `tenant_id` bigint, PKs em UUID `CHAR(36)`, SoftDeletes e índices compostos
- [x] 2.2 Criar Models Eloquent `EducaTimetable`, `EducaTimetableSlot` e `EducaTimetableLesson` com traits `TenantAware`, `HasUuids` e `SoftDeletes`
- [x] 2.3 Atualizar relações em `EducaSchoolClass`, `EducaCurriculumComponent`, `EducaEmployee` e `EducaClassDiary`

## 3. Serviços de Domínio e Motor Anti-Choque

- [x] 3.1 Implementar `TimetableCollisionService` com algoritmo de verificação matemática de sobreposição de horários e lock pessimista (`SELECT FOR UPDATE`)
- [x] 3.2 Implementar `TimetableService` para montagem de matriz de tempos por turno, cópia de grade e alocação de componentes/docentes
- [x] 3.3 Implementar integração entre `ClassDiaryService` e o quadro de horários ativo para sugestão da aula do dia

## 4. Camada HTTP, FormRequests, RBAC e Rotas REST

- [x] 4.1 Criar FormRequests para validação estrita de horários (início < fim), turnos, dias da semana e dados de alocação/substituição
- [x] 4.2 Criar Policies RBAC com permissões `educa.quadro_horario.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar `TimetableController` e registrar rotas REST sob `/api/educa/core/turmas/{turmaId}/quadro-horario`

## 5. Frontend Web-Client: Grade Semanal Interativa

- [x] 5.1 Criar componente `QuadroHorarioView.tsx` no `apps/web-client` exibindo matriz semanal (Segunda a Sábado) com turnos e tempos
- [x] 5.2 Implementar modal de alocação de aula com seleção de componente da matriz, professor titular/substituto e feedback visual imediato de conflito
- [x] 5.3 Integrar a aba "Quadro de Horários" ao `EducaModule.tsx` e exportar em `apps/web-client/src/modules/educa`

## 6. Testes Automatizados e Validação

- [x] 6.1 Criar suíte de testes Feature `TimetableAndCollisionTest.php` cobrindo cenários BDD, trava anti-choque entre escolas e substituição docente
- [x] 6.2 Executar suíte PHPUnit e verificar 100% de aprovação (84/84 testes verdes)
- [x] 6.3 Validar a change com `openspec validate criar-modulo-educa-quadro-horario --strict`
- [x] 6.4 Atualizar knowledge graph com `graphify update .`
