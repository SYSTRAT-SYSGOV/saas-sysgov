# Spec Delta: Avisos e Circulares Oficiais

## Purpose

Permite publicar murais, comunicados e circulares oficiais da escola e rede com segmentação de público-alvo, vigência e confirmação de leitura pelos responsáveis.

## ADDED Requirements

### Requirement: Publicar comunicado escolar segmentado
O sistema DEVE permitir que gestores publiquem comunicados com título, conteúdo, nível de urgência, prazo de expiração e público-alvo (rede, escola, curso ou turma). (MUST)

#### Scenario: Publicação com sucesso para turmas específicas
- **WHEN** o gestor envia requisição com título, mensagem, escola e lista de turmas de destino
- **THEN** o comunicado é registrado com status publicado e vinculado aos públicos-alvo informados

#### Scenario: Rejeição de comunicado sem público-alvo
- **WHEN** o operador tenta criar comunicado sem selecionar ao menos um público-alvo
- **THEN** o sistema rejeita com código 422 informando a obrigatoriedade do destino

### Requirement: Registrar leitura e ciência de avisos
O sistema DEVE registrar individualmente a leitura do comunicado pelo usuário ou responsável legal, armazenando carimbo de data/hora e identificador. (MUST)

#### Scenario: Confirmação de leitura pelo responsável
- **WHEN** o responsável acessa o comunicado oficial e confirma ciência
- **THEN** o sistema registra o registro de leitura evitando duplicidade

### Requirement: Filtrar avisos ativos e vigentes
O sistema DEVE disponibilizar consulta filtrada por escola, turma e período, ocultando comunicados expirados para o público geral. (MUST)

#### Scenario: Consulta de comunicados válidos
- **WHEN** o usuário requisita a lista de avisos da escola
- **THEN** o sistema retorna apenas comunicados com prazo de vigência ativo para o seu escopo
