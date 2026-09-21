# Tasks

## 1. Funções Puras e Testes Unitários de Filtragem e KPIs

- [x] 1.1 Criar a interface `FiltrosQuadroServidores` e a função pura `filtrarServidoresQuadro` em `apps/web-client/src/modules/capd/views/PortalRhView.quadro.ts`, cobrindo filtragem por busca textual, secretaria, departamento contextual, regime jurídico, condição probatória e situação funcional. Verificar com suite de testes unitários no Vitest (`npx vitest run apps/web-client/src/modules/capd/views/PortalRhView.quadro.test.ts`).
- [x] 1.2 Implementar a função pura `calcularKpisQuadroServidores` calculando Total de Servidores, Estagiários com percentual, Estáveis com percentual e Índice de Alocação Institucional. Verificar com testes unitários cobrindo cenários com dados normais, listas vazias e servidores sem lotação definida.

## 2. Redesenho de Colunas e Otimização do Grid (Eliminação do Scroll Horizontal)

- [x] 2.1 Reformular a definição `columnsServidoresGeral` em `PortalRhView.tsx`, unificando dados afins: Servidor Público (Matrícula mono + Nome + CPF/e-mail), Cargo & Regime (Cargo efetivo + indicador de regime), Lotação Institucional (Secretaria em badge + Departamento), Chefia Imediata, Vínculo & Situação (Estágio com fase vs Estável + Ativo/Afastado) e Ações.
- [x] 2.2 Configurar `meta.exportHeader` e `meta.exportValue` em cada coluna para garantir que exportações em CSV, Excel e PDF gerem colunas separadas e atômicas (Secretaria e Departamento em colunas próprias nos arquivos exportados).
- [x] 2.3 Otimizar os tamanhos (`size`) e suprimir travas rígidas de largura mínima (`min-w-[...]`) das células internas da tabela, assegurando que o conjunto de colunas caiba fluidamente em 100% do container sem gerar barra de rolagem lateral (scroll horizontal) em resoluções desktop (>= 1024px). Verificar com `npm run typecheck`.

## 3. Painel de Filtros Avançados e Pílulas Rápidas (Quick Filters)

- [x] 3.1 Implementar barra de busca ágil combinada com pílulas de acesso rápido (Quick Filters: "Todos", "Estágio Probatório", "Estáveis", "Sem Lotação") na aba do Quadro de Servidores, com alternância em 1 clique.
- [x] 3.2 Construir o painel colapsável de Filtros Avançados com os seletores: Secretaria (populada com base na árvore real do organograma), Departamento (dinamicamente filtrado conforme a secretaria selecionada), Regime Jurídico, Condição Probatória, Situação Funcional e botão "Limpar Filtros".
- [x] 3.3 Integrar o contador dinâmico de registros ("Exibindo X de Y servidores") com chips dos filtros atualmente ativos e tratamento de estado vazio ("Nenhum servidor corresponde aos filtros aplicados").

## 4. Cabeçalho Executivo de KPIs e Verificação Final

- [x] 4.1 Inserir no topo da aba "Quadro de Servidores" o painel com 4 cartões de KPIs dinâmicos (Total de Servidores, Em Estágio Probatório com %, Servidores Estáveis com % e Lotação Regular), com tipografia técnica obrigatória `font-mono tabular-nums` e paleta semântica oficial do Design System SYSGOV.
- [x] 4.2 Executar a validação automatizada de tipagem (`npm run typecheck`) e a suíte completa de testes no Vitest (`npx vitest run`), garantindo que todos os testes passem sem regressões.
- [x] 4.3 Realizar a validação manual dos fluxos de interação na aba Quadro de Servidores: aplicar filtros combinados, verificar ausência de rolagem horizontal no desktop, acionar modal de detalhes e testar exportação.
