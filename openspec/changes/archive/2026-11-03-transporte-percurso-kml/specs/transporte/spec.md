## ADDED Requirements

### Requirement: Importar o percurso da rota de um arquivo KML
O sistema DEVE permitir importar o percurso de uma rota a partir de um arquivo KML ou KMZ, com **prévia** antes de gravar. A prévia DEVE listar as linhas do arquivo (nome, quantidade de pontos e quilômetros) e informar quantos pontos e polígonos foram ignorados. O arquivo NÃO DEVE ser guardado. O sistema DEVE recusar arquivo que não seja XML válido, que declare `DOCTYPE`, que exceda os limites de tamanho ou que não tenha nenhuma linha com ao menos dois pontos válidos. Exige `transporte.rotas.gerenciar`.

#### Scenario: Prévia de um KML com duas linhas
- **GIVEN** um KML com duas linhas e três pontos de interesse
- **WHEN** o usuário envia o arquivo para a rota
- **THEN** a prévia lista as duas linhas com pontos e km, avisa que 3 pontos foram ignorados e nada é gravado

#### Scenario: KMZ
- **GIVEN** um KMZ com um `doc.kml` dentro
- **WHEN** o usuário envia o arquivo
- **THEN** a prévia é a mesma de um KML

#### Scenario: Arquivo inseguro ou inválido
- **WHEN** o arquivo declara um `DOCTYPE` com entidade externa, não é XML ou não tem linha utilizável
- **THEN** a API responde 422 com a explicação e nada é lido além do necessário

#### Scenario: Coordenadas fora da faixa
- **GIVEN** uma linha com um par de latitude 120
- **WHEN** o usuário envia o arquivo
- **THEN** o par é descartado e a prévia avisa quantos pares foram descartados

### Requirement: Gravar o percurso e os quilômetros da rota
O sistema DEVE gravar, na confirmação, o percurso escolhido (linhas selecionadas, na ordem, com sentido opcionalmente invertido) já simplificado, **recalculando os quilômetros no servidor**. O usuário PODE aplicar o total em `km_pavimentado` e `km_nao_pavimentado`, informando a parte não pavimentada, que NÃO DEVE exceder o total. Importar de novo substitui o percurso anterior. O sistema DEVE auditar a importação e a remoção, sem guardar o conteúdo do arquivo.

#### Scenario: Aplicar os km
- **GIVEN** um traçado de 18,40 km e 6 km não pavimentados informados
- **WHEN** o usuário confirma aplicando os km
- **THEN** a rota fica com 12,40 km pavimentados e 6,00 km não pavimentados e a auditoria registra o antes e o depois

#### Scenario: Não aplicar os km
- **WHEN** o usuário confirma sem aplicar os km
- **THEN** o percurso é gravado e os km digitados da rota não mudam

#### Scenario: Não pavimentado maior que o total
- **GIVEN** um traçado de 10 km
- **WHEN** o usuário informa 12 km não pavimentados
- **THEN** a API responde 422

#### Scenario: Valor do cliente não é confiável
- **WHEN** a confirmação traz coordenadas
- **THEN** os km gravados são os calculados pelo servidor a partir delas

#### Scenario: Rota de outro tenant
- **WHEN** um usuário tenta importar o percurso de uma rota de outro tenant
- **THEN** a API responde 404

### Requirement: Ver o percurso no mapa
O mapa do itinerário DEVE desenhar o percurso importado, quando existir, distinto da linha reta entre paradas. A lista de rotas DEVE indicar quais rotas têm percurso e os km dele. Ver exige `transporte.view`.

#### Scenario: Rota com percurso
- **GIVEN** uma rota com percurso importado
- **WHEN** o usuário abre o itinerário e mapa
- **THEN** o traçado aparece no mapa

#### Scenario: Remover o percurso
- **WHEN** o usuário remove o percurso
- **THEN** a linha some do mapa, os km digitados da rota continuam e a remoção é auditada
