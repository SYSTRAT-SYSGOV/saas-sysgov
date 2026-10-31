## ADDED Requirements

### Requirement: Pré-validação do Registro 60
O sistema DEVE gerar, por ano letivo, a pré-validação do transporte para o Censo, listando por aluno as pendências `sem_alocacao_ativa` (aluno que teve alocação no ano e não tem nenhuma ativa), `rota_sem_veiculo`, `rural_sem_declaracao` e `veiculo_nao_adaptado`, e o aviso `turno_divergente`. O sistema DEVE marcar `approved` somente quando não houver pendência; o aviso não impede a aprovação. Exige `transporte.censo.export`.

#### Scenario: Rota sem veículo
- **GIVEN** um aluno alocado em rota sem veículo
- **WHEN** a pré-validação do ano é executada
- **THEN** o aluno aparece com a pendência `rota_sem_veiculo` e `approved` é falso

#### Scenario: Necessidade especial em veículo comum
- **GIVEN** um aluno com necessidade especial alocado em veículo não acessível
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `veiculo_nao_adaptado`

#### Scenario: Aluno rural sem declaração
- **GIVEN** uma alocação em rota rural com `usa_transporte_rural` falso
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `rural_sem_declaracao`

#### Scenario: Sem pendências
- **WHEN** todos os dados estão consistentes
- **THEN** `approved` é verdadeiro e a lista vem vazia

#### Scenario: Só aviso de turno
- **GIVEN** a única ocorrência é um `turno_divergente`
- **WHEN** a pré-validação é executada
- **THEN** o aviso é listado e `approved` continua verdadeiro

#### Scenario: Usuário sem permissão
- **WHEN** um usuário sem `transporte.censo.export` pede a pré-validação
- **THEN** o servidor responde 403

### Requirement: Exportação CSV do Registro 60
O sistema DEVE exportar em CSV (UTF-8 com BOM, separador `;`) uma linha por alocação ativa do ano letivo, com aluno, escola e Inep da escola, turno, rota, placa, tipologia Inep, `transporte_publico`, `poder_publico_responsavel` e as onze flags de tipologia modal (1 a 11). O arquivo NÃO DEVE conter CPF, endereço nem a observação de necessidade especial.

#### Scenario: Aluno transportado por ônibus municipal
- **GIVEN** um aluno com poder público 2 em rota com veículo de tipologia 3
- **WHEN** o CSV do ano é exportado
- **THEN** a linha tem `transporte_publico` 1, `poder_publico_responsavel` 2 e a flag `onibus` 1, com as demais 0

#### Scenario: Tipologia ferroviária
- **GIVEN** um veículo de tipologia 11
- **WHEN** o CSV é exportado
- **THEN** a flag `ferroviario` é 1

#### Scenario: Alocação encerrada
- **GIVEN** um aluno com alocação encerrada
- **WHEN** o CSV é exportado
- **THEN** ele não tem linha

### Requirement: Anulação da declaração de transporte público
O sistema DEVE deixar vazios os campos de transporte público (e zerar as flags de tipologia) na linha do aluno cuja alocação não tem atendimento curricular, tem mediação didática `distancia` ou tem país de residência diferente de `BR`.

#### Scenario: Sem atendimento curricular
- **GIVEN** uma alocação com `atendimento_curricular` falso
- **WHEN** o CSV é exportado
- **THEN** `transporte_publico` e `poder_publico_responsavel` ficam vazios

#### Scenario: Ensino a distância
- **GIVEN** uma alocação com mediação `distancia`
- **WHEN** o CSV é exportado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Residência no exterior
- **GIVEN** uma alocação com país de residência `PY`
- **WHEN** o CSV é exportado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Caso comum
- **GIVEN** atendimento curricular, mediação presencial e país `BR`
- **WHEN** o CSV é exportado
- **THEN** a declaração não é anulada

### Requirement: Segurança do arquivo exportado
O CSV DEVE neutralizar células iniciadas por `=`, `+`, `-` ou `@` e a exportação DEVE ser auditada com o usuário, o ano letivo e a quantidade de linhas.

#### Scenario: Nome iniciado por sinal
- **GIVEN** um nome de aluno que começa com "="
- **WHEN** o CSV é exportado
- **THEN** a célula é gravada com um apóstrofo à frente

#### Scenario: Exportação registrada
- **WHEN** o CSV é exportado
- **THEN** o `audit_logs` tem o evento com o ano e o total de linhas

### Requirement: Painel de lotação
O módulo DEVE ter um painel com: rotas ativas, veículos ativos, alunos transportados, ocupação média (ponderada pela capacidade) e rotas em superlotação, e a lista de rotas com a faixa de ocupação (verde até 80 %, amarelo de 81 % a 100 %, vermelho acima de 100 %), mostrando também o rótulo de texto, não só a cor. Rotas sem veículo DEVEM aparecer como pendência.

#### Scenario: Rota vermelha
- **WHEN** uma rota tem mais alunos que a capacidade
- **THEN** ela aparece em vermelho com o rótulo "Superlotada" e no topo da lista

#### Scenario: Rota sem veículo
- **WHEN** uma rota não tem veículo
- **THEN** ela aparece como pendência, sem percentual

#### Scenario: Sem dados
- **WHEN** o tenant não tem rotas
- **THEN** o painel mostra o estado vazio

### Requirement: Alertas no painel
O painel DEVE incluir os alertas de vencimento da frota (Fase 1), com os críticos primeiro.

#### Scenario: Alerta crítico no topo
- **GIVEN** um alerta crítico de vistoria e um de atenção de CNH
- **WHEN** o painel é aberto
- **THEN** o crítico aparece antes do de atenção

### Requirement: Consulta da auditoria do módulo
O módulo DEVE ter tela de auditoria com filtro por período, ação e usuário, exigindo `transporte.audit`.

#### Scenario: Filtro por ação
- **WHEN** o auditor filtra pela ação `alocacao.excesso_autorizado`
- **THEN** só esses eventos aparecem, com a justificativa
