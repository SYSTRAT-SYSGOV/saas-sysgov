# Spec: Fila de Espera Transparente e Convocação

## Purpose

Ordenação auditável e classificação de inscritos na fila de espera por escola e etapa de ensino, portal de transparência com mascaramento de dados (Lei 14.685/2023), convocação nominal e conversão em matrícula.

## Requirements

### Requirement: Motor de Classificação e Desempate da Fila de Espera
O sistema DEVE (SHALL) calcular a pontuação total e posicionar cada candidato na fila de espera de cada unidade pretendida conforme critérios objetivos de prioridade legal e municipal.

#### Scenario: Prioridade máxima para crianças com deficiência (LBI/ECA)
- **WHEN** uma solicitação comprova condição de deficiência (PcD) ou medida protetiva judicial
- **THEN** o sistema posiciona o candidato no topo do grupo prioritário da etapa pretendida

#### Scenario: Critérios objetivos de desempate
- **WHEN** dois ou mais candidatos atingem a mesma pontuação socioeconômica
- **THEN** o sistema aplica como primeiro critério de desempate o menor rendimento familiar per capita, seguido pela proximidade da residência e ordem cronológica de inscrição

### Requirement: Transparência Pública da Lista de Espera (Lei 14.685/2023)
O sistema DEVE (SHALL) disponibilizar lista de espera pública e pesquisável com número de protocolo, data de inscrição, escola pretendida, pontuação e posição na fila, mascarando nome e documento do menor em obediência à LGPD.

#### Scenario: Consulta pública por protocolo
- **WHEN** a família digita o número de protocolo no portal da transparência escolar
- **THEN** o sistema informa a posição atualizada na fila, data de última movimentação e total de inscritos na etapa

### Requirement: Convocação Nominal e Efetivação de Matrícula
O sistema DEVE (SHALL) gerenciar o ciclo de convocação de candidatos habilitados com controle de prazo de comparecimento (SLA) e opção de deferimento direto com conversão em matrícula escolar ativa.

#### Scenario: Convocação de candidato na liberação de vaga
- **WHEN** uma vaga torna-se remanescente na escola
- **THEN** o sistema convoca o primeiro colocado da lista, altera o status para `convocado` e inicia a contagem do prazo limite de resposta

#### Scenario: Conversão automática em matrícula ativa
- **WHEN** a documentação do candidato convocado é deferida pela secretaria escolar
- **THEN** o sistema cria o registro oficial em `EducaEnrollment` com vínculo à turma, baixa na fila de espera e trilha de auditoria
