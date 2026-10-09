# meio-ambiente/auditoria Specification

## Purpose
Trilha de auditoria consolidada de todas as etapas do módulo de Meio Ambiente — licenciamento, autuação
ambiental, condicionantes, compensação e outorgas — com identificação de usuário, data, hora e dados
alterados.

## Requirements

### Requirement: Registro de auditoria de toda mutação do módulo
<!-- entities: AuditLog -->

O sistema SHALL registrar, para toda operação de criação, alteração ou exclusão realizada por qualquer
serviço do módulo de Meio Ambiente (licenciamento, cadastro de empreendimento, autuação ambiental,
condicionante, compensação ambiental, outorga de recursos hídricos), um registro de auditoria contendo
tenant, usuário, módulo, ação, recurso afetado, estado anterior e posterior, IP, user agent e data/hora.

#### Scenario: Mutação de condicionante gera registro de auditoria
- **GIVEN** um usuário autenticado com permissão para gerir condicionantes
- **WHEN** ele marca uma condicionante como `cumprida`
- **THEN** um registro de auditoria é criado com o estado anterior (`pendente`) e posterior (`cumprida`) da condicionante, o usuário e o timestamp da operação

### Requirement: Consulta consolidada da trilha de auditoria por processo
<!-- entities: AuditLog -->

O sistema SHALL disponibilizar um endpoint que reúna, para um processo de licenciamento ou um auto de
infração ambiental específico, toda a trilha de auditoria relacionada (incluindo condicionantes,
documentos, pagamentos de compensação e, quando aplicável, o processo sancionatório correspondente do
módulo Vistoria), restrito a usuários com a permissão `meio_ambiente.auditoria.view`.

#### Scenario: Consulta da trilha completa de um processo de licenciamento
- **GIVEN** um usuário com permissão `meio_ambiente.auditoria.view` e um processo de licenciamento com 2 condicionantes e 1 documento anexado
- **WHEN** ele consulta a trilha de auditoria consolidada desse processo
- **THEN** recebe, em ordem cronológica, os registros de criação do processo, das 2 condicionantes e do documento anexado

#### Scenario: Usuário sem permissão não acessa a trilha consolidada
- **GIVEN** um usuário autenticado sem a permissão `meio_ambiente.auditoria.view`
- **WHEN** ele tenta consultar a trilha de auditoria consolidada de um processo
- **THEN** o controller responde HTTP 403
