# Tasks

## 1. Especificações, Contratos e Cenários BDD

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/educacao-especial-aee.openapi.yaml` cobrindo perfis AEE, laudos com CID, PEI com metas, salas de recursos e alocação de apoio
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/educacao-especial-aee.feature` cobrindo laudos médicos LGPD, elaboração do PEI, enturmação em SRM e trava de sobrecarga de cuidadores
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos Eloquent (Multi-Tenant & UUID)

- [x] 2.1 Criar migration para `educa_aee_student_profiles`, `educa_aee_peis`, `educa_aee_pei_goals`, `educa_aee_resource_rooms`, `educa_aee_enrollments` e `educa_aee_support_allocations` com `tenant_id` bigint, PKs em UUID `CHAR(36)`, SoftDeletes e índices compostos
- [x] 2.2 Criar Models Eloquent (`EducaAeeStudentProfile`, `EducaAeePei`, `EducaAeePeiGoal`, `EducaAeeResourceRoom`, `EducaAeeEnrollment`, `EducaAeeSupportAllocation`) com traits `TenantAware`, `HasUuids` e `SoftDeletes`
- [x] 2.3 Atualizar relações em `EducaSchool`, `EducaEnrollment` e `Pessoa` para navegação bidirecional de AEE

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `AeeStudentProfileService` para gestão do prontuário PAEE, anexo de laudos com CID-10/11 e mapeamento de barreiras/acessibilidade
- [x] 3.2 Implementar `AeePeiService` para elaboração colaborativa do Plano Educacional Individualizado, metas semestrais e pareceres descritivos
- [x] 3.3 Implementar `AeeResourceRoomService` para gestão das Salas de Recursos Multifuncionais (SRM) e matrícula em dupla entrada no contraturno
- [x] 3.4 Implementar `AeeSupportAllocationService` para alocação de profissionais de apoio (cuidadores/intérpretes de Libras) com trava de sobrecarga por cuidador

## 4. Camada HTTP, FormRequests, RBAC e Rotas REST

- [x] 4.1 Criar FormRequests para validação de perfis AEE, laudos médicos, PEI/metas, enturmações em SRM e alocações de apoio
- [x] 4.2 Criar Policy RBAC `AeePolicy` e registrar permissões `educa.aee.*` no `EducaServiceProvider`
- [x] 4.3 Implementar controllers (`AeeStudentProfileController`, `AeePeiController`, `AeeResourceRoomController`, `AeeSupportAllocationController`) e registrar rotas sob `/api/educa/aee/*`

## 5. Frontend Web-Client: Educação Especial e AEE

- [x] 5.1 Criar componente `EducacaoEspecialAeeView.tsx` no `apps/web-client` com abas para Alunos PAEE, PEI / Planos, Salas de Recursos e Profissionais de Apoio
- [x] 5.2 Implementar modais com componentes `@sysgov/ui` para cadastro de perfil AEE com laudo, elaboração de PEI e alocação de cuidadores
- [x] 5.3 Integrar a aba "Educação Especial (AEE)" ao `EducaModule.tsx` e exportar em `apps/web-client/src/modules/educa`
- [x] 5.4 Validar tipagem TypeScript com `npx tsc --noEmit` em `apps/web-client` (0 erros)

## 6. Testes Automatizados e Validação

- [x] 6.1 Criar suíte de testes Feature `EducacaoEspecialAeeTest.php` cobrindo sigilo LGPD, metas do PEI, enturmação em SRM e trava de sobrecarga de cuidadores
- [x] 6.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 6.3 Validar a change com `openspec validate criar-modulo-educa-educacao-especial-aee --strict`
