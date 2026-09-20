# Tasks

## 1. Estrutura de Estado e Componentes Executivos

- [x] 1.1 Implementar os 4 StatCards de KPIs no topo do `EscalaGraficaPanel.tsx` (Escala Vigente, Total de Escalas, Amplitude de Graus e Integridade da Cobertura 0-100) e verificar renderização visual com dados reativos do modelo selecionado.
- [x] 1.2 Implementar a Régua Contínua Colorida com graduação semântica canônica (`graduTone.ts`) e tooltips de faixas, verificando a exibição proporcional e responsiva das notas de corte.

## 2. Simulador Interativo com Trava Antileniência

- [x] 2.1 Desenvolver o Simulador Interativo com slider (0 a 100 pts / 0 a 10 na nota convertida) e input numérico bidirecional no `EscalaGraficaPanel.tsx`.
- [x] 2.2 Integrar a detecção em tempo real do grau atingido, rótulo conceitual e descrição comportamental, exibindo alerta preventivo da Trava Antileniência (exigência de CIT no Diário de Bordo) caso o enquadramento resulte em Grau 1, 2 ou 5.

## 3. Gestão Completa de Escalas (CRUD, Presets e Validação)

- [x] 3.1 Implementar os presets rápidos de Chiavenato no formulário de criação/edição (5 Graus Canônico, 4 Graus e 3 Graus) com preenchimento balanceado de 0 a 100 pontos.
- [x] 3.2 Implementar validação matemática client-side em tempo real para faixas contínuas (início em 0.0, término em 100.0, sem sobreposição nem gaps) bloqueando submissões inconsistentes com feedback visual claro.
- [x] 3.3 Implementar fluxo de Edição de Escalas (`updateEscalaGrafica`) com formulário pré-carregado e atualização reativa da listagem e da régua.
- [x] 3.4 Implementar ação de Ativar Escala (`updateEscalaGrafica({ ativa: true })`) e exclusão segura com `Modal` de confirmação institucional (`deleteEscalaGrafica`), assegurando bloqueio à exclusão da escala atualmente ativa.

## 4. Validação e Qualidade

- [x] 4.1 Validar conformidade estrita de tipografia técnica em `JetBrains Mono` (`font-mono tabular-nums`), tokens visuais de `@sysgov/ui` e ausência total de `window.confirm` ou `alert`.
- [x] 4.2 Executar checagem de tipos TypeScript e build no frontend (`apps/web-client`) para assegurar integridade completa sem regressões.
