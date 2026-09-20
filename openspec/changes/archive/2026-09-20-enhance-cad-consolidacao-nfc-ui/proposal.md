# Proposal: Aprimoramento da Aba Consolidação NFC Trienal & Ranking e Eliminação de Cards Duplicados

## Why

No Portal da CAD (`PortalCadView.tsx`), ao acessar a aba "Consolidação NFC Trienal & Ranking", o container exibia cards gerais de governança do órgão (Recursos na CAD, Sessões Seladas, Portarias e Ciclo Vigente) no topo da visualização antes do painel de consolidação. Paralelamente, o próprio painel (`ConsolidacaoPanel.tsx`) exibia seus próprios cards de métricas, gerando duplicidade e excesso de cartões descontextualizados na tela. Além disso, o painel de consolidação carecia de um panorama analítico aprofundado sobre o desfecho do triênio, como taxa percentual de aptidão à estabilidade/progressão, distribuição visual dos conceitos avaliativos (Excelente, Bom, Regular e Insuficiente) e detalhamento dos critérios legais de desempate previstos no Art. 39 da Lei nº 1.704/2006.

Esta proposta elimina a duplicidade de cards no Portal da CAD para a aba `consolidacao` e enriquece integralmente o `ConsolidacaoPanel.tsx` com StatCards analíticos canônicos, régua gráfica de distribuição conceitual e transparência regulamentar das regras de desempate e encaminhamento ao Plano de Melhoria de Desempenho (PMD - Art. 40).

## What Changes

- **Eliminação de Cards Conflitantes no Portal da CAD**: Atualizar `PortalCadView.tsx` para incluir `activeTab === 'consolidacao'` na supressão dos StatCards gerais de governança, garantindo que a aba Consolidação gerencie exclusivamente seus próprios indicadores especializados.
- **Modernização e Expansão dos StatCards em `ConsolidacaoPanel.tsx`**:
  - *Quadro Geral do Triênio*: Total de servidores avaliados e ciclos anuais considerados no triênio com `font-mono tabular-nums`.
  - *Servidores Aptos & Taxa de Sucesso*: Quantitativo absoluto e percentual de aptidão à progressão e estabilidade (NFC ≥ nota de corte regulamentar).
  - *Inaptos & Encaminhamento ao PMD*: Quantitativo de servidores abaixo da nota de corte com sinalização preventiva sobre a obrigatoriedade legal de abertura de Plano de Melhoria de Desempenho (Art. 40).
  - *Nota de Corte & Média Global*: Exibição da nota de corte com status e média geral da NFC apurada entre todos os servidores.
- **Régua Visual de Distribuição de Conceitos Avaliativos**:
  - Barra contínua empilhada (Excelente, Bom, Regular, Insuficiente) com as cores semânticas oficiais do Design System SYSGOV.
  - Indicadores quantitativos e percentuais por faixa de conceito.
- **Quadro Informativo de Regras Legais de Desempate (Art. 39, Lei 1.704/2006)**:
  - Painel colapsável ou card explicativo com os 3 critérios de desempate canônicos aplicados no ranking: 1º Maior NFC, 2º Tempo de serviço no cargo/órgão e 3º Idade mais avançada.
- **Refinamento Geral das Tabelas e Ações**:
  - Padronização rigorosa da tipografia técnica em `JetBrains Mono` (`font-mono tabular-nums`).
  - Feedback interativo claro para o processamento de consolidação e exportação em lote.

## Capabilities

### Modified Capabilities
- `capd`: Requisitos de apresentação dedicada sem cards redundantes da aba de Consolidação NFC Trienal no Portal da CAD e enriquecimento de indicadores analíticos e distribuição de conceitos no painel.

## Impact

- `apps/web-client/src/modules/capd/views/PortalCadView.tsx`: Inclusão da aba `consolidacao` na verificação de supressão dos StatCards gerais.
- `apps/web-client/src/modules/capd/ConsolidacaoPanel.tsx`: Redesenho dos StatCards com componentes `@sysgov/ui`, adição de barra gráfica de conceitos e guia dos critérios de desempate.
- Nenhuma quebra ou alteração nos contratos da API backend de consolidação (`/capd/consolidacao/{ciclo}/...`).
