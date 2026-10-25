## ADDED Requirements

### Requirement: Calendário por escola e da rede
O sistema SHALL manter um calendário por escola e ano, e um calendário padrão da rede (`school_id` nulo) criado pela Secretaria, com unicidade `(tenant_id, ano, school_id)`. Calendário de escola SHALL exigir ano letivo com etapas datadas.

#### Scenario: Escola sem etapas datadas
- **WHEN** é criado o calendário de uma escola sem etapas datadas no ano
- **THEN** a resposta é 422 informando que as datas de início e término não estão definidas

### Requirement: Dia letivo por data
O sistema SHALL identificar cada dia por data ISO única no calendário, considerando letivos os dias de segunda a sexta dentro do período do ano letivo sem motivo não letivo, mais os dias marcados com motivo letivo extra (ex.: sábado letivo). Datas fora do período SHALL ser recusadas.

#### Scenario: Feriado
- **WHEN** um dia é marcado com motivo `holiday` e `is_school_day=false`
- **THEN** o dia deixa de ser letivo e os totais são recalculados na mesma operação

### Requirement: Publicação com mínimos da LDB
O sistema SHALL recusar a publicação do calendário com menos de 200 dias letivos ou menos de 800 horas, respondendo 422 com `code=LDB_MINIMUM_NOT_MET` e diagnóstico de dias e horas faltantes com sugestões. As horas SHALL ser calculadas pela carga diária do calendário, sobrescrevível por dia.

#### Scenario: 199 dias letivos
- **WHEN** a publicação é tentada com 199 dias letivos e 800 horas
- **THEN** a publicação é recusada e o diagnóstico informa que falta 1 dia

#### Scenario: Mínimos atendidos
- **WHEN** a publicação é tentada com 200 dias letivos e 800,00 horas
- **THEN** o calendário passa a `published`

### Requirement: Importação do calendário da rede
O sistema SHALL permitir copiar de forma atômica os dias e feriados do calendário padrão da rede publicado para um calendário de escola em `draft`, marcando a origem como `rede` e permitindo dias próprios da escola.

#### Scenario: Falha na importação
- **WHEN** a importação falha no meio do processamento
- **THEN** nenhum dia da rede permanece no calendário da escola

### Requirement: Dia não letivo bloqueia frequência
Com o submódulo `educa.pedagogico` ativo, o sistema SHALL recusar o registro de frequência em dia sem `is_school_day` no calendário publicado.

#### Scenario: Frequência em feriado
- **WHEN** o professor registra frequência em dia marcado como feriado
- **THEN** a gravação é recusada com "Data não letiva segundo o Calendário Escolar vigente"
