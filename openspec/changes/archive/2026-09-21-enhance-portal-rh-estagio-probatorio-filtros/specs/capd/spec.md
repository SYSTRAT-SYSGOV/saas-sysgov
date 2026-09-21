# Spec Delta

## ADDED Requirements

### Requirement: Filtros Especializados de Acompanhamento do Estágio Probatório
A aba "Acompanhamento do Estágio Probatório" do Portal de RH SHALL disponibilizar uma barra e painel colapsável de filtros avançados estruturados, permitindo aos gestores segmentar simultaneamente os servidores em período probatório por fase avaliativa, órgão de lotação e situação cadastral.

#### Scenario: Filtragem por Fase do Estágio Probatório
- **WHEN** o gestor seleciona a opção "2ª Fase (24 meses)" no seletor de fases
- **THEN** a tabela exibe exclusivamente os servidores classificados na 2ª fase do estágio probatório, atualizando imediatamente os contadores visíveis

#### Scenario: Filtragem combinada por Secretaria e Fase do Estágio
- **WHEN** o gestor seleciona uma secretaria específica e uma fase do estágio
- **THEN** a listagem exibe apenas servidores lotados na referida secretaria que estejam na fase selecionada

#### Scenario: Filtragem por Status da Avaliação Periódica no Ciclo
- **WHEN** o gestor seleciona a opção "Sem Avaliação no Ciclo Atual"
- **THEN** o sistema filtra os servidores em estágio que ainda não tiveram avaliação registrada pelas chefias no ciclo ativo, facilitando a cobrança preventiva pelo DRH

### Requirement: Layout Responsivo sem Barra de Rolagem na Tabela de Estágio
A tabela de Acompanhamento do Estágio Probatório SHALL estruturar suas colunas e larguras de modo a se ajustar perfeitamente ao container, eliminando a barra de rolagem lateral (scroll horizontal) em resoluções de desktop comuns (a partir de 1024px de largura).

#### Scenario: Renderização das colunas com ênfase probatória
- **WHEN** a tabela de estágio probatório é renderizada no desktop
- **THEN** exibe colunas agrupadas contendo Servidor Público, Cargo & Regime, Lotação Institucional, Fase do Estágio & Interstício, Chefia Imediata e Ações, ajustando-se à largura disponível sem overflow horizontal

#### Scenario: Tipografia técnica nos prazos e identificadores
- **WHEN** as informações de matrícula, CPF, fases e datas de término do estágio são exibidas
- **THEN** a renderização utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

### Requirement: Painel de Indicadores Executivos do Estágio Probatório
A aba de Estágio Probatório SHALL exibir no topo um conjunto de cartões de indicadores executivos (KPIs) específicos da cadência trienal.

#### Scenario: Exibição da distribuição do efetivo em estágio
- **WHEN** a aba "Acompanhamento do Estágio Probatório" é acessada
- **THEN** o painel exibe cartões com o Total em Estágio Probatório, Servidores na 1ª Fase (12 meses), Servidores na 2ª Fase (24 meses), Servidores na 3ª Fase (36 meses / Estabilidade Iminente) e Taxa de Avaliação no Ciclo Vigente

#### Scenario: Cores semânticas dos cartões de KPI de estágio
- **WHEN** os KPIs são renderizados
- **THEN** utilizam as cores semânticas oficiais do Design System (Âmbar para fases iniciais, Esmeralda para fase conclusiva/aprovação e Primária para o total)

### Requirement: Pílulas de Acesso Rápido para Estágio Probatório (Quick Filters)
A interface de Estágio Probatório SHALL disponibilizar pílulas de navegação rápida com 1 clique para as fases probatórias e pendências de avaliação.

#### Scenario: Alternância rápida de fases probatórias
- **WHEN** o usuário clica na pílula "3ª Fase"
- **THEN** o filtro de fase é instantaneamente aplicado e a tabela exibe os servidores em vias de aquisição de estabilidade
