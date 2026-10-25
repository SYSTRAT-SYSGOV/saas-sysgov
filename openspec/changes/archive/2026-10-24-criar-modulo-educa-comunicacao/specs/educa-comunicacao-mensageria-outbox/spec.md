# Spec Delta: Mensageria e Notificações via Outbox Pattern

## Purpose

Controla o disparo transacional, enfileiramento e rastreabilidade de notificações escolares para pais e responsáveis via canais externos utilizando o padrão Outbox.

## ADDED Requirements

### Requirement: Publicação transacional de mensagens no Outbox
O sistema DEVE gravar eventos de mensageria na tabela de outbox na mesma transação da mutação de negócio, prevenindo perdas ou chamadas síncronas a APIs externas. (MUST)

#### Scenario: Enfileiramento de notificação de falta
- **WHEN** o diário de classe consolida faltas consecutivas do estudante
- **THEN** o sistema publica evento do tipo educa.comunicacao.falta na outbox para envio assíncrono

### Requirement: Suporte multicanal e formatação de mensagem
O sistema DEVE permitir direcionar notificações para canais configurados (WhatsApp/Webhook, SMS, E-mail) formatando o texto com dados institucionais do tenant. (MUST)

#### Scenario: Notificação urgente de ocorrência
- **WHEN** uma ocorrência grave ou convocação de responsáveis é registrada
- **THEN** a notificação é gerada com prioridade alta direcionada aos contatos dos guardiões legais

### Requirement: Rastreabilidade e re-tentativas com backoff
O sistema DEVE registrar tentativas de envio, status de entrega, mensagens de retorno de provedores e política de novas tentativas automáticas com tolerância a falhas. (MUST)

#### Scenario: Falha temporária no provedor de envio
- **WHEN** o gateway de mensageria retorna indisponibilidade temporária
- **THEN** o evento permanece na fila para re-tentativa com backoff exponencial sem perda de dados
