# Design

## Context

Consulte [proposal.md](file:///c:/laragon/www/saas-sysgov/openspec/changes/otimizacao-performance-cemiterios/proposal.md) para a motivação detalhada deste trabalho.

O módulo de Gestão de Cemitérios Municipais (SIGCM) atende prefeituras com acervos expressivos (ex.: ~20.000 jazigos na tabela `plot_inventory` e ~26.000 titulares em `concession_holders` no município avaliado).
A arquitetura do backend opera como monólito modular Laravel com multi-tenancy lógico estrito (`tenant_id` e trait `TenantAware`). Em ambientes de desenvolvimento e servidores municipais com dimensionamento enxuto de workers PHP, o disparo simultâneo de requisições pesadas pelo frontend satura o thread de execução, gerando tempos de resposta de 8 a 15 segundos para a abertura de uma única tela.

## Goals / Non-Goals

**Goals:**
- Assegurar que o carregamento inicial da tela de inventário de jazigos ocorra em menos de 1 segundo (com target < 400ms na API).
- Eliminar operações de *filesort* em disco no MySQL nas queries de inventário filtradas por cemitério e ordenadas por código.
- Reduzir o tráfego de dados e o tempo de serialização JSON com tamanho padrão de página de 50 itens.
- Eliminar chamadas HTTP duplicadas ou desnecessárias entre os componentes frontend e o provedor de navegação.
- Introduzir carregamento sob demanda (*lazy loading*) para dados não imediatamente visíveis (como a base de titulares de concessão).
- Cachear listas estáticas de cemitérios e setores municipais do tenant com invalidação consistente.

**Non-Goals:**
- Não alterar as regras de negócio de sepultamento, exumação, concessão ou cobrança de taxas.
- Não introduzir motores externos de indexação (ex.: Elasticsearch, Meilisearch ou Typesense); os índices compostos no MySQL 8.4 atendem integralmente à demanda.
- Não desestruturar ou reimplementar componentes visuais; manter a fidelidade e conformidade com `@sysgov/ui`.

## Decisions

### 1. Índices Compostos Estratégicos no MySQL (`plot_inventory`)
- **Decisão**: Adicionar os índices compostos `(tenant_id, park_id, codigo)` e `(tenant_id, park_id, sector_id)` na tabela `plot_inventory`.
- **Justificativa**: A query principal de inventário (`WHERE tenant_id = ? AND park_id = ? ORDER BY codigo LIMIT ?`) dependia exclusivamente do índice `plot_inventory_park_id_foreign`, obrigando o otimizador do MySQL a realizar `Using where; Using filesort` em milhares de registros por requisição. Com o índice composto cobrindo o particionamento do tenant, o filtro do parque e o critério de ordenação, a consulta é resolvida por varredura de índice direto sem ordenação em memória ou disco.
- **Alternativas consideradas**:
  - *Manter apenas o índice de chave estrangeira*: descartado por perpetuar o gargalo de filesort em todas as páginas do inventário.
  - *Cache integral da tabela de jazigos em memória*: descartado devido à volatilidade de status de jazigos em tempo real (ocupações, reservas).

### 2. Paginação Enxuta (50 itens por página)
- **Decisão**: Padronizar o tamanho de página padrão (`per_page`) em 50 registros no backend e no frontend (`InventarioView.tsx`), permitindo ao usuário alternar para 100 se explicitamente desejado.
- **Justificativa**: Requisitar 200 registros por padrão gerava payloads superiores a 250KB com overhead desnecessário de hidratação de models no Eloquent e serialização JSON. 50 registros oferecem excelente densidade visual sem impactar a responsividade da interface.
- **Alternativas consideradas**:
  - *Virtualização de lista sem paginação (infinite scroll)*: descartada pois aumenta a complexidade de renderização e estado no React sem dispensar a carga inicial de dados no backend.

### 3. Reuso de Estado no Frontend e Lazy Loading de Sub-Abas
- **Decisão**:
  - Em `InventarioView.tsx`, reutilizar os dados de cemitérios e setores já disponíveis no `CemiteriosContext` fornecido pelo layout de navegação, extinguindo a chamada duplicada a `/api/cemiterios/parques`.
  - Em `ConcessoesView.tsx`, postergar a busca de titulares (`/api/cemiterios/concessionarios`) para o momento em que o gestor clicar na aba "Titulares" ou abrir a modal de seleção de concessionário.
- **Justificativa**: O layout de navegação já carrega e mantém os parques em memória. Recarregar a lista completa de parques a cada transição de tela causava round-trips redundantes. Além disso, buscar 26.000 titulares logo na abertura da aba de concessões bloqueava o servidor desnecessariamente.
- **Alternativas consideradas**:
  - *BFF (Backend-For-Frontend) ou agregação GraphQL*: descartada por adicionar camadas adicionais desnecessárias quando a orquestração limpa no React resolve o problema de imediato.

### 4. Cache com Tags para Parques e Setores
- **Decisão**: Utilizar `Cache::remember` com tags tenant-scoped (`tenant:{id}:cemiterios`) para as listagens de cemitérios (`/api/cemiterios/parques`) e setores com TTL de 30 minutos, invalidado automaticamente nos métodos de mutação (criação, edição ou exclusão de cemitério/setor).
- **Justificativa**: Parques e setores são dados estruturais raramente alterados no dia a dia, eliminando dezenas de consultas repetidas ao banco a cada navegação de menu.

## Risks / Trade-offs

- **[Risco] Bloqueio ou lentidão durante a criação do índice em base de produção** → *Mitigação*: A tabela `plot_inventory` possui ~20.000 linhas, volume modesto onde a criação do índice no MySQL 8.4 é quase instantânea (< 1 segundo). A migration utilizará declaração padrão suportada nativamente.
- **[Risco] Invalidação incorreta do cache de parques/setores em atualizações cadastrais** → *Mitigação*: Centralizar a limpeza do cache em trait ou service compartilhado disparado em eventos de modelo ou nos endpoints de escrita.
- **[Risco] Usuário habituado a visualizar 200 jazigos de uma só vez** → *Mitigação*: Manter o seletor de paginação do componente `@sysgov/ui` acessível, permitindo que o gestor escolha exibir até 100 registros se necessário.

## Migration Plan

1. Gerar e executar migration Laravel criando os índices compostos na tabela `plot_inventory`.
2. Aplicar otimização de consultas e cache com tags nos controllers do módulo `Modules/Cemiterios`.
3. Ajustar `InventarioView.tsx` e `ConcessoesView.tsx` no frontend `apps/web-client`.
4. Executar verificação com `EXPLAIN` no MySQL e medição no DevTools para homologar os tempos de carregamento (< 800ms).
5. Estratégia de rollback: Caso necessário, executar `down()` da migration (revertendo os índices) e checkout das versões de código.
