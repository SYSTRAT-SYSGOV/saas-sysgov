# Tasks

## 1. Banco de Dados e Indexação Composta

- [x] 1.1 Criar migration Laravel no módulo `Modules/Cemiterios` adicionando os índices compostos `(tenant_id, park_id, codigo)` e `(tenant_id, park_id, sector_id)` na tabela `plot_inventory` e verificar a execução sem erros via `php artisan migrate`.
- [x] 1.2 Executar `EXPLAIN` no MySQL para a query de listagem de jazigos filtrada por parque e ordenada por código, verificando a eliminação de `Using filesort` e a utilização do novo índice composto.

## 2. Otimizações no Backend (API)

- [x] 2.1 Ajustar o controller de inventário de jazigos (`JazigoController`) para padronizar o tamanho de página padrão em 50 registros (`per_page=50`) e verificar a resposta JSON via endpoint de teste.
- [x] 2.2 Implementar cache tenant-scoped com tags (`tenant:{tenantId}:cemiterios`) para a listagem de cemitérios e setores municipais com invalidação automática em mutações (store/update/destroy) e verificar redução de queries no banco.
- [x] 2.3 Otimizar as queries de concessões e titulares em `ConcessaoController`, garantindo projeção de colunas necessárias e carregamento eficiente de relacionamentos.

## 3. Otimizações no Frontend (Web Client)

- [x] 3.1 Atualizar `InventarioView.tsx` para consumir a lista de parques diretamente do `useCemiterios()` (`CemiteriosContext`), eliminando a chamada duplicada a `cemiteriosApi.parques()` no hook `useEffect`.
- [x] 3.2 Atualizar o parâmetro padrão de paginação de 200 para 50 registros por página em `InventarioView.tsx` e validar a renderização correta com os componentes de paginação do `@sysgov/ui`.
- [x] 3.3 Implementar lazy loading em `ConcessoesView.tsx` para carregar a listagem de titulares (`cemiteriosApi.titulares()`) apenas quando a sub-aba de Titulares for ativada pelo usuário.

## 4. Validação Integrada e Homologação de Desempenho

- [x] 4.1 Executar a navegação no módulo de cemitérios via navegador e verificar no DevTools Network que o tempo total de carregamento da tela de inventário é inferior a 1 segundo e que requisições desnecessárias foram extintas.
- [x] 4.2 Executar os testes automatizados do backend (`php artisan test --filter=Cemiterios`) e do frontend para homologar a ausência de regressões funcionais.
