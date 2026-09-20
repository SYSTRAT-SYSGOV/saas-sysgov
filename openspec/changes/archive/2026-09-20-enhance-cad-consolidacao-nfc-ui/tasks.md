# Tasks: Aprimoramento da Aba Consolidação NFC Trienal & Ranking e Eliminação de Cards Duplicados

## 1. Supressão de Cards Redundantes no Portal da CAD

- [x] 1.1 Adicionar a aba `consolidacao` à condicional de supressão dos StatCards gerais em `PortalCadView.tsx` (`activeTab === 'perguntas' || activeTab === 'escalas' || activeTab === 'pesos' || activeTab === 'consolidacao'`) e verificar que os cards genéricos deixam de ser exibidos.

## 2. Modernização de Indicadores e Régua de Conceitos em ConsolidacaoPanel

- [x] 2.1 Refatorar os cartões de métricas de `ConsolidacaoPanel.tsx` para StatCards do `@sysgov/ui` com `font-mono tabular-nums`, calculando a taxa percentual de aptidão e a média global das notas no triênio.
- [x] 2.2 Desenvolver a barra visual empilhada (Concept Distribution Bar de 0% a 100%) mostrando graficamente a partição dos servidores por conceito (Excelente, Bom, Regular e Insuficiente) com cores semânticas oficiais e badges do Design System.

## 3. Transparência das Regras de Desempate Legal

- [x] 3.1 Implementar painel informativo contextual na visualização do Ranking de Progressão com os 3 critérios de desempate estabelecidos no Art. 39 da Lei nº 1.704/2006 (1º Maior NFC, 2º Tempo de serviço e 3º Idade mais avançada).

## 4. Verificação e Testes

- [x] 4.1 Executar validação de tipos TypeScript (`npx tsc --noEmit`) e testes unitários do módulo CAPD (`npx vitest`) em `apps/web-client` assegurando conformidade e integridade.
