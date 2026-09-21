# Spec Delta

## ADDED Requirements

### Requirement: Filtros Avançados Multivariados no Quadro de Servidores
A aba "Quadro de Servidores" do Portal de RH e Gestão de Pessoas SHALL disponibilizar uma barra e painel de filtros avançados multivariados, permitindo aos gestores segmentar simultaneamente o conjunto de servidores públicos por múltiplos critérios administrativos.

#### Scenario: Filtragem simultânea por Secretaria e Condição Probatória
- **WHEN** o gestor seleciona a secretaria "Secretaria Municipal de Educação" no seletor de órgãos e a opção "Em Estágio Probatório" no seletor de condição funcional
- **THEN** a listagem de servidores exibe apenas os servidores pertencentes a essa secretaria que estão em estágio probatório, atualizando imediatamente o contador de registros visíveis

#### Scenario: Filtragem por Departamento contextual à Secretaria
- **WHEN** o gestor seleciona uma secretaria específica
- **THEN** o seletor de departamento passa a listar exclusivamente as unidades departamentais vinculadas à referida secretaria conforme a árvore organizacional real

#### Scenario: Busca textual combinada com filtros avançados
- **WHEN** o gestor digita um termo de busca (matrícula, nome, CPF ou cargo) mantendo filtros avançados selecionados
- **THEN** o sistema aplica a busca como critério aditivo (interseção lógica E), exibindo apenas servidores que atendem aos filtros selecionados e contenham o termo digitado

#### Scenario: Limpeza de todos os filtros ativos
- **WHEN** o gestor clica no botão "Limpar Filtros"
- **THEN** todos os seletores e o campo de busca são redefinidos para os valores padrão, e a listagem volta a exibir a totalidade dos servidores cadastrados

### Requirement: Layout Responsivo sem Barra de Rolagem Horizontal na Listagem
A tabela do Quadro de Servidores SHALL estruturar suas colunas e larguras de modo a se ajustar perfeitamente à largura disponível do container, sem produzir barra de rolagem lateral (scroll horizontal) em resoluções de tela desktop comuns (a partir de 1024px de largura).

#### Scenario: Renderização das colunas agrupadas em tela padrão
- **WHEN** a tabela do Quadro Geral de Servidores é renderizada em uma resolução desktop típica de trabalho
- **THEN** as colunas agrupam harmoniosamente dados cadastrais (Servidor com Matrícula e CPF), dados de lotação (Secretaria e Departamento unificados) e dados de vínculo (Estágio e Situação Funcional), mantendo a tabela integralmente visível sem overflow horizontal

#### Scenario: Preservação de dados técnicos e formatação mono
- **WHEN** os dados dos servidores são exibidos nas colunas agrupadas
- **THEN** matrículas, CPFs, códigos de unidade e datas continuam renderizados obrigatoriamente com a tipografia `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

### Requirement: Painel de Indicadores Executivos do Quadro de Servidores
A aba do Quadro de Servidores SHALL exibir no topo um painel executivo com cards de indicadores (KPIs) dinâmicos sintetizando a distribuição do efetivo municipal.

#### Scenario: Exibição dos indicadores panorâmicos de pessoal
- **WHEN** a aba "Quadro de Servidores" é acessada
- **THEN** o painel exibe cartões de KPI com o Total de Servidores, Servidores em Estágio Probatório (com percentual), Servidores Estáveis (com percentual), Total Alocado em Unidades Organizacionais e Servidores com Avaliação Registrada no Ciclo Ativo

#### Scenario: Formatação e cores semânticas dos cartões de KPI
- **WHEN** os KPIs são renderizados
- **THEN** os valores numéricos utilizam a fonte técnica `JetBrains Mono`, com cores semânticas padronizadas pelo Design System (Primária para Total, Âmbar para Estágio Probatório, Esmeralda para Estáveis e Ciano para Lotação Regular)

### Requirement: Pílulas de Acesso Rápido (Quick Filters)
A interface do Quadro de Servidores SHALL disponibilizar botões de filtro rápido em formato de pílulas (chips) para alternância imediata entre os segmentos de consulta mais frequentes.

#### Scenario: Seleção rápida de servidores em estágio probatório
- **WHEN** o usuário clica na pílula rápida "Estágio Probatório"
- **THEN** o filtro de condição funcional é automaticamente ajustado para "Em Estágio Probatório" e a tabela exibe instantaneamente apenas servidores nessa condição

#### Scenario: Seleção rápida de servidores sem lotação definida
- **WHEN** o usuário clica na pílula rápida "Sem Lotação"
- **THEN** a tabela filtra exclusivamente servidores que não possuem vínculo registrado no organograma institucional, facilitando a identificação de pendências de alocação pelo DRH
