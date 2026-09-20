# Design

## Context

A visualização da aba de Escalas Gráficas no Portal da CAD (`PortalCadView.tsx` e `EscalaGraficaPanel.tsx`) apresentou duas inconsistências de apresentação:
1. Duplicação de StatCards no topo (cards gerais de governança renderizados por `PortalCadView` coexistindo com os cards especializados de `EscalaGraficaPanel`).
2. Fragmentação e sobreposição de textos na barra da régua gráfica contínua, causada pela tentativa de embutir múltiplos elementos textuais longos dentro de blocos estreitos com larguras proporcionais variáveis (ex: faixas de 5% ou 10%).

## Goals / Non-Goals

**Goals:**
- Suprimir os 4 StatCards genéricos do órgão no `PortalCadView.tsx` quando a aba ativa for `escalas`, deixando unicamente os StatCards dedicados da própria aba.
- Redesenhar a Régua Contínua de Desempenho em um padrão visual de alta fidelidade:
  - Trilha gráfica contínua elegante de 24px de altura, com divisores limpos, cantos arredondados e sem acúmulo de textos internos que quebram o layout.
  - Indicador numérico das marcas de corte alinhado abaixo da trilha (`0.00`, limites de cada grau e `100.00`).
  - Cursor/ponteiro interativo dinâmico (pin com tooltip da pontuação) que desliza ao longo da barra em sincronia com o simulador interativo.
  - Grade balanceada de cartões para cada grau (G1 a G5), com layout uniforme, tipografia nítida em `font-mono tabular-nums`, nota escalar equivalente e status destacado da Trava Antileniência.
- Adicionar ação rápida de "Copiar Resumo para Ata da CAD" (gerando texto formal formatado para atas de deliberação).
- Adicionar seletor de alternância rápida entre "Visão Régua Visual" e "Visão Tabela Completa".

**Non-Goals:**
- Não altera endpoints de backend ou tipos do SDK.
- Não altera a lógica de validação de notas ou de cálculo do SAPDS.

## Decisions

### 1. Desacoplamento da Trilha Gráfica e do Conteúdo Textual
- **Decisão**: A barra horizontal contínua de 0 a 100 pontos atuará estritamente como **trilha gráfica e geométrica de proporção**, contendo apenas badges compactos (`G1`, `G2`, etc.) e cores semânticas suaves com divisores verticais sutis. Todas as informações textuais detalhadas (rótulos conceituais, descrições comportamentais e notas escalares) são exibidas nos cartões estruturados posicionados abaixo da régua.
- **Rationale**: Evita categoricamente qualquer overflow ou quebra de texto, mesmo quando uma escala tiver um grau com intervalo muito estreito (ex: 5 ou 10 pontos).

### 2. Marcador Interativo Dinâmico (Simulador Pin)
- **Decisão**: Posicionar um indicador em formato de agulha/cursor (`left: ${simuladorPontos}%`) com transição suave, exibindo a pontuação simulada logo acima da régua.
- **Rationale**: Transforma a régua em um componente verdadeiramente vivo e interativo, permitindo que os membros da CAD visualizem graficamente onde uma nota se situa em relação aos pontos de corte.

### 3. Supressão Condicional no PortalCadView
- **Decisão**: Estender o condicional de `activeTab === 'perguntas'` para `activeTab === 'perguntas' || activeTab === 'escalas'`, retornando `null` para os cards genéricos do órgão.
- **Rationale**: Mantém o padrão estabelecido no módulo, onde abas com painéis executivos próprios cuidam de seus respectivos KPIs.

## Risks / Trade-offs

- **[Risco] Telas móveis com largura restrita** → **Mitigação**: A grade de cartões de graus utiliza layout responsivo flexível (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`), garantindo legibilidade em qualquer resolução.
