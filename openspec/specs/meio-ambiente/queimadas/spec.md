# meio-ambiente/queimadas Specification

## Purpose
Registro de ocorrências de queimada com localização, área afetada e responsável quando identificado,
gerando autuação ambiental automática e preparando o terreno para cruzamento futuro com imagens de
satélite.

## Requirements

### Requirement: Registro de ocorrência de queimada
<!-- entities: OcorrenciaQueimada -->

O sistema SHALL permitir o registro de ocorrências de queimada com data, localização georreferenciada,
área queimada estimada (em hectares) e, quando identificado, o responsável (pessoa física do Cadastro
Único ou empreendimento cadastrado).

#### Scenario: Registro de ocorrência com responsável identificado
- **GIVEN** um usuário com permissão `meio_ambiente.queimadas.registrar`
- **WHEN** `registrarOcorrencia()` recebe `data`, `latitude`, `longitude`, `area_queimada_ha = 4.2` e `responsavel_pessoa_id` identificado
- **THEN** a ocorrência é persistida com os dados informados e vinculada ao `tenant_id` do contexto atual

#### Scenario: Registro de ocorrência sem responsável identificado
- **WHEN** `registrarOcorrencia()` recebe os mesmos dados do cenário anterior, sem informar responsável
- **THEN** a ocorrência é persistida com `responsavel_pessoa_id = null` e `situacao = 'responsavel_nao_identificado'`

### Requirement: Geração automática de auto de infração
<!-- entities: OcorrenciaQueimada -->

O sistema SHALL, ao registrar uma ocorrência de queimada com responsável identificado, abrir
automaticamente um auto de infração ambiental do tipo `queimada` vinculado a essa ocorrência, reaproveitando
a capacidade de fiscalização ambiental já especificada.

#### Scenario: Auto de infração aberto automaticamente ao identificar responsável
- **GIVEN** uma ocorrência de queimada registrada sem responsável identificado
- **WHEN** o responsável é posteriormente identificado e vinculado à ocorrência
- **THEN** um auto de infração ambiental do tipo `queimada` é aberto automaticamente, vinculado à ocorrência e ao responsável

### Requirement: Espaço para cruzamento com imagens de satélite
<!-- entities: OcorrenciaQueimada -->

O sistema SHALL permitir anexar a uma ocorrência de queimada uma referência de imagem de satélite (fonte,
data da imagem e identificador externo), quando disponível, sem exigir essa informação para o registro da
ocorrência.

#### Scenario: Registro de ocorrência sem imagem de satélite disponível
- **WHEN** `registrarOcorrencia()` é chamado sem informar referência de imagem de satélite
- **THEN** a ocorrência é registrada normalmente, com o campo de referência de imagem vazio
