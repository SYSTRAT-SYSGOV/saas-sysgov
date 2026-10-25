# Tasks

## 1. Especificação e Contratos de Comunicação Escolar

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/comunicacao.openapi.yaml` cobrindo avisos, públicos-alvo, confirmações de leitura, ocorrências, despachos e outbox
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/comunicacao-avisos-ocorrencias.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migration para `educa_announcements`, `educa_announcement_audiences`, `educa_announcement_reads`, `educa_student_incidents` e `educa_incident_actions` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `AnnouncementService` (gestão de comunicados, segmentação por público-alvo, controle de expiração e confirmação de leitura)
- [x] 3.2 Implementar `IncidentService` (cadastro de ocorrências pedagógicas/disciplinares, validação de matrícula ativa e registro de despachos/ciência)
- [x] 3.3 Implementar `NotificationDispatcherService` com integração transacional ao `App\Support\OutboxPublisher` para disparo multicanal e alertas de infrequência

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de comunicados, leituras, ocorrências e providências
- [x] 4.2 Criar Policy `CommunicationPolicy` com permissões `educa.comunicacao.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/comunicacao` protegidas por `module-access:educa-comunicacao`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `CommunicationAndIncidentTest.php` cobrindo cenários BDD, outbox publisher, segmentação e ocorrências
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-comunicacao --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
