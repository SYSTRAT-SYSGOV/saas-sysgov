# Spec Delta

## Purpose

Implementação de gatilhos automáticos e sistema de notificações para a gestão de ciclos avaliativos, reduzindo a carga operacional do RH e garantindo a tempestividade do processo.

## ADDED Requirements

### Requirement: Notificação de Abertura de Ciclo
O sistema SHALL enviar notificações automáticas (e-mail e sistema) para todos os avaliadores e avaliados quando um novo ciclo for aberto.

#### Scenario: Notificação de início
- **WHEN** o Gestor de RH altera o status do ciclo para "Aberto"
- **THEN** o sistema dispara notificações individuais para cada servidor vinculado ao ciclo, informando o prazo de preenchimento

### Requirement: Alertas de Prazo (Reminder)
O sistema SHALL disparar alertas preventivos quando a data de término de uma etapa do ciclo estiver próxima.

#### Scenario: Alerta de 5 dias para o término
- **WHEN** faltarem 5 dias úteis para o encerramento da etapa de autoavaliação
- **THEN** o sistema notifica apenas os servidores que ainda não submeteram sua avaliação

### Requirement: Gatilho de Mudança de Etapa
O sistema SHALL permitir a transição automática de etapas (ex: Autoavaliação $\to$ Avaliação da Chefia) após a data limite, independentemente de submissões pendentes.

#### Scenario: Transição automática de etapa
- **WHEN** a data limite da etapa de autoavaliação é atingida
- **THEN** o sistema altera o status do ciclo para "Em Avaliação da Chefia" e notifica as chefias imediatas
