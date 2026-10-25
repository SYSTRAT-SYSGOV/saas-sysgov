# Tasks

## 1. Especificação e Contratos de Servidores

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/servidores.openapi.yaml` cobrindo servidores, funções, lotação, horas-atividade e afastamentos
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/servidores-lotacao-jornada.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migration para `educa_employees`, `educa_employee_roles`, `educa_employee_allocations`, `educa_teacher_qualifications`, `educa_employee_withdrawals` e `educa_employee_absences` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `EmployeeService` (cadastro funcional vinculado a `Pessoa`, gestão de papéis profissionais e matrículas)
- [x] 3.2 Implementar `AllocationService` com validador de jornada e trava obrigatória de 1/3 de hora-atividade da Lei do Piso 11.738/2008
- [x] 3.3 Implementar `WithdrawalService` (afastamentos/licenças com suspensão automática de alocações ativas e ocorrências de faltas)

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de servidor, funções, alocação e afastamentos
- [x] 4.2 Criar Policies RBAC com permissões `educa.servidores.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/servidores` protegidas por `module-access:educa-servidores`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `ServidoresAllocationAndFloorLawTest.php` cobrindo cenários BDD e trava da Lei do Piso
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-servidores --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
