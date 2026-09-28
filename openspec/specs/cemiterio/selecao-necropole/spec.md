# cemiterio/selecao-necropole Specification

## Purpose
Define os requisitos normativos para o fluxo de entrada no módulo de cemitérios, incluindo a triagem por abrangência de perfil, redirecionamento automático para cemitério único, painel executivo consolidado de administração geral municipal e alternância de contexto de necrópole ativa.

## Requirements

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

### Requirement: Acesso Direto para Perfil de Necrópole Única
O sistema DEVE (SHALL) ignorar a tela de seleção e redirecionar automaticamente o usuário para os painéis de gestão da necrópole vinculada quando o perfil do usuário conceder acesso a exatamente um único cemitério.

#### Scenario: Operador com necrópole exclusiva acessa o módulo
- **WHEN** o usuário com permissão restrita a apenas um cemitério abre o módulo de Gestão de Cemitérios
- **THEN** o sistema seleciona automaticamente esse cemitério como contexto ativo sem exibir a tela de seleção
- **THEN** o sistema carrega diretamente o painel de gestão do cemitério com todas as abas operacionais habilitadas

---

### Requirement: Perfil de Gestão Municipal com Acesso Irrestrito
O sistema DEVE (SHALL) reconhecer o perfil de gestão municipal de cemitérios (`cemiterios.admin` ou equivalente) conferindo visibilidade a todos os cemitérios cadastrados no município, permitindo alternar livremente entre qualquer necrópole e acessar o modo de Administração Geral.

#### Scenario: Gestor municipal visualiza opções de acesso
- **WHEN** o gestor municipal acessa o módulo de Gestão de Cemitérios
- **THEN** o sistema exibe a lista completa de todos os cemitérios do município
- **THEN** o sistema disponibiliza a opção de acessar o painel de "Administração Geral" consolidado além da escolha individual de necrópole

---

### Requirement: Painel de Administração Geral Municipal Consolidado
O sistema DEVE (SHALL) disponibilizar uma visão de Administração Geral Municipal para perfis autorizados, consolidando métricas executivas, indicadores financeiros e manutenções de todas as necrópoles municipais em um único painel.

#### Scenario: Visualização dos indicadores macro municipais
- **WHEN** o gestor municipal seleciona a função "Administração Geral"
- **THEN** o sistema exibe KPIs agregados contendo total de cemitérios, jazigos totais do município, taxa de ocupação global, sepultamentos acumulados no mês e exumações previstas
- **THEN** o sistema exibe o resumo financeiro global com arrecadação de taxas de concessão, pagamentos pendentes e receita consolidada
- **THEN** o sistema exibe a lista integrada de manutenções preventivas e corretivas pendentes em todas as necrópoles do município

#### Scenario: Transição da Administração Geral para um cemitério específico
- **WHEN** o gestor municipal clica em um atalho de necrópole a partir da tabela de cemitérios da Administração Geral
- **THEN** o sistema define a necrópole clicada como contexto ativo e navega para o painel operacional daquela necrópole

---

### Requirement: Alternador de Necrópole Ativa no Cabeçalho
O sistema DEVE (SHALL) exibir um componente de alternância (Necrópole Switcher) no topo da área de trabalho do módulo quando houver uma necrópole selecionada e o usuário tiver acesso a múltiplos cemitérios ou à Administração Geral.

#### Scenario: Alternância rápida de necrópole via cabeçalho
- **WHEN** o usuário clica no seletor de necrópole no cabeçalho
- **THEN** o sistema abre um menu dropdown com a lista dos cemitérios disponíveis e, se aplicável, o atalho para a Administração Geral
- **WHEN** o usuário seleciona uma nova necrópole no dropdown
- **THEN** o sistema atualiza o contexto ativo para o novo cemitério, recarregando os dados das abas para a nova necrópole mantendo a aba funcional atual

#### Scenario: Retorno à tela de seleção ou Administração Geral
- **WHEN** o gestor municipal clica no botão "Trocar Cemitério / Administração Geral" no cabeçalho
- **THEN** o sistema desmarca a necrópole ativa e retorna para a tela inicial de seleção ou painel de Administração Geral

---

### Requirement: Carregamento Contextual das Abas de Gestão do Cemitério Selecionado
Ao selecionar um cemitério, o sistema DEVE (SHALL) renderizar todas as abas e ferramentas de gestão contextualizadas exclusivamente para o cemitério ativo, filtrando inventário de jazigos, concessões, sepultamentos, vistorias, mapa georreferenciado e financeiro local.

#### Scenario: Navegação pelas abas da necrópole selecionada
- **WHEN** uma necrópole estiver ativa no contexto
- **THEN** o sistema exibe a barra de navegação com as abas: Visão Geral, Inventário, Concessões, Operações, Vistorias, Mapa GIS, Financeiro e Empreiteiros
- **THEN** qualquer filtro ou ação executada nas abas afeta única e exclusivamente a necrópole atualmente selecionada
