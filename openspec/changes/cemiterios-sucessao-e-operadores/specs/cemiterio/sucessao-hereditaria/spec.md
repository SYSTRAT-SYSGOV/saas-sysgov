# Spec: Regularização de Sucessão Hereditária

## ADDED Requirements

### Requirement: Tramitação de Processo de Sucessão Hereditária
O sistema DEVE permitir a autuação de processo administrativo para transferência de concessão de jazigo cujo titular original esteja falecido, associando o número do processo, tipo de documento judicial/notarial e motivo legal.

#### Scenario: Autuação de processo com titular falecido
- **WHEN** um operador municipal seleciona uma concessão com titular falecido e inicia o processo informando o número dos autos e anexando a certidão de óbito ou inventário
- **THEN** o sistema cria o registro de processo de sucessão com status `em_analise`, mantendo a concessão bloqueada preventivamente para sepultamentos de terceiros até conclusão definitiva.

### Requirement: Cadastro e Qualificação de Herdeiros
O sistema DEVE permitir o cadastramento de um ou múltiplos herdeiros legítimos ou testamentários, com CPF/documento de identificação, grau de parentesco, dados de contato e indicação do herdeiro que figurará como titular representante da concessão.

#### Scenario: Cadastro de múltiplos herdeiros e indicação de representante
- **WHEN** o operador cadastra os herdeiros informando parentesco e assinala um herdeiro como titular representante
- **THEN** o sistema valida a unicidade do titular representante para o processo e registra os demais herdeiros como anuentes/interessados qualificados.

### Requirement: Deferimento e Emissão de Termo de Transferência
O sistema DEVE permitir o deferimento do processo administrativo mediante despacho fundamentado, transferindo formalmente a titularidade da concessão para o novo titular representante e destravando o jazigo.

#### Scenario: Deferimento e liberação da trava de sepultamento
- **WHEN** o administrador defere o processo de sucessão
- **THEN** o sistema atualiza o `holder_id` da concessão para o novo titular, define `pendencia_regularizacao = false`, gera o Termo Oficial de Transferência de Concessão com numeração sequencial auditável e registra o evento na trilha de auditoria.
