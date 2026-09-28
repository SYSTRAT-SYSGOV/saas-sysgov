# Spec Delta

## Purpose

Prover ferramentas de análise estatística e amostragem para a Comissão CAPD, permitindo a auditoria de avaliações e a detecção de vieses (como a leniência) de forma sistemática.

## ADDED Requirements

### Requirement: Amostragem Aleatória de Avaliações
O sistema SHALL permitir que a Comissão CAPD selecione uma porcentagem aleatória de avaliações de cada ciclo para auditoria detalhada.

#### Scenario: Geração de amostra para auditoria
- **WHEN** a Comissão define a taxa de amostragem (ex: 10%) e o ciclo
- **THEN** o sistema seleciona aleatoriamente as avaliações e gera uma lista de trabalho para os relatores da comissão

### Requirement: Dashboard de Distribuição de Notas
O sistema SHALL exibir a distribuição de notas por fator e por unidade organizacional, comparando a média do servidor com a média da sua unidade.

#### Scenario: Análise de leniência
- **WHEN** o auditor visualiza o dashboard de distribuição
- **THEN** o sistema destaca unidades ou avaliadores com desvio padrão anormalmente baixo ou médias excessivamente altas (Grade 5 predominante)

### Requirement: Relatório de Consistência CIT
O sistema SHALL gerar um relatório que correlaciona a nota final com a quantidade e a qualidade dos Incidentes Críticos registrados no Diário de Bordo.

#### Scenario: Identificação de notas sem evidência
- **WHEN** o auditor filtra avaliações com nota 5
- **THEN** o sistema lista as avaliações que não possuem incidentes críticos vinculados, sinalizando a necessidade de revisão pela comissão
