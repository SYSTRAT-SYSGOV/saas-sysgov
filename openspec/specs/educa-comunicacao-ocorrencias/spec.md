# educa-comunicacao-ocorrencias Specification

## Purpose
Gerencia o registro, encaminhamento e notificação formal de ocorrências pedagógicas, disciplinares e elogios de conduta dos estudantes com ciência dos responsáveis legais.

## Requirements

### Requirement: Registrar ocorrência disciplinar ou pedagógica
O sistema DEVE permitir que a equipe escolar registre ocorrências com tipologia (disciplinar, pedagógica, saúde, elogio), gravidade, relato dos fatos e estudante matriculado. (MUST)

#### Scenario: Registro de ocorrência disciplinar
- **WHEN** o orientador ou coordenador submete nova ocorrência vinculada a uma matrícula ativa
- **THEN** a ocorrência é gravada com status aberta e numeração sequencial auditável

#### Scenario: Bloqueio para estudante inativo
- **WHEN** o operador tenta lançar ocorrência para aluno sem matrícula ativa
- **THEN** o sistema rejeita a operação com código 422 informando a invalidade da matrícula

### Requirement: Vincular providências e despachos
O sistema DEVE permitir adicionar providências tomadas, medidas pedagógicas aplicadas e convocação presencial de responsáveis. (MUST)

#### Scenario: Despacho com convocação dos responsáveis
- **WHEN** o gestor adiciona providência com solicitação de comparecimento presencial
- **THEN** a ocorrência é atualizada e gera evento para notificação imediata aos responsáveis

### Requirement: Registro de ciência do responsável legal
O sistema DEVE possibilitar o registro de ciência formal do responsável cadastrado no MDM de Pessoas, presencialmente ou por confirmação digital. (MUST)

#### Scenario: Confirmação de ciência registrada
- **WHEN** o responsável legal toma ciência da ocorrência
- **THEN** o status da ocorrência transiciona para cientificada com carimbo temporal
