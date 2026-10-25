# Tasks

## 1. Especificação e Contratos da Secretaria

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/secretaria.openapi.yaml` cobrindo matrículas, enturmações, ficha do aluno e transferências
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/secretaria-matriculas.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_enrollments`, `educa_class_enrollments`, `educa_student_profiles`, `educa_student_guardians` e `educa_transfers` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`, integrando à `Modules\Pessoas\Models\Pessoa`
- [x] 2.3 Criar gerador atômico de número de matrícula anual (`YYYY-NNNNNN`)

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `EnrollmentService` (criação atômica de matrícula, ciclo de vida e travas de duplicidade)
- [x] 3.2 Implementar `ClassEnrollmentService` (enturmação com lock pessimista de vagas, validação de choque de horários e número de chamada)
- [x] 3.3 Implementar `StudentProfileService` (ficha individual, certidão civil, programas sociais e parentesco com responsáveis MDM)
- [x] 3.4 Implementar `TransferService` (remanejamento de turmas e transferência externa com liberação de vaga)

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de dados de matrícula, enturmação e ficha cadastral
- [x] 4.2 Criar Policies RBAC com permissões `educa.secretaria.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/secretaria` protegidas por `module-access:educa-secretaria`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `SecretariaEnrollmentTest.php` cobrindo todos os cenários BDD
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-secretaria --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
