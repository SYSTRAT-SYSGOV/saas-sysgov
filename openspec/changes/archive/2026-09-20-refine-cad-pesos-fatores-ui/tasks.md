# Tasks: Refinamento da Aba Pesos dos Fatores e Eliminação de Cards Duplicados

## 1. Supressão de Cards Conflitantes no Portal da CAD

- [x] 1.1 Adicionar a aba `pesos` à condicional de supressão dos StatCards gerais em `PortalCadView.tsx` (`activeTab === 'perguntas' || activeTab === 'escalas' || activeTab === 'pesos'`) e verificar que os cards genéricos do órgão deixam de ser exibidos.

## 2. Indicadores e Distribuição Visual em FatoresPesosPanel

- [x] 2.1 Implementar 4 StatCards dedicados em `FatoresPesosPanel.tsx` (Soma Total dos Pesos com badge de conformidade 100%, Total de Fatores Ativos, Situação do Fator H Redistribuível e Média Ponderada por Fator) utilizando `@sysgov/ui` e `JetBrains Mono` (`font-mono tabular-nums`).
- [x] 2.2 Desenvolver a barra visual empilhada (Stacked Distribution Bar de 0% a 100%) mostrando graficamente a fatia percentual de cada fator ativo com legendas e cores semânticas harmoniosas.

## 3. Utilitários de Ponderação e Aprimoramento da Tabela

- [x] 3.1 Implementar utilitários rápidos de balanceamento ("Balancear em 100%", "Distribuição Equitativa" e "Restaurar Original") ajustando os percentuais em memória com precisão de duas casas decimais.
- [x] 3.2 Aprimorar o layout da tabela de fatores com badges de identificação, inputs ergonômicos e switch intuitivo do Fator H redistribuível acompanhado de notas explicativas da Lei nº 1.704/2006.

## 4. Verificação de Integridade e Validação

- [x] 4.1 Executar checagem de tipos TypeScript (`npx tsc --noEmit`) e testes unitários do frontend (`npx vitest`) em `apps/web-client` assegurando ausência de erros ou quebras de regressão.
