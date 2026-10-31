## ADDED Requirements

### Requirement: Pontos de parada georreferenciados
O sistema DEVE permitir cadastrar pontos de parada com nome, endereço de referência e coordenadas opcionais, validando latitude entre -90 e 90 e longitude entre -180 e 180. Latitude e longitude DEVEM ser informadas juntas ou ficar ambas vazias.

#### Scenario: Ponto com coordenadas válidas
- **WHEN** um ponto é cadastrado com latitude -25,43 e longitude -49,27
- **THEN** ele fica disponível para compor itinerários e aparece no mapa

#### Scenario: Coordenada fora da faixa
- **WHEN** a latitude informada é 120
- **THEN** o sistema responde 422 e não cria o ponto

#### Scenario: Só uma coordenada
- **WHEN** o cadastro traz latitude e não traz longitude
- **THEN** o sistema responde 422

#### Scenario: CEP indisponível
- **WHEN** a consulta de CEP falha no navegador
- **THEN** os campos de endereço continuam editáveis e o cadastro pode ser salvo

### Requirement: Cadastro de rotas
O sistema DEVE permitir cadastrar rotas com nome, escola de destino, ano letivo, turno (`manha`, `tarde`, `noite` ou `integral`), tipo de rede, empresa, veículo e motorista opcionais, quilometragem pavimentada e não pavimentada (não negativas, 2 casas decimais) e horários de saída, chegada e retorno. O total de quilômetros DEVE ser a soma das duas extensões.

#### Scenario: Rota criada
- **WHEN** um usuário autorizado cadastra uma rota com escola, ano letivo 2026 e turno da manhã
- **THEN** a rota é criada ativa

#### Scenario: Total de quilômetros
- **WHEN** a rota informa 12,50 km pavimentados e 7,25 km não pavimentados
- **THEN** o sistema apresenta 19,75 km de total

#### Scenario: Quilometragem negativa
- **WHEN** qualquer extensão informada é negativa
- **THEN** o sistema responde 422

#### Scenario: Escola de outro tenant
- **WHEN** a rota aponta para uma escola de outro tenant
- **THEN** o sistema responde 422

### Requirement: Regularidade de empresa, veículo e motorista na rota
Ao criar ou editar uma rota, o sistema DEVE recusar com 409, indicando o item, quando a empresa tiver contrato vencido, o veículo estiver inativo ou sem vistoria válida, ou o motorista estiver inativo ou inelegível. Uma rota já gravada que ficar irregular depois NÃO deve ser alterada: ela DEVE ser exibida como irregular, com os motivos.

#### Scenario: Veículo com vistoria vencida
- **WHEN** a rota é salva com um veículo cuja vistoria venceu
- **THEN** o sistema responde 409 e indica o veículo e a data de vencimento

#### Scenario: Motorista inelegível
- **WHEN** a rota é salva com um motorista com toxicológico vencido
- **THEN** o sistema responde 409

#### Scenario: Rota que ficou irregular
- **GIVEN** uma rota regular cujo veículo teve a vistoria vencida ontem
- **WHEN** a rota é listada
- **THEN** ela aparece com o selo "irregular" e o motivo `vistoria_vencida`, sem ter sido alterada

#### Scenario: Frota própria
- **GIVEN** uma empresa `frota_propria`
- **WHEN** a rota é salva com ela
- **THEN** não há bloqueio por contrato

### Requirement: Itinerário ordenado
O sistema DEVE manter, para cada rota, uma sequência de paradas com ordem única, sem repetir a parada na mesma rota, com horários previstos de embarque e desembarque opcionais. A reordenação DEVE ser atômica.

#### Scenario: Parada adicionada ao fim
- **WHEN** uma parada é adicionada a uma rota com 3 paradas
- **THEN** ela recebe a ordem 4

#### Scenario: Parada repetida
- **WHEN** a mesma parada é adicionada duas vezes à rota
- **THEN** o sistema responde 409 e mantém o itinerário

#### Scenario: Reordenação
- **WHEN** o usuário envia a lista das paradas em nova ordem
- **THEN** a nova ordem é gravada de uma vez, sem violar a unicidade da ordem

#### Scenario: Reordenação com parada de fora
- **WHEN** a lista inclui uma parada que não pertence à rota
- **THEN** o sistema responde 422 e a ordem anterior é mantida

#### Scenario: Remoção de parada
- **WHEN** uma parada é retirada do meio do itinerário
- **THEN** as demais são renumeradas sem lacuna

### Requirement: Consulta de rotas e de paradas por rota
O sistema DEVE listar rotas com paginação, filtrando por ano letivo, escola, turno, tipo de rede e situação, devolvendo a contagem de paradas. O sistema DEVE listar as paradas de uma rota na ordem do itinerário.

#### Scenario: Filtro por ano e turno
- **WHEN** o usuário filtra por ano letivo 2026 e turno da manhã
- **THEN** o sistema devolve só as rotas correspondentes, com a contagem de paradas

#### Scenario: Paradas de rotas diferentes
- **GIVEN** duas rotas com paradas distintas
- **WHEN** as paradas de uma delas são consultadas
- **THEN** só as paradas dela aparecem, na ordem do itinerário

### Requirement: Exclusão e inativação de paradas e rotas
Parada usada em algum itinerário NÃO pode ser excluída (409); pode ser inativada. Rota só pode ser excluída se nunca teve alocação (Fase 3); caso contrário, é inativada.

#### Scenario: Parada em uso
- **WHEN** o usuário exclui uma parada que está num itinerário
- **THEN** o sistema responde 409 e sugere inativar

### Requirement: Mapa do itinerário
O portal do Cliente DEVE exibir o itinerário de uma rota em mapa, com marcadores numerados na ordem e uma linha ligando-os, e DEVE listar as paradas sem coordenadas fora do mapa, com o aviso "sem coordenada".

#### Scenario: Rota georreferenciada
- **WHEN** o usuário abre o mapa de uma rota com todas as paradas coordenadas
- **THEN** os marcadores aparecem numerados na ordem do itinerário

#### Scenario: Parada sem coordenada
- **WHEN** uma parada não tem latitude e longitude
- **THEN** ela aparece na lista lateral com o aviso e não gera marcador

### Requirement: Auditoria e permissões de paradas e rotas
Toda mutação de paradas, rotas e itinerários DEVE ser auditada, e DEVE exigir `transporte.rotas.manage`; a consulta exige `transporte.view`.

#### Scenario: Usuário sem permissão de rotas
- **GIVEN** um usuário só com `transporte.frota.manage`
- **WHEN** ele tenta criar uma rota
- **THEN** o servidor responde 403
