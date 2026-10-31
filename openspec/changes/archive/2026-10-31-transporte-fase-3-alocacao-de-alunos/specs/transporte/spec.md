## ADDED Requirements

### Requirement: Alocação de aluno em rota e parada
O sistema DEVE permitir alocar um aluno ativo do cadastro escolar a uma rota e a uma parada **do itinerário daquela rota**, exigindo que a turma do aluno seja do mesmo ano letivo da rota, registrando a data de início, o uso de transporte rural e o poder público responsável (1 estadual, 2 municipal, 3 compartilhado). O sistema NÃO DEVE permitir duas alocações ativas do mesmo aluno na mesma rota.

#### Scenario: Alocação válida
- **GIVEN** um aluno ativo, de turma do ano letivo 2026, e uma rota de 2026 com a parada no itinerário
- **WHEN** um usuário com `transporte.alocacoes.manage` aloca o aluno nessa parada
- **THEN** a alocação é criada ativa e passa a contar na ocupação da rota

#### Scenario: Parada fora do itinerário
- **WHEN** a parada informada não pertence ao itinerário da rota
- **THEN** o sistema responde 422 e não cria a alocação

#### Scenario: Aluno transferido
- **WHEN** o aluno tem situação `transferido`
- **THEN** o sistema responde 422

#### Scenario: Ano letivo diferente
- **WHEN** a turma do aluno é de 2025 e a rota é de 2026
- **THEN** o sistema responde 422

#### Scenario: Aluno já alocado na rota
- **GIVEN** o aluno tem alocação ativa na rota
- **WHEN** uma nova alocação dele na mesma rota é pedida
- **THEN** o sistema responde 409

#### Scenario: Poder público inválido
- **WHEN** o poder público responsável informado é 4
- **THEN** o sistema responde 422

### Requirement: Controle de capacidade do veículo
O sistema DEVE recusar com 409 a alocação que ultrapasse a capacidade do veículo da rota, conferindo a contagem em transação com lock na rota para que alocações simultâneas não passem do limite. Rota sem veículo NÃO DEVE receber alocação. A exceção DEVE exigir a permissão `transporte.alocacoes.override_capacity` e uma justificativa, que DEVE ser auditada.

#### Scenario: Limite atingido
- **GIVEN** uma rota com veículo de capacidade 2 e 2 alunos alocados
- **WHEN** um terceiro aluno é alocado sem permissão de exceção
- **THEN** o sistema responde 409 informando a capacidade (2) e a ocupação (2)

#### Scenario: Exceção autorizada
- **WHEN** um usuário com `override_capacity` aloca o terceiro aluno com a justificativa "Único transporte durante a reforma da van"
- **THEN** a alocação é criada, a rota passa a vermelha e o evento `alocacao.excesso_autorizado` é auditado com a justificativa

#### Scenario: Exceção sem justificativa
- **WHEN** o usuário com `override_capacity` pede a alocação acima do limite sem justificativa
- **THEN** o sistema responde 409

#### Scenario: Concorrência
- **GIVEN** uma rota com 1 vaga e duas alocações enviadas ao mesmo tempo
- **WHEN** as duas são processadas
- **THEN** só uma é criada e a outra recebe 409

#### Scenario: Rota sem veículo
- **WHEN** se tenta alocar um aluno em rota sem veículo
- **THEN** o sistema responde 409

### Requirement: Revalidação a cada alocação
A cada alocação, o sistema DEVE revalidar o contrato da empresa, a vistoria do veículo e a elegibilidade do motorista da rota, recusando com 409, e indicando o item, qualquer irregularidade.

#### Scenario: Vistoria vencida depois de criada a rota
- **GIVEN** uma rota cujo veículo teve a vistoria vencida
- **WHEN** um aluno é alocado
- **THEN** o sistema responde 409 indicando o veículo

### Requirement: Necessidade especial e acessibilidade
O sistema DEVE permitir indicar que o aluno precisa de transporte adaptado e DEVE recusar com 409 a alocação dele em rota cujo veículo não seja acessível. A observação textual da necessidade DEVE ser tratada como dado sensível: visível só a quem tem `transporte.alocacoes.manage`, auditada na leitura e na escrita, e ausente de listagens gerais e exportações.

