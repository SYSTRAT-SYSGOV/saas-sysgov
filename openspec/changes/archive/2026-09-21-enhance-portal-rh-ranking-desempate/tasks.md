# Tasks: Modernização da Aba Classificação Oficial & Desempate Art. 39

## 1. Funções Puras e Testes Unitários de Desempate

- [x] 1.1 Criar o módulo utilitário `apps/web-client/src/modules/capd/views/PortalRhView.desempate.ts` com as interfaces de tipagem `ItemRankingDesempate`, `FiltrosRankingDesempate` e `KpisRankingDesempate`.
- [x] 1.2 Implementar o algoritmo de ordenação legal do Art. 39 da Lei 1.704/2006 com flag de identificação de empate (`possuiEmpatePontuacao`) e critério determinante (`'dias_servico'` ou `'idade'`).
- [x] 1.3 Implementar as funções puras `filtrarRankingDesempate` (aplicando termo de busca, secretaria, departamento, cargo, conceito, elegibilidade e filtro de empates) e `calcularKpisRankingDesempate`.
- [x] 1.4 Criar a suíte de testes unitários `apps/web-client/src/modules/capd/views/__tests__/PortalRhView.desempate.test.ts` e verificar a execução com sucesso via `npx vitest run apps/web-client/src/modules/capd/views/__tests__/PortalRhView.desempate.test.ts`.

## 2. Redesenho e Otimização do Grid DataTable

- [x] 2.1 Integrar a lotação real de cada servidor no ranking utilizando `classificacaoPorServidor.get(s.id)` e a estrutura do organograma institucional em `PortalRhView.tsx`.
- [x] 2.2 Reestruturar a definição de colunas `columnsDesempate`, adicionando badges para classificação oficial, identificador visual de servidores empatados e colunas atômicas com `exportOnly: true` para exportação CSV rica.
- [x] 2.3 Configurar o `DataTable` com dimensionamento fluído e responsivo, eliminando a barra de rolagem horizontal desnecessária no desktop (resoluções 1366px e 1920px).

## 3. Barra de Busca Rápida, Quick Filters e Filtros Avançados

- [x] 3.1 Adicionar a barra de busca rápida por texto com suporte a nome, matrícula ou cargo, com indicador de contagem de servidores filtrados.
- [x] 3.2 Implementar a barra de Quick Filters em 1 clique ("Todos", "Elegíveis (≥70)", "Empates Art. 39", "Excelente (≥90)", "Em PMD (<70)") com sincronização bidirecional do estado.
- [x] 3.3 Construir o painel colapsável de Filtros Avançados com seletores dinâmicos de Secretaria, Departamento, Cargo, Faixa de Conceito, Elegibilidade e alternador de Empates do Art. 39, com botão de limpar filtros.

## 4. Painel Executivo de KPIs e Validação Final

- [x] 4.1 Implementar a barra de KPIs no topo da aba com 4 cartões de métricas (Total Ranqueados, Aptos à Progressão, Em PMD e Empates Desempatados), utilizando tipografia técnica JetBrains Mono (`font-mono tabular-nums`).
- [x] 4.2 Executar a verificação de tipagem TypeScript com `npm run typecheck --workspace=@sysgov/web-client` garantindo zero erros de compilação.
- [x] 4.3 Executar a suíte completa de testes unitários do workspace com `npm test --workspace=@sysgov/web-client` e verificar aprovação de 100% dos testes.
