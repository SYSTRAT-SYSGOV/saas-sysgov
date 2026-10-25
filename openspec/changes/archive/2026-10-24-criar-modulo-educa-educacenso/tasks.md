# Tasks

## 1. Especificação e Contratos do Educacenso

- [x] 1.1 Criar contrato OpenAPI `apps/api/Modules/Educa/openspec/contracts/educacenso.openapi.yaml` cobrindo auditoria cadastral, exportação em lote, status do processamento e conciliação de retorno
- [x] 1.2 Criar cenários BDD em Gherkin `apps/api/Modules/Educa/openspec/scenarios/educacenso-auditoria-exportacao.feature`
- [x] 1.3 Validar contrato OpenAPI com linter `@redocly/cli lint` (0 erros, 0 warnings)

## 2. Banco de Dados e Modelos (Multi-Tenant & UUID)

- [x] 2.1 Criar migrations para `educa_census_exports`, `educa_census_validations` e `educa_census_inep_logs` com `tenant_id` bigint e PKs em UUID
- [x] 2.2 Criar Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`

## 3. Serviços de Domínio e Regras de Negócio

- [x] 3.1 Implementar `CensusAuditService` e validadores de consistência para Registros 00, 10, 20, 30, 40, 50 e 60 com separação entre impeditivos e avisos
- [x] 3.2 Implementar `CensusExportService` com gerador posicional delimitado por pipe (`|`), fechamento 99, anulação de campos e codificação ISO-8859-1
- [x] 3.3 Implementar `CensusImportService` para leitura do arquivo de retorno e conciliação de códigos INEP
- [x] 3.4 Implementar `ExportEducacensoJob` para processamento assíncrono em lote sem estourar limites de memória ou timeout

## 4. Camada HTTP, Rotas e RBAC

- [x] 4.1 Criar FormRequests para validação estrita de solicitação de auditoria, exportação e upload do arquivo de retorno
- [x] 4.2 Criar Policies RBAC com permissões `educa.educacenso.*` e registrar no `EducaServiceProvider`
- [x] 4.3 Implementar Controllers HTTP e registrar rotas REST sob `/api/educa/educacenso` protegidas por `module-access:educa-educacenso`

## 5. Testes Automatizados e Validação

- [x] 5.1 Criar suíte de testes Feature `EducacensoAuditAndExportTest.php` cobrindo cenários BDD, regras de anulação, bloqueio por impeditivos e retorno do INEP
- [x] 5.2 Executar suíte PHPUnit e verificar 100% de aprovação
- [x] 5.3 Validar a change com `openspec validate criar-modulo-educa-educacenso --strict`
- [x] 5.4 Atualizar knowledge graph com `graphify update .`
