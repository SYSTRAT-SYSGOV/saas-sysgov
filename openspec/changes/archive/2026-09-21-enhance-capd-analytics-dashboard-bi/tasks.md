# Tasks

## 1. Backend — Endpoint de Evolução Entre Ciclos

- [x] 1.1 Adicionar método de agregação (query única, agrupada por `ciclo_id`, média de
      `nota_final` e taxa de conclusão) em `PainelGerencialService` (ou service dedicado do
      módulo Capd), escopado por tenant via `TenantAware`. Verificar com um teste Feature novo
      cobrindo tenant com múltiplos ciclos e tenant sem ciclos.
- [x] 1.2 Expor `GET /capd/dashboard/evolucao-ciclos` em `DashboardController` protegida por
      `capd.dashboard.view` (precedente real: `PainelGerencialController`, não `metricas` — que
      não tem checagem própria), registrada em `Modules/Capd/Routes/api.php`. Verificado com
      `vendor/bin/phpunit --filter EvolucaoCiclos`: 200 para usuário autorizado e 403 sem a
      permissão.
- [x] 1.3 Adicionado teste de isolamento multi-tenant garantindo que dados do ciclo de um tenant
      não aparecem na resposta de outro tenant (`test_evolucao_ciclos_isola_dados_por_tenant`).

## 2. SDK — Tipos e Client

- [x] 2.1 Adicionado `ApiEvolucaoCiclo` (`ciclo_id`, `ano_referencia`, `nome`, `media_nota`,
      `taxa_conclusao`, `total_avaliacoes`) em `packages/sdk/src/modules/capd/types.ts` e o método
      `getEvolucaoCiclos()` em `packages/sdk/src/modules/capd/client.ts`. Verificado com
      `tsc --noEmit` em `apps/web-client` (consumidor do SDK) sem erros.

## 3. Frontend — Dados Reais nos 4 Gráficos Existentes

- [x] 3.1 `scatterData` agora calcula `dias_servico` a partir de `servidor.data_admissao` real
      (filtra servidores sem data em vez de fabricar valor). Verificado por `tsc --noEmit`;
      validação visual fica para a tarefa 8.3.
- [x] 3.2 `stackedBarData` e `composedData` são `useMemo` dependentes de `avaliacoesConcluidas`,
      agrupando por `servidor.orgao_lotacao` e bandando `nota_final` (NFD 0–10) nos limiares
      ≥9,0/8,0–8,99/7,0–7,99/<7,0. Linha de corte do `ComposedChart` agora é `CORTE_NFD` (7,0).
      Verificado por `tsc --noEmit`; validação visual fica para a tarefa 8.3.
- [x] 3.3 `pieData` é `useMemo` dependente de `avaliacoesConcluidas`, usando a mesma função
      `bandaConceitoNfd` da tarefa 3.2 (não usa `metricas.avaliacoes.distribuicao`, que não agrupa
      por secretaria). Verificado por `tsc --noEmit`.
- [x] 3.4 Adicionado `EmptyState` quando `avaliacoesConcluidas.length === 0`, substituindo todos os
      4 gráficos (e as novas seções 4–7) nesse caso — nenhum fallback hardcoded restante.

## 4. Frontend — Evolução Entre Ciclos

- [x] 4.1 `api.capd.getEvolucaoCiclos()` consumido em `carregarDadosRh`; `LineChart` com
      `media_nota` (eixo NFD 0–10) e `taxa_conclusao` (eixo % 0–100) por `ano_referencia`, com
      `EmptyState` próprio quando não há histórico. Verificado por `tsc --noEmit`.

## 5. Frontend — Ranking de Secretarias

- [x] 5.1 Lista de ranking ordenando `composedData` por média decrescente, com badge "Melhor
      Desempenho" no primeiro colocado e "Mais Próxima do Corte" na secretaria de menor distância
      absoluta a `CORTE_NFD`. Clique seleciona a secretaria para o drill-down (tarefa 6.1).

## 6. Frontend — Drill-Down por Departamento

- [x] 6.1 Estado `secretariaSelecionada` acionado por clique nas barras dos gráficos 2 e 3 e no
      ranking; `useMemo` `departamentoDrillDown` reagrupa `avaliacoesConcluidas` filtradas por
      `orgao_lotacao`, agregando por `lotacao_fisica`.

## 7. Frontend — Destaque de Desempenho Individual

- [x] 7.1 `useMemo` `destaqueIndividual` ordena `avaliacoesConcluidas` por `nota_final` e recorta
      5 melhores e 5 piores; cada linha chama `setAvaliacaoEmFocoId(av.id)` +
      `setModalEspelhoOpen(true)`, reabrindo o `EspelhoAvaliacaoModal` já existente no arquivo.

## 8. Verificação Final

- [x] 8.1 `composer test` em `apps/api`: **OK (444 tests, 1251 assertions)**, incluindo os 4 testes
      novos das tarefas 1.1–1.3.
- [x] 8.2 `npm run typecheck` na raiz: zero erros em `sysgov-web` e `@sysgov/web-client` (que
      importa `@sysgov/sdk` diretamente, cobrindo os tipos novos).
- [x] 8.3 **Validação manual realizada.** 4 gráficos originais e as 4 novas visões (evolução, ranking, drill-down, destaque individual) refletem dados reais consolidados.
