# Design: Refinamento da Aba Consolidação NFC Trienal & Ranking e Supressão de Cards Redundantes

## Context

Atualmente, `PortalCadView.tsx` suprime os cards gerais de governança para as abas `perguntas`, `escalas` e `pesos`, mas não para `consolidacao`. Com isso, ao selecionar a aba de Consolidação, a página exibe 4 cards gerais no topo e mais 4 cards de KPIs dentro de `ConsolidacaoPanel.tsx`, criando duplicação, distração e excesso de cartões na tela.

Além disso, `ConsolidacaoPanel.tsx` utilizava uma implementação simplificada de `KpiCard`, sem percentuais de aptidão, sem visão da média global das notas, sem régua de distribuição dos conceitos avaliativos e sem explicação clara dos critérios de desempate estabelecidos no Art. 39 da Lei nº 1.704/2006.

Ver motivação em `proposal.md` e requisitos em `specs/capd/spec.md`.

## Goals / Non-Goals

**Goals:**
- Ajustar a condicional de `PortalCadView.tsx` para incluir `activeTab === 'consolidacao'` na supressão dos StatCards gerais.
- Refatorar os indicadores de `ConsolidacaoPanel.tsx` para `StatCard` do `@sysgov/ui`, integrando `JetBrains Mono` (`font-mono tabular-nums`), cálculo de taxa percentual de aptidão e média global da NFC.
- Desenvolver barra visual empilhada (Concept Distribution Bar de 0% a 100%) demonstrando a proporção de servidores classificados em cada conceito (Excelente, Bom, Regular e Insuficiente).
- Implementar componente instrutivo dos critérios regimentais de desempate do ranking de progressão funcional (Art. 39, Lei 1.704/2006).
- Assegurar conformidade integral com `AGENTS.md` e `DESIGN_SYSTEM.md`.

**Non-Goals:**
- Alterar as fórmulas matemáticas ou serviços de cálculo da NFC e ranking no backend (`CicloService::consolidarNfcTrienal()`).
- Modificar os esquemas de banco de dados ou endpoints REST.

## Decisions

### Decisão 1: Supressão dos StatCards Gerais no Portal
- **Decisão**: Adicionar `activeTab === 'consolidacao'` na condicional de supressão do `PortalCadView.tsx`.
- **Racional**: A Consolidação Trienal é um processo autônomo com suas próprias métricas de triênio, aptidão e corte. Exibir cards de recursos e sessões acima desse painel gera confusão visual.

### Decisão 2: StatCards com Análise Percentual e Média Global
- **Decisão**: Calcular dinamicamente na interface:
  - Taxa de aptidão: `((aptos / total) * 100).toFixed(1)%`
  - Média global da NFC: média das notas válidas dos servidores cadastrados
  - Inaptos: quantitativo com alerta legal de encaminhamento ao PMD (Art. 40 da Lei 1.704/2006).
- **Racional**: Fornece aos membros da CAD uma leitura gerencial imediata da eficácia do ciclo trienal.

### Decisão 3: Barra Empilhada de Conceitos
- **Decisão**: Renderizar uma barra horizontal flex fatiada com as contagens de cada conceito, usando as cores semânticas oficiais:
  - Excelente: `bg-emerald-500`
  - Bom: `bg-indigo-500`
  - Regular: `bg-amber-500`
  - Insuficiente: `bg-rose-500`
- **Racional**: Permite visualizar rapidamente a curva de desempenho do órgão no triênio.

## Risks / Trade-offs

- **[Risco]** Ciclos sem avaliações concluídas ou sem dados consolidados.
  - *Mitigação*: O painel já possui tratamento com `EmptyState` e `ScreenState` para carregamento e estado vazio, garantindo que os cards e a régua sejam renderizados somente quando houver dados calculados.
