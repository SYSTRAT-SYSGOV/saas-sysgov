# Tasks

## 1. Especificações, Contratos e Cenários BDD

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/gestao-vagas.openapi.yaml` cobrindo capacidades, inscrições, fila de espera e consulta pública
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/gestao-vagas-fila-espera.feature` cobrindo prioridade PcD, desempate socioeconômico e convocação com SLA
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos Eloquent (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_school_capacities`, `educa_enrollment_applications` e `educa_waitlists` com `tenant_id` bigint, PKs em UUID `CHAR(36)`, SoftDeletes e índices compostos
- [x] 2.2 Criar Models Eloquent `EducaSchoolCapacity`, `EducaEnrollmentApplication` e `EducaWaitlist` com traits `TenantAware`, `HasUuids` e `SoftDeletes`
- [x] 2.3 Atualizar relações em `EducaSchool`, `EducaAcademicYear` e `Pessoa` para suportar inscrições e posicionamento na fila

## 3. Serviços de Domínio e Motores de Classificação

- [x] 3.1 Implementar `SchoolCapacityService` para controle de ocupação, vagas remanescentes e reserva com trava pessimista (`lockForUpdate`)
- [x] 3.2 Implementar `EnrollmentApplicationService` para criação, análise documental e pontuação dos critérios socioeconômicos (PcD, CadÚnico, mãe trabalhadora, zoneamento)
- [x] 3.3 Implementar `WaitlistRankingService` para reclassificação dinâmica da fila de espera, desempate auditável e consulta pública anonimizada (Lei 14.685/2023)
- [x] 3.4 Implementar `ApplicationEnrollmentConverterService` para convocação nominal com controle de prazo de comparecimento (SLA) e conversão em matrícula ativa (`EducaEnrollment`)

## 4. Camada HTTP, FormRequests, RBAC e Rotas REST

- [x] 4.1 Criar FormRequests para validação de capacidade de escola, inscrição de pré-matrícula, análise de critérios e convocação
- [x] 4.2 Criar Policy RBAC `SchoolCapacityPolicy` e registrar permissões `educa.vagas.*` no `EducaServiceProvider`
- [x] 4.3 Implementar controllers (`SchoolCapacityController`, `EnrollmentApplicationController`, `WaitlistController`) e registrar rotas REST sob `/api/educa/vagas/*`

## 5. Frontend Web-Client: Gestão de Vagas e Fila de Espera

- [x] 5.1 Criar componente `GestaoVagasView.tsx` no `apps/web-client` exibindo abas de Capacidade da Rede, Inscrições/Triagem e Fila de Espera Transparente
- [x] 5.2 Implementar modal de conferência de critérios socioeconômicos e validação documental de pré-matrícula
- [x] 5.3 Implementar painel de convocação nominal com contagem regressiva de SLA de comparecimento
- [x] 5.4 Integrar a aba "Gestão de Vagas" ao `EducaModule.tsx` e exportar em `apps/web-client/src/modules/educa`

## 6. Testes Automatizados e Validação

- [x] 6.1 Criar suíte de testes Feature `GestaoVagasAndFilaEsperaTest.php` cobrindo cenários BDD, cálculo de pontuação, prioridade PcD, convocação e conversão em matrícula
- [x] 6.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 6.3 Validar a change com `openspec validate criar-modulo-educa-gestao-vagas --strict`

