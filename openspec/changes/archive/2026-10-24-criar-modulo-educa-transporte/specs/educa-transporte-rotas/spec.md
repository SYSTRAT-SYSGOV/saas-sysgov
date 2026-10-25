# Spec Delta: Rotas e Itinerários de Transporte Escolar

## Purpose

Permite cadastrar, parametrizar e gerenciar linhas, rotas e pontos de parada ordenados do transporte escolar municipal urbano e rural.

## ADDED Requirements

### Requirement: Cadastro de Rotas e Itinerários Escolares
O sistema DEVE (MUST) permitir o cadastro de rotas de transporte escolar contendo código identificador único, nome descritivo, turno de atendimento, tipo de rota (urbana, rural ou mista) e quilometragem diária total estimada.

#### Scenario: Cadastro de nova rota com dados válidos
- **WHEN** o usuário com permissão cadastrar uma nova rota com código único, nome e turno
- **THEN** o sistema persiste a rota com status "ativa" e vincula ao tenant correspondente

#### Scenario: Rejeição de rota com código duplicado no mesmo tenant
- **WHEN** o usuário tentar cadastrar uma rota cujo código já esteja em uso no tenant
- **THEN** o sistema rejeita a operação com erro de validação informando duplicidade de código

### Requirement: Pontos de Parada e Ordem de Embarque
O sistema DEVE (MUST) gerenciar pontos de parada sequenciais associados a cada rota, registrando nome do ponto, endereço/referência, coordenadas geográficas opcionais, horário previsto e ordem cronológica no itinerário.

#### Scenario: Adição ordenada de ponto de parada
- **WHEN** o usuário adicionar um ponto de parada à rota especificando o número de ordem sequencial
- **THEN** o sistema registra o ponto mantendo a ordenação correta do itinerário de viagem

#### Scenario: Bloqueio de horários inconsistentes
- **WHEN** o horário previsto de um ponto for anterior ao horário de início da rota
- **THEN** o sistema rejeita o ponto com erro de consistência temporal

### Requirement: Vínculo de Escolas Atendidas pela Rota
O sistema DEVE (MUST) associar uma ou mais unidades escolares (`EducaSchool`) como destinos de desembarque atendidos pela rota de transporte.

#### Scenario: Associação de escolas de destino à rota
- **WHEN** o usuário associar uma escola ativa da rede municipal à rota de transporte
- **THEN** o sistema registra a escola como destino habilitado para desembarque dos estudantes
