# Proposta: Otimização de Desempenho e Carregamento do Módulo de Cemitérios

## Motivação (Why)

Ao acessar o módulo de Gestão de Cemitérios Municipais (SIGCM) ou navegar entre as necrópoles e abas, os usuários enfrentam lentidão acentuada e telas que permanecem em estado de carregamento prolongado. Essa degradação decorre de múltiplos fatores combinados: requisições concorrentes sem paginação enxuta (`per_page: 200`), ausência de índices compostos essenciais nas consultas filtradas por cemitério e setor na tabela `plot_inventory` (~20.000 registros), consultas duplicadas e desnecessárias disparadas logo na montagem dos componentes (como a listagem de mais de 26.000 titulares de concessão mesmo quando o usuário visualiza apenas a aba de concessões) e enfileiramento sequencial em ambientes com worker único. A otimização é urgente para garantir tempos de resposta fluidos e navegabilidade rápida para os gestores municipais.

## O Que Muda (What Changes)

- **Indexação Composta no Banco de Dados**: Criação de índices compostos `(tenant_id, park_id, codigo)` e `(tenant_id, park_id, sector_id)` na tabela `plot_inventory` para eliminar *filesort* e full-scans em listagens ordenadas por código.
- **Redução do Payload Padrão e Paginação Eficiente**: Ajuste do tamanho de página padrão de jazigos de 200 para 50 registros por requisição no frontend e backend, reduzindo expressivamente o tempo de serialização e o volume de dados trafegados.
- **Eliminação de Requisições Duplicadas e Desnecessárias**:
  - Reutilização dos dados de parques já carregados pelo `CemiteriosContext` dentro do `InventarioView`, eliminando a chamada redundante a `/api/cemiterios/parques`.
  - Implementação de *lazy loading* estrito na aba de Concessões: a listagem de titulares (`/api/cemiterios/concessionarios`) só é disparada se o usuário alternar ativamente para a sub-aba de Titulares.
- **Otimização de Consultas Eloquent e Projeção de Colunas**: Seleção apenas dos campos necessários nos relacionamentos de setor e cemitério, evitando carregar objetos pesados não exibidos na tabela inicial.
- **Cache de Estruturas Estáticas/Semi-estáticas**: Cache de curta e média duração para a lista de cemitérios e setores municipais do tenant, reduzindo chamadas repetitivas ao banco.

## Capacidades (Capabilities)

### Novas Capacidades

- `cemiterio/performance-carregamento`: Requisitos de desempenho, tempo máximo de resposta, lazy loading nas abas do módulo de cemitérios, paginação otimizada e índices compostos de busca.

### Capacidades Modificadas

<!-- Nenhuma regra de negócio de inventário existente está sendo alterada; trata-se de otimização de tempo de resposta e estratégia de carregamento. -->

## Impacto

- **Backend (`apps/api/Modules/Cemiterios`)**:
  - Nova migration adicionando os índices compostos na tabela `plot_inventory`.
  - Otimização de queries nos controllers `JazigoController`, `CemiterioController` e `ConcessaoController`.
  - Cache de dados cadastrais de parques e setores.
- **Frontend (`apps/web-client/src/modules/cemiterios`)**:
  - `InventarioView.tsx`: eliminação de chamada redundante a `cemiteriosApi.parques()`, redução do `per_page` padrão de 200 para 50.
  - `ConcessoesView.tsx`: lazy loading condicional de titulares.
- **Banco de Dados (MySQL)**:
  - Redução drástica de CPU e I/O através do aproveitamento de índices cobrindo ordenação e filtros.
