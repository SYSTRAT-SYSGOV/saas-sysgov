# Spec Delta

## Purpose

Oferece ao cidadão a busca pública de falecidos com localização e rota no mapa e ao concessionário, autenticado
pelo Gov.br, um painel com seus jazigos, guias e solicitações.

## ADDED Requirements

### Requirement: Busca pública de falecidos
<!-- rastreabilidade: RF-25; UC-03; RN-04; CA-03 -->
O portal público SHALL permitir, sem login, buscar falecidos sepultados no município por nome, com
correspondência aproximada (tolerante a acentos, caixa e pequenos erros de digitação) e filtro opcional por ano
de falecimento e cemitério. Cada resultado SHALL exibir somente nome, datas de nascimento e falecimento,
cemitério e identificação do jazigo; CPF, causa da morte, documentos e dados do concessionário SHALL NOT ser
expostos.

#### Scenario: Nome sem acento
- **WHEN** o cidadão busca "joao da conceicao"
- **THEN** o resultado inclui "João da Conceição"

#### Scenario: Dados restritos
- **WHEN** qualquer resultado é retornado pela busca pública
- **THEN** a resposta não contém CPF, causa da morte, documentos nem dados do concessionário

### Requirement: Ver no Mapa e rota
<!-- rastreabilidade: RF-26; UC-03 -->
Cada resultado da busca pública SHALL oferecer a ação "Ver no Mapa", que exibe o cemitério e destaca o jazigo
em um mapa público somente leitura, sem camadas de estado ou dados de concessão, e SHALL oferecer link de rota
até o cemitério no aplicativo de mapas do visitante.

#### Scenario: Localizar jazigo
- **WHEN** o cidadão aciona "Ver no Mapa" em um resultado
- **THEN** o mapa público centraliza e destaca o jazigo e exibe o link "Como chegar"

### Requirement: Proteção da busca pública contra abuso
<!-- rastreabilidade: RNF-04 -->
A busca pública SHALL exigir no mínimo 3 caracteres, limitar a quantidade de resultados por página e aplicar
limite de requisições por origem; ao exceder o limite o sistema SHALL responder 429.

#### Scenario: Excesso de requisições
- **WHEN** uma mesma origem excede o limite de buscas por minuto
- **THEN** as requisições excedentes recebem 429

### Requirement: Identificação do município no portal
<!-- rastreabilidade: requisito de plataforma multi-tenant -->
O portal público SHALL determinar o município pela identificação pública do tenant na rota e SHALL retornar
apenas dados desse tenant; municípios sem o portal habilitado SHALL responder como inexistentes (404).

#### Scenario: Isolamento na busca pública
- **WHEN** o cidadão busca um nome no portal do município A
- **THEN** falecidos sepultados no município B não aparecem

### Requirement: Autenticação Gov.br do concessionário
<!-- rastreabilidade: RF-27; RNF-10; premissa P02 -->
O concessionário SHALL autenticar-se no portal via Gov.br (OAuth2/OpenID Connect). O acesso ao painel SHALL ser
concedido apenas quando o CPF retornado pelo Gov.br corresponder a concessionário cadastrado no tenant; caso
contrário o sistema SHALL informar que não há concessões vinculadas, sem revelar dados de terceiros.

#### Scenario: CPF sem concessão
- **WHEN** um cidadão autenticado no Gov.br não é concessionário no município
- **THEN** o portal informa que não há concessões vinculadas ao CPF

### Requirement: Painel do concessionário
<!-- rastreabilidade: RF-28, RF-23 -->
O painel SHALL listar apenas os jazigos e concessões do concessionário autenticado, com situação e vencimento,
as guias pendentes e pagas com download do PDF e emissão de segunda via, os sepultados nos seus jazigos e a
solicitação de renovação.

#### Scenario: Acesso a concessão de outro titular
- **WHEN** o concessionário tenta acessar pela URL a concessão de outro titular
- **THEN** o sistema responde 404
