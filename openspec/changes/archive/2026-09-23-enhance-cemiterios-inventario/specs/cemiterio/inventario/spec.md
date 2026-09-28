# Spec Delta

## Purpose

Gerencia o inventário físico completo dos cemitérios municipais com visualização analítica via KPIs padronizados no modelo CAPD, filtragem multidimensional avançada e controle de unidades de sepultamento em DataTable de alta performance.

## ADDED Requirements

### Requirement: Painel de Indicadores Operacionais do Inventário (KPIs)
O sistema SHALL exibir no topo da aba de inventário um conjunto de cartões de indicadores (KPIs) com métricas consolidadas em tempo real: Total de Unidades Cadastradas, Vagas Disponíveis, Unidades Concedidas, Unidades Ocupadas ou em Capacidade Máxima, Unidades em Ruína/Manutenção e Taxa de Ocupação Global em percentual (`%`). Os valores numéricos e percentuais DEVEM utilizar obrigatoriamente tipografia técnica em JetBrains Mono (`tabular-nums font-mono`).

#### Scenario: Carga inicial de indicadores globais do município
- **WHEN** o usuário acessa a aba de inventário sem selecionar um cemitério específico
- **THEN** o sistema exibe os cartões com os totais consolidados de todos os cemitérios ativos do tenant

#### Scenario: Filtragem contextual de indicadores por cemitério
- **WHEN** o usuário seleciona um cemitério específico no filtro
- **THEN** os cartões de indicadores recalculam imediatamente para refletir exclusivamente as métricas do cemitério selecionado

### Requirement: Painel de Filtros Avançados Multidimensionais
O sistema SHALL disponibilizar um painel de filtros avançados que permita refinar a listagem de unidades por: Cemitério/Parque, Setor/Quadra (com opções restritas ao cemitério ativo), Tipo de Unidade (Jazigo, Gaveta, Ossuário/Nicho, Cova Pública), Estado Operacional (Disponível, Concedido, Ocupado, Capacidade Máxima, Manutenção) e Faixa de Ocupação (Vazio 0%, Parcial, Lotado 100%), além de busca textual rápida por código ou identificador de concessão.

#### Scenario: Filtro em cascata de setores por cemitério
- **WHEN** o usuário seleciona o Cemitério "A"
- **THEN** o seletor de Setor/Quadra passa a listar unicamente os setores pertencentes ao Cemitério "A" e reseta qualquer setor incompatível

#### Scenario: Limpeza e restauração de filtros
- **WHEN** o usuário clica na ação de "Limpar Filtros"
- **THEN** todos os filtros retornam ao estado padrão e a listagem exibe todas as unidades autorizadas

### Requirement: DataTable de Unidades de Sepultamento com Exportação
O sistema SHALL renderizar a lista de unidades utilizando o componente padrão `DataTable`, com ordenação dinâmica em todas as colunas relevantes (Código, Tipo, Setor, Ocupação, Estado), paginação configurável (10, 25, 50, 100 itens) e suporte nativo à exportação de dados nos formatos CSV, XLSX e PDF com preservação de metadados técnicos.

#### Scenario: Ordenação por ocupação e código
- **WHEN** o usuário clica no cabeçalho da coluna "Ocupação" ou "Código"
- **THEN** o sistema reordena as linhas de forma crescente ou decrescente com base nos valores brutos numéricos e alfanuméricos

#### Scenario: Exportação dos dados filtrados
- **WHEN** o usuário aciona a exportação de dados com filtros ativos
- **THEN** o arquivo gerado (CSV, XLSX ou PDF) contém exatamente o conjunto de registros filtrados com cabeçalhos padronizados

### Requirement: Painel Lateral de Detalhes da Unidade (Drawer)
O sistema SHALL exibir, ao clicar em uma unidade da tabela, um painel lateral retrátil (Drawer) contendo as informações completas da unidade: dimensões físicas, capacidade máxima, ocupação atual com indicador visual de preenchimento, dados da concessão vinculada (se houver), lista de ocupantes inumados e linha do tempo histórica de eventos.

#### Scenario: Consulta detalhada de jazigo ocupado
- **WHEN** o usuário clica sobre uma linha de jazigo com ocupação registrada
- **THEN** o sistema abre o Drawer lateral exibindo a relação de falecidos sepultados, data de sepultamento e histórico de movimentações

#### Scenario: Mudança assistida de estado para manutenção
- **WHEN** o usuário autorizado solicita marcar a unidade como "Em Ruína/Manutenção"
- **THEN** o sistema exige justificativa formal obrigatória, valida o controle de concorrência otimista e registra o evento na trilha de auditoria
