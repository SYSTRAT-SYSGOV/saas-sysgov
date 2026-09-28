# Proposta: Aperfeiçoamento do Inventário Cemiterial com DataTable Avançada e Padrão Visual CAPD

## Why

A aba de inventário do módulo Gestão de Cemitérios (SIGCM) possui atualmente controles básicos de listagem e filtros simples, sem visão agregada de indicadores operacionais e sem recursos avançados de filtragem e exportação. Para municípios com milhares de jazigos, gavetas e ossuários distribuídos em múltiplos cemitérios e quadras, a localização ágil de unidades, a identificação imediata de vagas disponíveis ou em manutenção e a análise da taxa de ocupação exigem uma interface analítica robusta.

Esta proposta padroniza a interface de inventário cemiterial seguindo rigorosamente os padrões de excelência visual consolidados no módulo CAPD — utilizando `StatCard` e cards semânticos de `@sysgov/ui`, `DataTable` com ordenação, paginação e exportação nativa, além de um painel de filtros avançados combinados e drawer de detalhes aprofundado com ocupantes e linha do tempo histórica.

## What Changes

- **Painel Superior de Indicadores (KPI Cards no Padrão CAPD)**:
  - Adição de grid de métricas operacionais com componentes `StatCard` de `@sysgov/ui`:
    - Total de Unidades Cadastradas;
    - Vagas Disponíveis;
    - Unidades Concedidas / Em Uso;
    - Unidades em Capacidade Máxima;
    - Unidades em Ruína / Manutenção;
    - Taxa Global de Ocupação (%).
  - Destaques visuais por cor semântica e tipografia técnica em JetBrains Mono (`font-mono tabular-nums`).

- **Painel de Filtros Avançados**:
  - Filtro em cascata de Cemitério / Parque e Setor / Quadra;
  - Filtro por Tipo de Unidade (Jazigo, Gaveta, Ossuário/Nicho, Cova Pública);
  - Filtro por Estado Operacional (Disponível, Concedido, Ocupado, Capacidade Máxima, Manutenção);
  - Filtro por Faixa de Ocupação (Livre 0%, Parcial, Lotado 100%);
  - Busca textual rápida combinada (código do jazigo, concessionário ou falecido);
  - Ações rápidas de "Limpar Filtros" e indicador de contagem de registros filtrados.

- **DataTable Completa e Otimizada**:
  - Colunas com ordenação (`sortValue`), formatação mono para códigos e dimensões (`Mono`), barra visual compacta de progresso de ocupação (`ocupacao/capacidade`), e chips de estado (`EstadoChip`);
  - Suporte nativo à exportação (`exportable`) para CSV, XLSX e PDF com `meta.exportValue`;
  - Paginação configurável (10, 25, 50, 100 itens por página) e seleção para ações em lote ou detalhamento.

- **Drawer de Detalhes Enriquecido**:
  - Exibição de dados cadastrais completos, dimensões, geolocalização e setor;
  - Lista de ocupantes atuais vinculados à unidade (falecidos sepultados, data de inumação e guias);
  - Dados da concessão ativa (titular, vigência e tipo perpétuo/temporário);
  - Linha do tempo de histórico (transições de estado, inumações, exumações e vistorias);
  - Ações rápidas contextuais (mudança para manutenção/ruína com justificativa obrigatória e link para ordens de serviço).

## Capabilities

### New Capabilities
- `cemiterio/inventario`: Gestão completa do inventário cemiterial municipal com DataTable avançada, filtros multidimensionais, KPIs operacionais padronizados em StatCards e visão detalhada de unidades de sepultamento.

### Modified Capabilities
<!-- Nenhuma capacidade existente em openspec/specs/ está sendo alterada em seus requisitos base. -->

## Impact

- **Frontend**:
  - Refatoração e enriquecimento de `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx`.
  - Reutilização mandatória dos componentes oficiais de `@sysgov/ui` (`StatCard`, `Card`, `Button`, `Badge`, `Select`, `Input`, `Drawer`, `Modal`) e de `@/components/ui/DataTable`.
  - Componentes auxiliares de filtros avançados e barra de métricas em `apps/web-client/src/modules/cemiterios/views/`.
- **SDK / API Client**:
  - Atualização dos tipos e filtros de listagem em `apps/web-client/src/modules/cemiterios/api.ts` para suportar filtros avançados (setor_id, faixa_ocupacao, tipo, etc.).
- **Backend**:
  - Suporte aos filtros adicionais de busca e agregação de contagens estatísticas na rota de inventário (`JazigoController` e `ParqueController` em `apps/api/Modules/Cemiterio`).
- **Testes**:
  - Novos testes unitários e de renderização para o `InventarioView`, utilitários de filtros e `DataTable` no Vitest.
