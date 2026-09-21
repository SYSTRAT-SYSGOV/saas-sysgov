# Tasks: Modernização da Aba de Exportação para Folha de Pagamento

## 1. Funções Puras Financeiras e Geradores de ERPs

- [x] 1.1 Criar o módulo utilitário `apps/web-client/src/modules/capd/views/PortalRhView.folha.ts` com as interfaces de tipagem `ItemFolhaExport`, `FiltrosFolhaExport` e `KpisFolhaExport`.
- [x] 1.2 Implementar os cálculos monetários em centavos inteiros (`cents`), cálculo de impacto mensal (+10%), impacto anual com 13º e 1/3 de férias, e a função pura `calcularKpisFolhaExport`.
- [x] 1.3 Implementar a função pura `filtrarServidoresFolha` aplicando conjunção lógica (termo de busca, secretaria, departamento, cargo, faixa salarial, elegibilidade e magnitude de impacto).
- [x] 1.4 Implementar os geradores de arquivos CSV especializados com BOM UTF-8: `gerarCsvBetha`, `gerarCsvIpm`, `gerarCsvGoverna` e `gerarCsvUniversal`.
- [x] 1.5 Criar a suíte de testes unitários `apps/web-client/src/modules/capd/views/__tests__/PortalRhView.folha.test.ts` e verificar a execução com sucesso via `npx vitest run apps/web-client/src/modules/capd/views/__tests__/PortalRhView.folha.test.ts`.

## 2. Redesenho e Otimização do Grid DataTable

- [x] 2.1 Mapear os servidores enriquecidos para a folha de pagamento consumindo a lotação real de `classificacaoPorServidor` e os dados consolidados do ranking em `PortalRhView.tsx`.
- [x] 2.2 Reestruturar a definição de colunas `columnsFolha` com badges semânticos de reajuste (+10% homologado vs Retido em PMD), valores monetários em `font-mono tabular-nums` e colunas atômicas com `exportOnly: true`.
- [x] 2.3 Configurar o `DataTable` com dimensionamento fluído e responsivo, eliminando a barra de rolagem horizontal desnecessária no desktop (resoluções 1366px e 1920px).

## 3. Barra de Busca Rápida, Quick Filters e Filtros Avançados

- [x] 3.1 Adicionar a barra de busca rápida por texto com suporte a nome, matrícula, CPF ou cargo, com indicador de contagem de servidores filtrados.
- [x] 3.2 Implementar a barra de Quick Filters em 1 clique ("Todos", "Aptos ao Reajuste (+10%)", "Retidos (PMD)", "Impacto > R$ 500/mês", "Estatutários") com sincronização bidirecional do estado.
- [x] 3.3 Construir o painel colapsável de Filtros Avançados com seletores dinâmicos de Secretaria, Departamento, Cargo, Faixa Salarial e Situação de Homologação, com botão de limpar filtros.

## 4. Painel Executivo de KPIs, Menu de Exportação Multi-ERP e Validação Final

- [x] 4.1 Implementar a barra de KPIs orçamentários no topo da aba com 4 cartões de métricas (Folha Base Mensal, Impacto Mensal da Progressão, Impacto Anual Projetado e Efetivo Apto vs PMD), utilizando tipografia técnica JetBrains Mono (`font-mono tabular-nums`).
- [x] 4.2 Implementar o menu/modal de exportação especializado permitindo download direto nos formatos Betha Sistemas, IPM Atende.Net, Governa/CECAM ou CSV Universal.
- [x] 4.3 Executar a verificação de tipagem TypeScript com `npm run typecheck --workspace=@sysgov/web-client` garantindo zero erros de compilação.
- [x] 4.4 Executar a suíte completa de testes unitários do workspace com `npm test --workspace=@sysgov/web-client` e verificar aprovação de 100% dos testes.
