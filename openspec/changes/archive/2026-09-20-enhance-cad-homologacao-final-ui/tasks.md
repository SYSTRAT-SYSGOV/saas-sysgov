# Tasks: Aprimoramento da Aba Homologação Final e Eliminação de Cards Duplicados

## 1. Supressão de Cards Redundantes no Portal da CAD

- [x] 1.1 Adicionar a aba `homologacao` à condicional de supressão dos StatCards gerais em `PortalCadView.tsx` (`activeTab === 'perguntas' || activeTab === 'escalas' || activeTab === 'pesos' || activeTab === 'consolidacao' || activeTab === 'homologacao'`) e verificar que os cards genéricos deixam de ser exibidos.

## 2. Modernização de Indicadores e Portões de Validação (Audit Gates)

- [x] 2.1 Implementar 4 StatCards dedicados da Homologação Final (Situação Regimental do Ciclo, Avaliações Concluídas, Fila Recursal Deliberada e Atas Seladas com Hash SHA-256) utilizando `@sysgov/ui` e `JetBrains Mono` (`font-mono tabular-nums`).
- [x] 2.2 Desenvolver o painel dinâmico de Portões de Validação Regimental (Audit Gates RN-C07 a RN-C09) com verificação visual dos 4 requisitos mandatórios e cálculo de impedimentos em tempo real.

## 3. Despacho Outbox e Homologação Segura

- [x] 3.1 Implementar painel informativo do Despacho Outbox (`capd.ciclo_homologado`), termo de imutabilidade jurídica das notas e ação de homologação protegida via `Modal` institucional do `@sysgov/ui`.

## 4. Verificação e Testes

- [x] 4.1 Executar validação de tipos TypeScript (`npx tsc --noEmit`) e testes unitários do módulo CAPD (`npx vitest`) em `apps/web-client` assegurando conformidade e integridade.
