# Spec Delta: Áreas Protegidas

## Purpose

Cadastro georreferenciado de Áreas de Preservação Permanente (APP), reservas legais e unidades de
conservação municipais, com consulta em mapa interativo e identificação de sobreposição com imóveis
cadastrados.

## ADDED Requirements

### Requirement: Cadastro georreferenciado de área protegida
<!-- entities: AreaProtegida -->

O sistema SHALL permitir o cadastro de áreas protegidas classificadas como Área de Preservação Permanente
(APP), Reserva Legal ou Unidade de Conservação (incluindo parques e Reservas Particulares do Patrimônio
Natural — RPPN), com geometria georreferenciada (polígono) e ato legal de criação, quando aplicável.

#### Scenario: Cadastro de unidade de conservação municipal
- **GIVEN** um usuário com permissão `meio_ambiente.areas_protegidas.manage`
- **WHEN** `cadastrarAreaProtegida()` recebe `tipo = 'unidade_conservacao'`, `subtipo = 'parque_municipal'`, geometria de polígono válida e `ato_legal = 'Lei Municipal 1234/2020'`
- **THEN** a área protegida é persistida com sua geometria e vinculada ao `tenant_id` do contexto atual

#### Scenario: Geometria inválida é rejeitada
- **WHEN** `cadastrarAreaProtegida()` recebe uma geometria de polígono malformada (vértices insuficientes)
- **THEN** lança `DomainException` "Geometria da área protegida inválida" e o controller responde HTTP 422

### Requirement: Sobreposição com imóveis e empreendimentos
<!-- entities: AreaProtegida, Empreendimento -->

O sistema SHALL identificar quando a geometria de um empreendimento ou imóvel cadastrado se sobrepõe,
total ou parcialmente, à geometria de uma área protegida, sinalizando o conflito nas consultas do
empreendimento.

#### Scenario: Empreendimento com sobreposição a APP é sinalizado
- **GIVEN** uma APP cadastrada cuja geometria contém parte do território de um empreendimento
- **WHEN** `verificarSobreposicao()` é chamado para esse empreendimento
- **THEN** retorna a lista de áreas protegidas sobrepostas, incluindo a APP identificada, e o empreendimento passa a exibir o alerta de sobreposição em sua consulta

### Requirement: Consulta em mapa interativo
<!-- entities: AreaProtegida -->

O sistema SHALL disponibilizar a consulta de áreas protegidas em mapa interativo, com filtro por tipo
(APP, reserva legal, unidade de conservação) e sobreposição visual com a camada de empreendimentos
cadastrados.

#### Scenario: Consulta filtrando apenas reservas legais
- **GIVEN** 3 áreas protegidas cadastradas, sendo 1 reserva legal e 2 APPs
- **WHEN** `listarParaMapa()` é chamado com filtro `tipo = 'reserva_legal'`
- **THEN** retorna um GeoJSON contendo apenas a reserva legal cadastrada
