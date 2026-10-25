# Tasks

## 1. Especificação e Contratos de Transporte Escolar

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/transporte.openapi.yaml` cobrindo rotas, pontos de parada, veículos, condutores e alocação de estudantes
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/transporte-rotas-alocacao.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migration para `educa_transport_routes`, `educa_transport_stops`, `educa_transport_route_schools`, `educa_transport_vehicles`, `educa_transport_inspections`, `educa_transport_drivers` e `educa_transport_student_allocations` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `TransportRouteService` (gestão de rotas, turnos, quilometragem, pontos ordenados e vinculação de escolas)
- [x] 3.2 Implementar `TransportVehicleService` (cadastro de veículos, histórico e controle de validade semestral de vistorias do DETRAN)
- [x] 3.3 Implementar `TransportDriverService` (cadastro funcional de condutores e monitores vinculado a `Pessoa`, com validação de CNH D/E e curso especializado)
- [x] 3.4 Implementar `TransportAllocationService` com lock pessimista (`lockForUpdate`) para trava anti-sobrelotação de assentos e sincronização com perfil do estudante

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de rotas, pontos, veículos, vistorias, condutores e alocações
- [x] 4.2 Criar Policies RBAC com permissões `educa.transporte.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/transporte` protegidas por `module-access:educa-transporte`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `TransporteRoutesAndAllocationTest.php` cobrindo cenários BDD, trava de assentos, vistorias e alocações
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-transporte --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
