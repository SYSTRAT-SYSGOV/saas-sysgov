# Anos Letivos do SYS-Educa Specification

## Purpose
Gerencia o ciclo de vida dos anos letivos por escola e em lote na rede municipal de ensino, controlando etapas, transições de estado, imutabilidade após encerramento e conformidade legal com a LDB.

## Requirements

### Requirement: Ciclo de vida do ano letivo
O sistema SHALL controlar o ano letivo de cada escola pelos estados `planning`, `active`, `frozen`, `evaluation_phase` e `closed`, aceitando apenas as transições `planning→active`, `active→frozen`, `frozen→active`, `active→evaluation_phase` e `evaluation_phase→closed`. Transição inválida SHALL responder 409 com `code=INVALID_TRANSITION`.

#### Scenario: Iniciar ano letivo sem etapas
- **WHEN** o ano letivo está em `planning` sem etapas datadas e o evento `start` é executado
- **THEN** a transição é recusada e o status permanece `planning`

#### Scenario: Ano letivo encerrado é imutável
- **WHEN** o ano letivo está em `closed` e há tentativa de alterá-lo, ou alterar suas etapas ou seu calendário
- **THEN** a resposta é 409 com `code=ACADEMIC_YEAR_IMMUTABLE`

### Requirement: Encerramento condicionado a matrículas e diários
O sistema SHALL bloquear o encerramento do ano letivo quando houver matrícula em andamento (exceto curso de atividade complementar) ou diários e notas pendentes.

#### Scenario: Matrícula em andamento
- **WHEN** o evento `close` é executado com matrícula ativa sem situação final
- **THEN** a resposta é 409 com a mensagem "Existem matrículas em andamento" e nada é alterado

### Requirement: Validação de etapas
O sistema SHALL recusar etapas que invadam o período de outro ano letivo da mesma escola, que se sobreponham entre si, ou cuja quantidade difira de `num_etapas` do tipo de etapa, e SHALL bloquear a redução de etapas que tenham nota ou falta lançada.

#### Scenario: Datas em conflito com outro ano
- **WHEN** uma etapa de 2025 inclui datas pertencentes ao período de 2024 da mesma escola
- **THEN** a resposta é 422

### Requirement: Operação em lote
O sistema SHALL criar, abrir e encerrar anos letivos de várias escolas em uma operação, validando todas previamente; na criação, qualquer falha de validação SHALL impedir a gravação de todas.

#### Scenario: Criação em lote com uma escola inválida
- **WHEN** a terceira de três escolas falha na validação
- **THEN** nenhum ano letivo é criado e o relatório lista o erro dessa escola

### Requirement: Isolamento por tenant e auditoria
Todos os registros SHALL pertencer a um `tenant_id` resolvido pelo servidor; registro de outro tenant SHALL responder 404; toda mutação SHALL ser registrada em `audit_logs` com valores anterior e posterior.

#### Scenario: Consulta entre tenants
- **WHEN** um usuário consulta por id um ano letivo de outro tenant
- **THEN** a resposta é 404
