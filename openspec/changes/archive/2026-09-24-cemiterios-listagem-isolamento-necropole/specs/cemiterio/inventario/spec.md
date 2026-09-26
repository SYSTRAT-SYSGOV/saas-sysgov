# Spec Delta: Isolamento Estrito do Inventário por Necrópole Ativa

## MODIFIED Requirements

### Requirement: Painel de Indicadores Operacionais do Inventário (KPIs)
O sistema SHALL exibir no topo da aba de inventário um conjunto de cartões de indicadores (KPIs) com métricas consolidadas em tempo real: Total de Unidades Cadastradas, Vagas Disponíveis, Unidades Concedidas, Unidades Ocupadas ou em Capacidade Máxima, Unidades em Ruína/Manutenção e Taxa de Ocupação Global em percentual (`%`). Os valores numéricos e percentuais DEVEM utilizar obrigatoriamente tipografia técnica em JetBrains Mono (`tabular-nums font-mono`). Quando uma necrópole estiver selecionada no contexto do módulo, os indicadores DEVEM (SHALL) refletir estritamente as unidades e jazigos daquele cemitério, vedada a exibição de dados agregados de outros cemitérios do município.

#### Scenario: Carga inicial de indicadores globais do município
- **WHEN** o usuário acessa a aba de inventário sem selecionar um cemitério específico
- **THEN** o sistema exibe os cartões com os totais consolidados de todos os cemitérios ativos do tenant

#### Scenario: Carga de indicadores da necrópole ativa
- **WHEN** o usuário acessa a aba de inventário com um cemitério específico selecionado
- **THEN** o sistema exibe os cartões de KPIs calculados única e exclusivamente a partir dos jazigos e unidades da necrópole ativa
- **THEN** a soma de unidades, disponíveis, ocupadas e em ruína corresponde com exatidão ao total cadastrado para a necrópole selecionada

#### Scenario: Filtragem contextual de indicadores por cemitério
- **WHEN** o usuário seleciona um cemitério específico no filtro
- **THEN** os cartões de indicadores recalculam imediatamente para refletir exclusivamente as métricas do cemitério selecionado

---

### Requirement: Painel de Filtros Avançados Multidimensionais
O sistema SHALL disponibilizar um painel de filtros avançados que permita refinar a listagem de unidades por: Cemitério/Parque, Setor/Quadra (com opções restritas ao cemitério ativo), Tipo de Unidade (Jazigo, Gaveta, Ossuário/Nicho, Cova Pública), Estado Operacional (Disponível, Concedido, Ocupado, Capacidade Máxima, Manutenção) e Faixa de Ocupação (Vazio 0%, Parcial, Lotado 100%), além de busca textual rápida por código ou identificador de concessão. Quando em contexto de necrópole ativa, o seletor de Cemitério DEVE (SHALL) ser fixado no cemitério selecionado ou ocultado, e o botão de criação de novos cemitérios DEVE (SHALL) ser suprimido da barra de ações do inventário local.

#### Scenario: Ocultação de ações globais no inventário local
- **WHEN** o usuário visualiza o inventário de um cemitério específico
- **THEN** o botão "+ Novo Cemitério" permanece oculto da barra de ações do inventário local
- **THEN** estão visíveis apenas ações pertinentes ao cemitério: "+ Novo Setor/Quadra", "+ Novo Jazigo" e "Importar Planilha (CSV)"

#### Scenario: Filtro em cascata de setores por cemitério
- **WHEN** o usuário seleciona o Cemitério "A"
- **THEN** o seletor de Setor/Quadra passa a listar unicamente os setores pertencentes ao Cemitério "A" e reseta qualquer setor incompatível

#### Scenario: Limpeza e restauração de filtros
- **WHEN** o usuário clica na ação de "Limpar Filtros"
- **THEN** todos os filtros retornam ao estado padrão e a listagem exibe todas as unidades autorizadas
