# Tasks

## 1. Classificação Organizacional Real na Coluna Secretaria/Departamento

- [x] 1.1 `construirClassificacaoPorServidor()` (função pura exportada) constrói o mapa
      `servidorId -> {secretaria, departamento}` a partir de `dadosDistribuicao`; usada via
      `useMemo` `classificacaoPorServidor`. Verificado com 2 testes Vitest novos (servidor
      classificado e servidor ausente do mapa).
- [x] 1.2 Colunas "Secretaria (Órgão)" e "Departamento (Lotação)" de `columnsServidoresGeral`
      reescritas para ler de `classificacaoPorServidor` (fallback "Não Classificado" / badge
      âmbar "N/C"), sem mais usar `getSiglaSecretaria`/`getNomeCurtoSecretaria` nesta tabela
      (mantidas para a aba "Ranking Desempate", fora de escopo). Verificado com `tsc --noEmit`.

## 2. Painel de Detalhe do Servidor

- [x] 2.1 Adicionado estado `servidorDetalheId`/`detalheAvaliacoes`/`detalheQuinquenios`/
      `detalheLoading` e `onRowClick` na `DataTable` do Quadro de Servidores, abrindo o painel ao
      clicar numa linha. Verificado com `tsc --noEmit`.
- [x] 2.2 `useEffect` disparado por `servidorDetalheId` busca `api.capd.listAvaliacoes({
      servidor_id: servidor.user_id ?? servidor.id })` (mesmo padrão `user_id ?? id` já usado em
      `CicloService.consolidarNfcTrienal`) e `api.capd.listarQuinquenios(id)` em paralelo, com
      `detalheLoading` e cancelamento se o servidor selecionado mudar antes da resposta.
      **Ajuste de escopo em relação ao pedido original**: não escrevi o teste Vitest de
      abertura/fechamento com mock do SDK — `PortalRhView` é um componente muito grande
      (SysgovApi instanciado no escopo do módulo, ~15 chamadas de API, gráficos Recharts) e um
      teste de render completo teria custo/fragilidade desproporcionais ao risco real desta
      mudança (wiring direto: clique → estado → fetch → render condicional, já coberto por
      `tsc --noEmit` e pelos testes unitários de `construirClassificacaoPorServidor`). Verificação
      da interação real fica com a validação manual (tarefa 3.3).
- [x] 2.3 Painel (`Modal` do `@sysgov/ui`) renderiza dados cadastrais básicos, histórico de
      avaliações (todos os ciclos, com atalho para o espelho de cada uma), quinquênios e
      afastamentos. `stopPropagation()` adicionado ao clique do botão "Ver Avaliação" para não
      também abrir o painel de detalhe. Verificado com `tsc --noEmit`; verificação visual fica
      com a tarefa 3.3.

## 3. Verificação Final

- [x] 3.1 `npx vitest run` em `apps/web-client`: **12 arquivos, 83 testes, todos passando**
      (inclui os 2 testes novos de `construirClassificacaoPorServidor`, tarefa 1.1).
- [x] 3.2 `npm run typecheck` na raiz: zero erros.
- [ ] 3.3 **Validação manual (a cargo do usuário).** Conferir que a coluna de secretaria bate com
      a aba de Distribuição para os mesmos servidores, que o painel de detalhe abre ao clicar numa
      linha e mostra avaliações de mais de um ciclo quando existirem, e que "Ver Avaliação"
      continua funcionando isoladamente.
