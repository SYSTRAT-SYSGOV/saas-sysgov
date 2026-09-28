# Spec Delta

## Purpose

Implementa o ciclo de vida jurídico completo da concessão de uso de jazigo em cemitério municipal, incluindo máquina de estados com transições auditadas, distinção entre concessões perpétuas e temporárias, sucessão hereditária, transferência inter vivos, caducidade, taxa de manutenção e integração financeira.

## ADDED Requirements

### Requirement: Tipos de concessão
O sistema SHALL distinguir concessão perpétua (prazo indeterminado) e temporária (prazo fixo parametrizável), com regras e prazos próprios por tipo.

#### Scenario: Criar concessão temporária
- **WHEN** um usuário com cemiterios.concessoes.manage cria uma concessão temporária em um jazigo disponível
- **THEN** a concessão nasce Ativa com data_fim calculada pelo prazo configurado e o jazigo passa a Concedido

#### Scenario: Criar concessão perpétua
- **WHEN** um usuário com cemiterios.concessoes.manage cria uma concessão perpétua em um jazigo disponível
- **THEN** a concessão nasce Ativa com data_fim nula e o jazigo passa a Concedido

### Requirement: Máquina de estados
O sistema SHALL manter a concessão em uma máquina de estados (Solicitada, Ativa, Vencendo, Vencida, Caduca, Revertida, Sucedida, Transferida, Negada) e grava toda transição em histórico append-only com usuário e motivo.

#### Scenario: Transição de Solicitada para Ativa
- **WHEN** uma concessão nova é aprovada pelo responsável
- **THEN** o sistema altera o estado de Solicitada para Ativa e registra a transição no histórico com o usuário e motivo

#### Scenario: Reversão de temporária vencida
- **WHEN** uma concessão temporária vence e o concessionário não manifesta no prazo configurado
- **THEN** a concessão transita Vencida → Caduca → Revertida e o jazigo volta a Disponivel após a exumação

#### Scenario: Transferência de concessão
- **WHEN** uma concessão é transferida para outro concessionário com permissão legal
- **THEN** o sistema altera o estado para Transferida e registra a transição no histórico

#### Scenario: Sucessão hereditária
- **WHEN** o titular de uma concessão falece e herdeiros são registrados com titular indicado
- **THEN** o sistema altera o estado para Sucedida e registra a transição no histórico

### Requirement: Sucessão hereditária
O sistema SHALL permitir a sucessão causa mortis, registrando herdeiros e indicando o titular, e transita a concessão para Sucedida.

#### Scenario: Suceder titular falecido
- **WHEN** o titular falece e os herdeiros são registrados com titular_indicado
- **THEN** a concessão transita para Sucedida e o titular indicado assume

#### Scenario: Registro de herdeiros na sucessão
- **WHEN** um usuário registra herdeiros para uma concessão cujo titular faleceu
- **THEN** o sistema armazena os herdeiros com nome, parentesco, documento e marca o titular indicado

### Requirement: Transferência inter vivos
O sistema SHALL permitir transferência inter vivos apenas quando a base legal municipal permitir, e bloqueia caso contrário.

#### Scenario: Transferência não permitida
- **WHEN** a lei municipal veda transferência inter vivos
- **THEN** o sistema bloqueia a operação com mensagem e registra a tentativa

#### Scenario: Transferência permitida
- **WHEN** a lei municipal permite transferência inter vivos e todos os requisitos são atendidos
- **THEN** o sistema permite a transferência e atualiza o concessionário da concessão

### Requirement: Caducidade e revogação
O sistema SHALL registrar caducidade/revogação com motivo e processo de referência, com auditoria.

#### Scenario: Caducidade por abandono
- **WHEN** uma concessão é declarada caduca por abandono do concessionário
- **THEN** o sistema registra a transição para Caduca com motivo e processo de referência no histórico

#### Scenario: Revogação por descumprimento
- **WHEN** uma concessão é revogada por descumprimento de cláusulas contratuais
- **THEN** o sistema registra a transição para Caduca com motivo e processo de referência no histórico

### Requirement: Taxa anual de manutenção
O sistema SHALL gerar a taxa anual de manutenção vinculada à concessão e integra ao módulo financeiro via outbox.

#### Scenario: Gerar guia de manutenção
- **WHEN** a taxa anual vence para uma concessão ativa
- **THEN** o sistema dispara evento de outbox que gera a guia/DAM no financeiro e o status de pagamento aparece na concessão

#### Scenario: Isenção de taxa de manutenção
- **WHEN** uma concessão é gratuita conforme a legislação municipal
- **THEN** o sistema não gera guia de manutenção anual para essa concessão

### Requirement: Registro geral e regularização
O sistema SHALL manter registro geral numerado de concessões e suporta regularização de uso (transferência, sucessão, inclusão de titular).

#### Scenario: Número sequencial no registro geral
- **WHEN** uma nova concessão é criada
- **THEN** o sistema atribui o próximo número sequencial disponível no registro geral numerado

#### Scenario: Regularização por transferência
- **WHEN** ocorre transferência inter vivos de uma concessão
- **THEN** o sistema atualiza o registro geral numerado refletindo a mudança de concessionário

### Requirement: Notificações de vencimento
O sistema SHALL notificar o concessionário no prazo de manifestação configurado antes da caducidade.

#### Scenario: Concessão vencendo
- **WHEN** uma concessão temporária entra em Vencendo (fim do prazo)
- **THEN** o sistema dispara notificação com o prazo de manifestação

#### Scenario: Não notificar perpétua
- **WHEN** uma concessão perpétua está ativa
- **THEN** o sistema não dispara notificação de vencimento

### Requirement: Documentos e auditoria
O sistema SHALL armazenar documentos digitalizados (termo, escritura, inventário) com hash e mantém histórico append-only acessível.

#### Scenario: Upload de documento de concessão
- **WHEN** um usuário faz upload do termo de concessão para uma concessão
- **THEN** o sistema armazena o arquivo com hash calculado e associa à concessão, disponível para download posterior

#### Scenario: Consulta de histórico de concessão
- **WHEN** um usuário consulta o histórico de uma concessão
- **THEN** o sistema retorna todas as transições de estado em ordem cronológica com usuário e motivo