#### Scenario: Veículo não adaptado
- **WHEN** um aluno com necessidade especial é alocado em rota com veículo não acessível
- **THEN** o sistema responde 409 indicando a exigência de veículo adaptado

#### Scenario: Consulta sem permissão de gerir
- **GIVEN** um usuário só com `transporte.view`
- **WHEN** ele lista as alocações da rota
- **THEN** a observação da necessidade não vem na resposta

#### Scenario: Leitura auditada
- **WHEN** um gestor abre a ficha da alocação com a observação
- **THEN** a leitura é registrada no `audit_logs`

### Requirement: Turno da alocação
A alocação DEVE usar o turno da rota. Quando o turno da turma do aluno for reconhecível e divergir do turno da rota, o sistema DEVE criar a alocação com o aviso `turno_divergente`, sem bloquear.

#### Scenario: Turno divergente
- **GIVEN** a rota é da manhã e a turma do aluno é da tarde
- **WHEN** o aluno é alocado
- **THEN** a alocação é criada com o aviso `turno_divergente`

### Requirement: Encerramento de alocação
O sistema DEVE permitir encerrar a alocação informando a data de término e o motivo, mantendo o registro no histórico e liberando a vaga. A data de término NÃO pode ser anterior à de início.

#### Scenario: Desvínculo
- **WHEN** um usuário encerra a alocação de um aluno
- **THEN** ela fica com data e motivo, sai da ocupação e continua visível no histórico

#### Scenario: Data anterior ao início
- **WHEN** a data de término é anterior à de início
- **THEN** o sistema responde 422

### Requirement: Encerramento automático por mudança do aluno
Quando um aluno com alocação ativa deixa de estar ativo (transferido ou remanejado) ou é excluído do cadastro escolar, o sistema DEVE encerrar as alocações ativas dele na data do evento, com motivo `aluno_{situacao}`.

#### Scenario: Aluno transferido
- **GIVEN** um aluno com alocação ativa
- **WHEN** a situação dele muda para `transferido`
- **THEN** a alocação é encerrada e a rota ganha uma vaga

### Requirement: Ocupação por rota
O sistema DEVE calcular, por rota, a quantidade de alocações ativas, a capacidade do veículo, o percentual de ocupação e a faixa: verde até 80 %, amarelo de 81 % a 100 % e vermelho acima de 100 %. Rota sem veículo DEVE ser "não calculável" e marcada como pendência.

#### Scenario: Ocupação parcial
- **WHEN** a rota tem 20 alunos e veículo de capacidade 40
- **THEN** a ocupação é 50 % e a faixa é verde

#### Scenario: Limite exato
- **WHEN** a rota tem 40 alunos e capacidade 40
- **THEN** a ocupação é 100 % e a faixa é amarela

#### Scenario: Superlotação
- **WHEN** a rota tem 41 alunos e capacidade 40
- **THEN** a faixa é vermelha

### Requirement: Condições do Registro 60 na alocação
A alocação DEVE guardar o atendimento curricular (padrão verdadeiro), a mediação didática (`presencial`, `semipresencial` ou `distancia`; padrão `presencial`) e o país de residência (padrão `BR`), usados pela Fase 4 para anular a declaração de transporte público.

#### Scenario: Valores padrão
- **WHEN** uma alocação é criada sem esses campos
- **THEN** ficam `true`, `presencial` e `BR`

### Requirement: Telas de alocação
O portal do Cliente DEVE mostrar, na rota, os alunos alocados (com ocupação e faixa), permitir alocar e encerrar para quem tem `transporte.alocacoes.manage` e usar um seletor de aluno que busque no cadastro escolar. Todos os componentes DEVEM vir de `@sysgov/ui`.

#### Scenario: Seletor de aluno
- **WHEN** o usuário digita parte do nome do aluno
- **THEN** a lista mostra alunos ativos do ano letivo da rota

### Requirement: Isolamento e auditoria das alocações
Alocações DEVEM respeitar o isolamento por tenant, e toda alocação, edição e encerramento DEVE ser auditado.

#### Scenario: Aluno de outro tenant
- **WHEN** a requisição aponta um aluno de outro tenant
- **THEN** o sistema responde 404
