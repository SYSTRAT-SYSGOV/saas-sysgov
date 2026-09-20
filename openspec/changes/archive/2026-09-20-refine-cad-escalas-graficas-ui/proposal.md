# Proposal

## Why

Ao inspecionar visualmente a aba de **Escalas Gráficas (Chiavenato)** no Portal da CAD, duas anomalias de UX/UI foram identificadas:
1. **Cards Duplicados de KPIs**: O `PortalCadView.tsx` estava exibindo, no topo da aba, os 4 StatCards globais do portal ("Recursos na CAD", "Sessões & Atas SHA-256", "Portarias & Membros", "Ciclo Vigente") e, logo abaixo, o `EscalaGraficaPanel.tsx` exibia sua própria grade de 4 StatCards de Escalas Gráficas. Isso gerou duplicidade de indicadores e poluição visual. A aba de Escalas Gráficas deve renderizar exclusivamente seus próprios cards focados na parametrização de escalas (assim como a aba de Banco de Perguntas já faz).
2. **Design da Régua Contínua Quebrado e Sobreposto**: Na régua gráfica contínua de 0 a 100 pontos, os textos internos aos blocos coloridos (`G1 Grau 1 - Insuficiente`, `0-59.99`, etc.) foram posicionados diretamente dentro da barra proporcional. Em faixas estreitas ou com rótulos longos, o texto quebrou e colidiu com os limites do componente, tornando-se ilegível e visualmente quebrado. Além disso, os cartões de legenda abaixo da régua apresentavam alturas desiguais e falta de refinamento visual.

Esta proposta reestrutura o design da Régua Contínua de Desempenho com uma trilha gráfica limpa, fluida e moderna (barra segmentada com marcas de corte e ponteiro dinâmico sincronizado ao simulador), elimina os cards globais redundantes no Portal da CAD para a aba de escalas e enriquece a experiência visual com visualização executiva completa e cópia rápida de parâmetros para ata da comissão.

## What Changes

- **Eliminação de Cards Duplicados em `PortalCadView.tsx`**:
  - Ajustar o condicional de StatCards no `PortalCadView.tsx` para que, quando `activeTab === 'escalas'`, os cards globais do órgão sejam suprimidos (retornando `null`), permitindo que apenas os StatCards de KPIs especializados de `EscalaGraficaPanel.tsx` sejam exibidos.
- **Redesign Completo da Régua Contínua de Desempenho**:
  - **Trilha Gráfica Limpa (Sleek Ruler Track)**: A barra de 0 a 100 pontos torna-se uma trilha geométrica elegante, com altura controlada, divisores nítidos e marcas de corte numéricas (`0`, `40`, `60`, `75`, `90`, `100`), sem tentar embutir textos extensos dentro dos segmentos que causam overflow.
  - **Marcador Interativo Dinâmico (Pin / Cursor de Simulação)**: Um indicador visual elegante desliza sobre a régua contínua apontando com precisão onde a nota do simulador recai na escala.
  - **Grade de Níveis Estruturada e Balanceada (Level Cards)**: Abaixo da régua, cada grau (G1 a G5) ganha um card estruturado com altura equalizada, badge canônico (`font-mono`), rótulo conceitual em destaque, faixa numérica exata (`0.00 – 39.99 pts`), conversão escalar (`Nf: 0.0 a 10.0`) e sinalização visual da Trava Antileniência (`Exige CIT` com `ShieldAlert` vs `Dispensada` com `CheckCircle2`).
- **Enriquecimento da Aba de Escalas Gráficas**:
  - Alternância de visão rápida: **Visão Régua Visual** vs **Visão Tabela Regimental**.
  - Ação rápida de cópia do resumo da escala vigente para atas da comissão deliberativa da CAD.
  - Harmonização de espaçamentos no `PortalCadView.tsx`.

## Capabilities

### Modified Capabilities
- `capd`: Refinamento da interface da Escala Gráfica no Portal da CAD (eliminação de cards duplicados no portal e reestruturação do design visual da régua contínua e dos cartões de níveis).

## Impact

- `apps/web-client/src/modules/capd/views/PortalCadView.tsx`: supressão dos cards gerais na aba `escalas`.
- `apps/web-client/src/modules/capd/EscalaGraficaPanel.tsx`: redesign da régua contínua, cursor dinâmico de pontuação, botões de visualização e layout balanceado dos níveis.
