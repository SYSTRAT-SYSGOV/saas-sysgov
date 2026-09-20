# Proposal

## Why

A aba de Escalas Gráficas no Portal da Comissão de Avaliação e Desempenho (CAD) é o centro de parametrização da régua de avaliação funcional no SAPDS, fundamentada na Metodologia Canônica de Escala Gráfica de Chiavenato (graus 1 a 5, pontuação contínua de 0 a 100 pontos e conversão escalar, conforme RF-03).

Atualmente, o painel existente (`EscalaGraficaPanel.tsx`) possui limitações operacionais significativas:
1. Permite apenas a criação simplificada de novas escalas com 5 graus fixos, sem possibilidade de edição (`PUT`), exclusão com modal seguro (`DELETE`), ou alternância direta de escala ativa.
2. Não possui validação de continuidade das faixas numéricas (gaps ou sobreposições entre graus adjacentes).
3. Não oferece presets rápidos (templates de 3, 4 e 5 graus Chiavenato).
4. Carece de indicadores gerenciais (KPIs em StatCard) e de representação visual dinâmica da régua contínua colorida por graduação tonal.
5. Não dispõe de um simulador interativo de conversão e enquadramento de notas, essencial para os membros da comissão testarem as réguas paramétricas e visualizarem as travas antileniência associadas aos graus extremos (1, 2 e 5).

Modernizar e completar essa aba garante à CAD autonomia plena para configurar, validar, simular e auditar os instrumentos avaliativos com conformidade estrita aos preceitos da Lei nº 1.704/2006 e ao Design System `@sysgov/ui`.

## What Changes

- **KPIs Executivos da CAD**: Inclusão de StatCards no topo da aba destacando:
  - Escala Vigente / Ativa no modelo selecionado.
  - Quantidade total de escalas cadastradas.
  - Amplitude de graus (3 a 5 níveis configurados).
  - Status de integridade e cobertura matemática da régua (0 a 100 pontos sem descontinuidade).
- **CRUD e Ciclo de Vida Completo**:
  - Modal de Edição de Escalas existentes (`updateEscalaGrafica`).
  - Ativação imediata de escala (tornar ativa para o modelo de formulário correspondente).
  - Exclusão segura de escalas inativas via Modal institucional de confirmação (sem `window.confirm`).
- **Parametrização Dinâmica Flexível (3 a 5 Graus)**:
  - Adição e remoção dinâmica de níveis dentro do intervalo permitido pela metodologia (3 a 5 graus).
  - Presets rápidos com 1 clique: Chiavenato 5 Graus (Canônico), Chiavenato 4 Graus e Chiavenato 3 Graus.
  - Validação estrita em tempo real: primeiro nível obrigatoriamente iniciando em `0.0`, último nível encerrando em `100.0`, e continuidade exata entre limites de graus vizinhos (evitando lacunas e sobreposições).
- **Régua Gráfica Visual Interativa (Graduação Cromática)**:
  - Visualização em barra contínua segmentada e responsiva com as cores semânticas oficiais do `@sysgov/ui` / `graduTone.ts` (danger para G1/G2, warning para G3, success para G4/G5).
  - Tooltips e marcadores visuais das faixas de corte.
- **Simulador Interativo de Enquadramento de Notas**:
  - Slider interativo (0 a 100 pontos) e input numérico espelhado com conversão para a nota final (escala 0 a 10).
  - Detecção imediata do grau atingido, rótulo conceitual, descrição do comportamento esperado e alerta preventivo da Trava Antileniência (aviso de exigência de CIT prévio no Diário de Bordo para notas que incidirem em G1, G2 ou G5).
- **Adequação Integral ao Design System & AGENTS.md**:
  - Exclusividade de componentes `@sysgov/ui` (`Card`, `Button`, `Badge`, `Modal`, `StatCard`, `Input`, `Select`, `Table`).
  - Tipografia técnica em `JetBrains Mono` (`font-mono tabular-nums`) para todas as notas, pontuações, percentuais e códigos.
  - Zero uso de `alert()` ou `confirm()` nativos.

## Capabilities

### Modified Capabilities
- `capd`: Modernização e completude da gestão da Escala Gráfica de Avaliação (RF-03) no Portal da CAD, incorporando ciclo de vida completo (edição/exclusão/ativação), validação de integridade contínua 0-100 pontos, simulador de enquadramento com trava antileniência e presets Chiavenato.

## Impact

- **Frontend (`apps/web-client`)**:
  - `apps/web-client/src/modules/capd/EscalaGraficaPanel.tsx`: refatoração e expansão para suporte a CRUD completo, simulador, régua gráfica colorida e presets.
  - `apps/web-client/src/modules/capd/views/PortalCadView.tsx`: integração consistente da aba com os demais fluxos deliberativos da CAD.
- **SDK & API**:
  - Consumo direto dos endpoints existentes no `@sysgov/sdk` (`listEscalasGraficas`, `createEscalaGrafica`, `updateEscalaGrafica`, `deleteEscalaGrafica`).
