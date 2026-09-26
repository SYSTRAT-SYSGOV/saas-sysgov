# Tasks: Alertas de Inteligência Regulológica (Concessões & Exumações)

## 1. Funções de Cálculo Regulatório e Sanitário

- [x] 1.1 Criar `src/modules/cemiterios/regulamentacao.utils.ts` contendo funções puras para cálculo de expiração de concessão temporária, contagem de interstício legal de inumação ($\ge 3$ anos) e consolidação de alertas regulatórios.
- [x] 1.2 Desenvolver testes unitários completos em `src/modules/cemiterios/__tests__/regulamentacao.utils.test.ts` cobrindo cenários de concessão perpétua, vencida, prestes a vencer e inumação elegível ou em interstício.

## 2. Componentes Visuais de Alertas e Diagnóstico

- [x] 2.1 Criar o componente `BadgeAlertaRegulatorio.tsx` utilizando `Badge` de `@sysgov/ui` com ícones semânticos e contadores numéricos em JetBrains Mono (`font-mono tabular-nums`).
- [x] 2.2 Criar o componente `PainelRegulatorioDrawer.tsx` para exibição no Drawer com diagnóstico completo de prazos, amparo legal e acionador de notificação/processo.

## 3. Integração nos Filtros e na Listagem do Inventário

- [x] 3.1 Atualizar `InventarioFiltros.tsx` adicionando o filtro de critério regulatório (Elegível para Exumação, Concessão Vencida, Concessão a Vencer, Crítico).
- [x] 3.2 Atualizar `InventarioView.tsx` aplicando a filtragem regulatória no hook/estado e renderizando os badges de alerta nas linhas da tabela e o `PainelRegulatorioDrawer` no Drawer de detalhes.

## 4. Testes Automatizados e Homologação

- [x] 4.1 Desenvolver testes unitários para os componentes visuais (`BadgeAlertaRegulatorio.test.tsx` e `PainelRegulatorioDrawer.test.tsx`).
- [x] 4.2 Executar a suíte de testes do módulo de cemitérios (`npm test --workspace apps/web-client`) e garantir 100% de sucesso.

