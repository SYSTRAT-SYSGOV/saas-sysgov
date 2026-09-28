# Spec Delta: Isolamento Contextual em Todas as Abas da Necrópole Ativa

## Purpose

Define a obrigatoriedade de isolamento e filtragem contextual do cemitério ativo em todas as abas operacionais do módulo (Mapa GIS, Operações, Concessões, Financeiro, Empreiteiros e Vistoria/Abandono), impedindo a exibição ou mistura de dados de outros cemitérios do município.

## ADDED Requirements

### Requirement: Filtragem Obrigatória por Necrópole Ativa em Todas as Abas
O sistema DEVE (SHALL) filtrar estritamente todas as requisições de dados e visualizações operacionais com o identificador da necrópole atualmente selecionada (`park_id: cemiterioAtivoId`), abrangendo as abas de Mapa GIS, Operações de Sepultamento/Exumação, Contratos de Concessão, Guias Financeiras, Empreiteiros e Vistorias Técnicas. É vedada a exibição de registros de outras necrópoles durante a navegação dentro do contexto de um cemitério específico.

#### Scenario: Visualização da aba de Operações na necrópole selecionada
- **WHEN** o usuário com a necrópole "Cemitério Jardim das Flores" selecionada abre a aba de Operações
- **THEN** a lista de sepultamentos, exumações e ordens de serviço exibe exclusivamente os registros vinculados ao Jardim das Flores
- **THEN** nenhum sepultamento ou ordem de serviço de outros cemitérios municipais é exibido

#### Scenario: Visualização da aba de Concessões na necrópole selecionada
- **WHEN** o usuário com a necrópole selecionada abre a aba de Concessões
- **THEN** a listagem de títulos e contratos de concessão filtra apenas os jazigos pertencentes ao cemitério ativo

#### Scenario: Visualização da aba de Mapa GIS na necrópole selecionada
- **WHEN** o usuário acessa a aba de Mapa GIS
- **THEN** o mapa georreferenciado centraliza e carrega exclusivamente os setores, quadras e jazigos do cemitério ativo

#### Scenario: Visualização das abas de Financeiro, Empreiteiros e Vistorias
- **WHEN** o usuário navega pelas abas de Financeiro, Empreiteiros autorizados ou Vistorias
- **THEN** os dados financeiros, vistorias técnicas e apontamentos de abandono apresentados são exclusivos da necrópole ativa
