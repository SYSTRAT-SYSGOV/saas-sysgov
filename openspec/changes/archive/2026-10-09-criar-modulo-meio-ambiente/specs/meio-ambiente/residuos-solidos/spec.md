# Spec Delta: Gestão de Resíduos Sólidos

## Purpose

Cadastro de geradores de resíduos sólidos e controle de coleta regular, coleta seletiva e logística
reversa, com registro de volumes coletados e destinação final.

## ADDED Requirements

### Requirement: Cadastro de gerador de resíduos
<!-- entities: GeradorResiduo -->

O sistema SHALL permitir o cadastro de geradores de resíduos sólidos classificados como domiciliar,
comercial ou industrial, vinculando o gerador a uma pessoa física do Cadastro Único ou a um empreendimento
já cadastrado no módulo de Meio Ambiente, quando aplicável.

#### Scenario: Cadastro de gerador industrial vinculado a empreendimento
- **GIVEN** um empreendimento industrial já cadastrado
- **WHEN** `cadastrarGerador()` recebe `tipo = 'industrial'` e `empreendimento_id` desse empreendimento
- **THEN** o gerador é persistido vinculado ao empreendimento e ao `tenant_id` do contexto atual

### Requirement: Registro de coleta regular e seletiva
<!-- entities: ColetaResiduo -->

O sistema SHALL permitir o registro de coletas de resíduos (regular ou seletiva), com rota, data, volume
coletado e destinação final (aterro ou reciclagem), associadas a um gerador cadastrado.

#### Scenario: Registro de coleta seletiva com destinação para reciclagem
- **GIVEN** um gerador comercial cadastrado
- **WHEN** `registrarColeta()` recebe `tipo_coleta = 'seletiva'`, `volume_kg = 150` e `destinacao = 'reciclagem'`
- **THEN** a coleta é persistida vinculada ao gerador, com data da coleta e rota informada

#### Scenario: Volume coletado negativo é rejeitado
- **WHEN** `registrarColeta()` recebe `volume_kg = -10`
- **THEN** lança `DomainException` "Volume coletado deve ser positivo" e o controller responde HTTP 422

### Requirement: Controle de logística reversa
<!-- entities: PontoLogisticaReversa, EntregaLogisticaReversa -->

O sistema SHALL permitir o cadastro de pontos de entrega voluntária de logística reversa (eletrônicos,
pilhas e baterias) e o registro das quantidades entregues em cada ponto, para fins de acompanhamento da
cobertura municipal do programa.

#### Scenario: Registro de entrega de pilhas em ponto de coleta
- **GIVEN** um ponto de logística reversa cadastrado para a categoria `pilhas_baterias`
- **WHEN** `registrarEntrega()` recebe `quantidade_kg = 12.5` para esse ponto, em uma data específica
- **THEN** a entrega é registrada e passa a compor o total acumulado daquele ponto e categoria
