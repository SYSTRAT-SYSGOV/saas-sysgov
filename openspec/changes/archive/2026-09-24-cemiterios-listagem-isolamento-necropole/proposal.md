# Proposal: Listagem Principal em DataTable com Filtros Avançados e Isolamento Estrito de Contexto da Necrópole

## Why

Na tela principal de seleção de cemitérios, a exibição exclusiva em cards é insuficiente para operadores e gestores municipais que necessitam de visão tabular com filtros avançados, ordenação de colunas e alta densidade de informação. Além disso, ao acessar a gestão de um cemitério específico, a aba de Inventário e as demais abas operacionais (Mapa, Concessões, Operações, Vistorias, Financeiro, Empreiteiros) estavam apresentando dados consolidados de todos os cemitérios do município (ex: contador global de 35 jazigos em vez dos 8 da necrópole ativa, filtro "Todos os cemitérios" selecionável e botão "+ Novo Cemitério" indevidamente presente no inventário local).

É essencial que a tela principal passe a ter a visualização em Listagem / DataTable com filtros avançados como padrão ativa, oferecendo a visualização em Cards como uma segunda opção alternável; e que, ao ingressar na visualização de um cemitério, todas as abas funcionais exibam única e exclusivamente os registros da necrópole selecionada.

## What Changes

- **Tela Principal (Seleção de Necrópoles)**:
  - **DataTable Avançada como Padrão**: Apresenta listagem tabular completa com Código, Nome, Endereço/Bairro, Responsável, Setores/Quadras, Capacidade Total, Ocupação (%), Status Operacional e Ação de Acesso.
  - **Filtros Avançados**: Filtro por status (Ativo, Em Manutenção, Saturado), busca textual (nome, código, logradouro) e filtro por faixa de capacidade/ocupação.
  - **Alternador de Visualização (Toggle)**: Permite alternar entre "Listagem (Tabela)" (padrão ativo) e "Grade de Cards" com persistência da preferência na sessão.
- **Aba de Inventário da Necrópole Selecionada**:
  - **Isolamento de Dados**: Os KPIs de unidades, disponíveis, concedidos, ocupados, capacidade máxima e ruína refletem única e exclusivamente a necrópole ativa.
  - **Remoção de Elementos Globais**: O filtro de cemitério é fixado/removido da visualização local e o botão "+ Novo Cemitério" é suprimido do inventário local (restringindo-se às ações pertinentes: "+ Novo Setor/Quadra", "+ Novo Jazigo", "Importar Planilha").
  - **Ajuste de Subtítulo e Escopo**: O texto "Visão integrada de todos os cemitérios do município" é substituído pela identificação clara do inventário exclusivo da necrópole ativa.
- **Demais Abas Operacionais (`mapa`, `operacoes`, `concessoes`, `financeiro`, `empreiteiros`, `vistorias`)**:
  - Injeção obrigatória do `cemiterioAtivoId` nas requisições e filtros de dados, garantindo que sepultamentos, concessões, vistorias técnicas, polígonos GIS e guias financeiras pertençam exclusivamente à necrópole selecionada, sem mistura de dados.

## Capabilities

### New Capabilities
- `cemiterio/isolamento-contextual-abas`: Obrigatoriedade de filtragem e isolamento contextual de todas as abas operacionais do cemitério ativo.

### Modified Capabilities
- `cemiterio/selecao-necropole`: Adição da visualização padrão em DataTable com filtros avançados e controle alternador para cards.
- `cemiterio/inventario`: Isolamento estrito de indicadores operacionais (KPIs) e supressão de ações globais no inventário do cemitério em operação.

## Impact

- **Frontend (`apps/web-client`)**:
  - `SelecaoNecropoleView.tsx`: Introdução de DataTable com paginação, ordenação e filtros avançados; adição de botão seletor de visualização (Lista / Cards) com Lista como padrão.
  - `InventarioView.tsx` e `InventarioFiltros.tsx`: Vinculação estrita ao `cemiterioAtivoId` do contexto, ocultação do seletor global de cemitério e do botão de criação de cemitério quando em contexto de necrópole única, além de recálculo dos KPIs para o parque ativo.
  - Demais views (`OperacoesView`, `ConcessoesView`, `FinanceiroView`, `MapaView`, `VistoriaView`): Injeção do `park_id: cemiterioAtivoId` em suas requisições de listagem.
