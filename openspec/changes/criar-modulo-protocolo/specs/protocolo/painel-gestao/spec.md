# Spec Delta

## Purpose

Define os indicadores gerenciais do Protocolo — distribuição de processos por secretaria/órgão, status e origem, e tempos médios de tramitação e permanência — para apoio à gestão e à transparência.

## ADDED Requirements

### Requirement: Dashboard de processos por secretaria/órgão
O sistema SHALL fornecer, a usuários com `protocolo.processos.relatorios`, um dashboard com a contagem de processos por órgão atual, por status e por origem, filtrável por período de abertura e restrito ao tenant e ao escopo organizacional do usuário.

#### Scenario: Dashboard por secretaria
- **WHEN** um gestor consulta o dashboard do ano corrente
- **THEN** o sistema retorna a distribuição de processos por órgão, por status (`aberto`, `em_tramitacao`, `aguardando`, `concluido`, `arquivado`) e por origem (`externa`, `interna`)

#### Scenario: Escopo do gestor
- **WHEN** um gestor com escopo restrito à Secretaria de Saúde consulta o dashboard
- **THEN** somente processos dessa secretaria (e suas subunidades) são contabilizados

#### Scenario: Sem permissão de relatórios
- **WHEN** um usuário sem `protocolo.processos.relatorios` consulta o dashboard
- **THEN** o sistema responde HTTP 403

### Requirement: Tempo médio de tramitação e permanência
O sistema SHALL calcular o tempo médio de tramitação dos processos concluídos no período (`data_conclusao − data_abertura`) e o tempo médio de permanência por órgão (média de `data_envio − data_recebimento` dos andamentos encerrados).

#### Scenario: Tempo médio de tramitação
- **WHEN** um gestor consulta o dashboard de um período com processos concluídos
- **THEN** o sistema retorna o tempo médio de tramitação geral e o tempo médio de permanência de cada órgão

#### Scenario: Período sem processos concluídos
- **WHEN** não há processos concluídos no período
- **THEN** o tempo médio de tramitação é retornado como indisponível, sem erro

### Requirement: Indicador de prazos excedidos no dashboard
O sistema SHALL exibir no dashboard a quantidade de processos com prazo excedido por órgão.

#### Scenario: Contador de atrasos por órgão
- **WHEN** um gestor consulta o dashboard e há processos com prazo excedido
- **THEN** o sistema retorna, por órgão, a quantidade de processos com prazo excedido
