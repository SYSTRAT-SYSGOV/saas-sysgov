# Spec Delta: Seleção de Necrópole - DataTable com Filtros Avançados e Alternância de Visualização

## MODIFIED Requirements

### Requirement: Seleção Inicial de Necrópole para Perfis Multicemitário
O sistema DEVE (SHALL) apresentar uma tela inicial de seleção de necrópole sempre que o usuário autenticado possuir permissão de acesso a mais de um cemitério no município e ainda não houver um cemitério selecionado no contexto da sessão. A visualização padrão DEVE (SHALL) ser em formato de Listagem (DataTable) com paginação fixa de 10 registros, ordenação por colunas e filtros avançados (busca textual por nome/código/bairro, status operacional e capacidade). O sistema DEVE (SHALL) disponibilizar um controle para alternar para visualização secundária em Grade de Cards, mantendo a listagem como padrão ativo.

#### Scenario: Usuário com múltiplos cemitérios acessa o módulo
- **WHEN** o usuário com acesso a dois ou mais cemitérios abre o módulo de Gestão de Cemitérios
- **THEN** o sistema exibe a tela de Seleção de Necrópole renderizando a visualização em Listagem / DataTable por padrão ativo
- **THEN** a DataTable apresenta as colunas: Código, Nome, Endereço/Bairro, Responsável, Setores, Jazigos Totais, Ocupação, Status e Ação de Acesso
- **THEN** as abas operacionais locais (inventário, concessões, operações) permanecem ocultas até que uma necrópole seja escolhida

#### Scenario: Alternância para modo Grade de Cards
- **WHEN** o usuário clica no seletor de modo de visualização para "Grade de Cards"
- **THEN** o sistema altera a exibição da listagem para cards informativos responsivos mantendo os filtros aplicados
- **WHEN** o usuário clica novamente no seletor para "Listagem"
- **THEN** o sistema retorna à visualização tabular (DataTable)

#### Scenario: Seleção de um cemitério na tela inicial
- **WHEN** o usuário clica sobre o botão "Acessar Gestão" na linha da tabela ou no card de um cemitério
- **THEN** o sistema define a necrópole como ativa no contexto e transiciona imediatamente para o painel de gestão daquele cemitério, exibindo suas abas e métricas locais
