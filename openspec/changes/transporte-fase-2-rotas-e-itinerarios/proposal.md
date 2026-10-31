# Proposal

## Why

Com a frota cadastrada (Fase 1), o transporte escolar precisa descrever **por onde** cada veículo passa: os pontos de parada, as rotas por ano letivo e turno, a ordem do itinerário e a quilometragem. Esses dados são a base da alocação de alunos (Fase 3) e do Registro 60 (Fase 4). O legado i-Educar não guardava a ordem das paradas nem validava a regularidade do veículo e do motorista na rota.

## What Changes

- **Paradas** georreferenciadas: nome, endereço (CEP preenchido no navegador), referência e coordenadas validadas (latitude -90 a 90, longitude -180 a 180).
- **Rotas**: nome, escola de destino (`escola_escolas`), ano letivo, turno, tipo de rede, empresa, veículo, motorista, quilometragem pavimentada e não pavimentada (total calculado), horários e marca de terceirizada.
- **Itinerário ordenado**: paradas com ordem única na rota, sem repetir a parada, com horários previstos de embarque e desembarque, e reordenação atômica.
- **Regularidade na rota**: a rota só aceita empresa com contrato vigente, veículo ativo com vistoria válida e motorista elegível; uma rota que ficou irregular depois é sinalizada.
- **Consulta de rotas** com filtros por ano letivo, escola, turno, tipo de rede e situação, devolvendo a contagem de paradas.
- **Frontend**: telas Paradas e Rotas (com editor do itinerário) e **mapa Leaflet** do itinerário, com marcadores numerados e lista das paradas sem coordenadas.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta paradas, rotas, itinerário, regularidade da rota e mapa.

## Impact

- **Backend**: novas tabelas `transporte_paradas`, `transporte_rotas`, `transporte_rota_paradas`; novos Services, Policy e rotas. Lê `escola_escolas` e `escola_turmas` (ano letivo) do módulo Escola, sem alterá-lo.
- **Frontend**: duas abas novas e o mapa (react-leaflet já está no `web-client`).
- **Depende da Fase 1** mesclada. A ocupação da rota (alunos × capacidade) só existe na Fase 3.
- A escola de destino **não tem coordenadas** no cadastro escolar; o mapa mostra a escola como legenda, não como marcador (ver `design.md`).
