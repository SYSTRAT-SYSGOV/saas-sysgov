# Spec Delta

## Purpose

Define a tramitação de processos entre órgãos com histórico imutável, andamento atual único, controle de recebimento e envio, tempo de permanência, localização em tempo real, prazos excedidos e tipos de tramitação configuráveis por tenant.

## ADDED Requirements

### Requirement: Registro de andamento e movimentação do processo
O sistema SHALL, ao registrar um andamento de encaminhamento, atualizar o órgão atual do processo para o órgão de destino, gravar o andamento com sequência crescente, apontar `ultimo_andamento_id` para ele e torná-lo o único andamento com `and_atual=true`.

#### Scenario: Tramitação entre órgãos
- **WHEN** um usuário com `protocolo.processos.tramitar` encaminha um processo da Secretaria de Obras para a Procuradoria
- **THEN** `orgao_atual_id` passa a ser a Procuradoria, o novo andamento é registrado no histórico com a próxima sequência, `ultimo_andamento_id` aponta para ele, ele passa a ter `and_atual=true` e o andamento anterior recebe `data_envio` e `and_atual=false`

#### Scenario: Andamento atual único
- **WHEN** duas tramitações do mesmo processo são submetidas simultaneamente
- **THEN** apenas uma é efetivada e o processo continua com exatamente um andamento com `and_atual=true`; a outra recebe erro de conflito (HTTP 409)

#### Scenario: Tramitação apenas pelo órgão detentor
- **WHEN** um usuário que não pertence ao órgão atual do processo (e sem permissão de tramitação global) tenta encaminhá-lo
- **THEN** o sistema responde HTTP 403 e o processo não se move

#### Scenario: Processo encerrado não tramita
- **WHEN** um usuário tenta tramitar um processo com status `concluido` ou `arquivado` sem um tipo de tramitação de reabertura
- **THEN** o sistema rejeita a operação com erro de validação

### Requirement: Histórico de andamentos imutável
O sistema SHALL manter os andamentos registrados imutáveis: não é permitido editar descrição, órgãos, tipo ou usuário, nem excluir andamentos; apenas `data_recebimento` e `data_envio` podem ser preenchidas uma única vez pelo fluxo de recebimento e envio.

#### Scenario: Tentativa de edição de andamento
- **WHEN** um usuário tenta alterar a descrição ou excluir um andamento já registrado
- **THEN** o sistema rejeita a operação e o andamento permanece inalterado

#### Scenario: Datas preenchidas uma única vez
- **WHEN** um andamento já possui `data_recebimento` e uma nova confirmação de recebimento é enviada
- **THEN** o sistema rejeita a operação e mantém a data original

### Requirement: Registro de recebimento
O sistema SHALL permitir que um usuário do órgão de destino confirme o recebimento do andamento atual, gravando `data_recebimento` e o usuário recebedor.

#### Scenario: Confirmação de recebimento
- **WHEN** um usuário da Procuradoria confirma o recebimento de um processo encaminhado a ela
- **THEN** o andamento atual registra `data_recebimento` com o instante da confirmação e o usuário recebedor

#### Scenario: Recebimento por órgão diferente do destino
- **WHEN** um usuário de outro órgão tenta confirmar o recebimento
- **THEN** o sistema responde HTTP 403

### Requirement: Tempo de permanência por órgão e usuário
O sistema SHALL calcular o tempo de permanência de cada andamento como `data_envio − data_recebimento` e, para o andamento atual sem `data_envio`, indicar que o processo está em posse, com tempo em aberto contado até o momento da consulta.

#### Scenario: Tempo de permanência
- **WHEN** um processo é recebido por um usuário em 01/03 às 09:00 e encaminhado em 03/03 às 15:00
- **THEN** o sistema reporta para aquele andamento a permanência de 2 dias e 6 horas, associada ao órgão e ao usuário

#### Scenario: Processo em posse
- **WHEN** o andamento atual tem `and_atual=true`, `data_recebimento` preenchida e `data_envio` nula
- **THEN** o sistema indica que o processo está em posse do órgão/usuário, com tempo em aberto desde o recebimento

#### Scenario: Aguardando recebimento
- **WHEN** o andamento atual ainda não tem `data_recebimento`
- **THEN** o sistema indica que o processo está em trânsito, aguardando recebimento pelo órgão de destino

### Requirement: Consulta de localização e status
O sistema SHALL fornecer consulta de localização que retorna, a partir do andamento com `and_atual=true`, o órgão e o usuário atuais e a situação (em trânsito ou em posse), além do status derivado do último andamento.

#### Scenario: Consulta de localização
- **WHEN** um usuário com `protocolo.processos.rastrear` consulta a localização de um processo
- **THEN** o sistema retorna o órgão atual, o usuário atual (se recebido), a situação, o status do processo e o instante da última movimentação

### Requirement: Status derivado do tipo de tramitação
O sistema SHALL atualizar o status do processo (`aberto`, `em_tramitacao`, `aguardando`, `concluido`, `arquivado`) conforme o efeito de status configurado no tipo de tramitação do andamento registrado, preenchendo `data_conclusao` quando o status resultante for `concluido`.

#### Scenario: Conclusão do processo
- **WHEN** um andamento do tipo `conclusao` é registrado
- **THEN** o status do processo passa a `concluido` e `data_conclusao` é preenchida

#### Scenario: Tipo sem efeito de status
- **WHEN** um andamento de um tipo sem efeito de status configurado é registrado em processo `aberto`
- **THEN** o status passa a `em_tramitacao`

### Requirement: Alerta de prazos excedidos
O sistema SHALL identificar andamentos atuais cujo tempo desde o recebimento (ou desde o envio, se ainda não recebido) excede o prazo configurado para o tipo de tramitação, listando-os por órgão e usuário.

#### Scenario: Prazo excedido
- **WHEN** um processo está em posse de um órgão há 12 dias e o prazo do tipo de tramitação é 10 dias
- **THEN** o processo aparece na lista de prazos excedidos do órgão, com o usuário responsável e os dias de atraso

#### Scenario: Tipo sem prazo
- **WHEN** o tipo de tramitação do andamento atual não possui prazo configurado
- **THEN** o andamento não é considerado na verificação de prazos

### Requirement: Tipos de tramitação configuráveis por tenant
O sistema SHALL permitir que usuários com `protocolo.tipos_tramitacao.manage` criem, editem, ativem/desativem e excluam tipos de tramitação do próprio tenant, com slug único por tenant, e semear os tipos iniciais `entrada`, `despacho`, `aprovacao`, `encaminhamento`, `parecer` e `conclusao`.

#### Scenario: Tipos configuráveis
- **WHEN** um administrador cria o tipo `diligencia`
- **THEN** o tipo fica disponível para novos andamentos apenas no seu tenant

#### Scenario: Tipo já utilizado não é excluído fisicamente
- **WHEN** um administrador exclui um tipo que já foi usado em andamentos
- **THEN** o sistema aplica soft delete, o tipo deixa de ser oferecido para novos andamentos e os andamentos históricos continuam exibindo o nome do tipo

#### Scenario: Tipo inativo não aceito
- **WHEN** um andamento é submetido com tipo inativo ou excluído
- **THEN** o sistema rejeita a requisição com erro de validação

#### Scenario: Seed inicial por tenant
- **WHEN** o módulo Protocolo é habilitado para um tenant
- **THEN** os seis tipos iniciais existem e estão ativos para esse tenant
