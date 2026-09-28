# Tasks: Implementação da Evolução da Aba de Operações

## 1. Backend e Camada de API de Operações

- [x] 1.1 Expandir filtros e consultas no `OrdemServicoController.php` para aceitar parâmetros de busca textual (`busca`), intervalo de datas (`data_inicio`, `data_fim`) e equipe (`equipe`), com eager loading otimizado de jazigo e cemitério. Verificar via testes PHPUnit ou chamada de endpoint.
- [x] 1.2 Atualizar as tipagens e o cliente da API em `apps/web-client/src/modules/cemiterios/api.ts` para refletir os novos parâmetros de filtragem de ordens de serviço. Verificar ausência de erros de compilação TypeScript (`tsc -b`).

## 2. Indicadores Operacionais e Filtros Avançados

- [x] 2.1 Criar o componente `OperacoesKpis.tsx` utilizando `KpiCard` do `@sysgov/ui` para exibir: total de ordens abertas, ordens em execução no dia, sepultamentos no mês e exumações/trasladações ativas, contextualizados à necrópole ativa. Verificar renderização correta com dados mockados.
- [x] 2.2 Criar o componente `FiltrosAvancadosOperacoes.tsx` fornecendo caixa de busca rápida, seleção de situação (todas, emitida, em_execucao, concluida, suspensa, cancelada), tipo de serviço (inumacao, exumacao, trasladacao), intervalo de datas agendadas e botão para limpar filtros. Verificar disparo dos callbacks de alteração.

## 3. Listagem de Ordens de Serviço (DataTable e Alternância de Visão)

- [x] 3.1 Criar o componente `OrdensServicoDataTable.tsx` utilizando `DataTable` do `@sysgov/ui`, definindo colunas estruturadas para número/ano (em `JetBrains Mono`), tipo de operação, jazigo/gaveta, falecido, data agendada, equipe, badges de situação semânticos e ações contextuais de transição. Verificar ordenação e paginação.
- [x] 3.2 Implementar seletor de alternância de visão (`'tabela' | 'cards'`) em `OperacoesView.tsx`, mantendo a grade de cartões otimizada para equipe de campo em telas móveis e a tabela estruturada para estações de trabalho. Verificar alternância sem perda de filtros.
- [x] 3.3 Criar o componente `ModalDetalheOrdemServico.tsx` com tamanho amplo (`size="2xl"`), exibindo raio-x minucioso da ordem de serviço, dados do falecido, identificador do túmulo, histórico de transições de status com justificativas e botão para download do PDF. Verificar abertura ao clicar na linha da tabela.

## 4. Evolução das Listagens de Inumações e Exumações

- [x] 4.1 Aprimorar a tabela de `Inumacoes` com `DataTable` do `@sysgov/ui`, seletor de tamanho de página (10, 25, 50, 100 itens), busca por falecido/certidão e botão de ação direta para abrir o `ModalDetalheJazigo.tsx`. Verificar transição de abas e abertura do modal do túmulo.
- [x] 4.2 Aprimorar a listagem de `Exumacoes` e adicionar aba/visão para histórico de `Trasladacoes`, apresentando jazigo de origem, jazigo ou município de destino e documentação de transporte. Verificar renderização dos registros.

## 5. Testes Automatizados e Homologação Final

- [x] 5.1 Criar suite de testes unitários `apps/web-client/src/modules/cemiterios/views/__tests__/OperacoesViewEvolucao.test.tsx` validando renderização de KPIs, filtros avançados, alternância de modo de visualização (tabela versus cards), abertura do modal de detalhes e transições de status de OS. Verificar aprovação no Vitest.
- [x] 5.2 Executar a suite completa de testes frontend (`npm --prefix apps/web-client test -- --run`) e a compilação do bundle de produção (`npm --prefix apps/web-client run build`) assegurando 100% de testes verdes e zero advertências.
