# Spec Delta

## ADDED Requirements

### Requirement: Apresentação Dedicada e Redesign da Régua Contínua de Escala Gráfica no Portal da CAD
<!-- id: Capd.EscalaGrafica.RedesignRegua -->
<!-- entities: EscalaGrafica, EscalaNivel -->
<!-- enforced: PortalCadView, EscalaGraficaPanel -->

A aba de Escalas Gráficas no Portal da CAD SHALL possuir apresentação visual dedicada sem duplicação de cards de KPIs, suprimindo os cards gerais do órgão no nível do portal. A régua contínua de desempenho SHALL exibir uma trilha gráfica com proporções semânticas sem sobreposição de textos internos, contendo marcas numéricas de corte legíveis e cursor/marcador dinâmico refletindo em tempo real o ponto simulado.

#### Scenario: Supressão de cards globais redundantes na aba de Escalas Gráficas
- **WHEN** o usuário seleciona a aba "Escalas Gráficas (Chiavenato)" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) não renderiza os cards de governança geral (recursos, sessões, portarias, ciclos), deixando visíveis unicamente os StatCards específicos da parametrização de escalas

#### Scenario: Renderização limpa e não sobreposta da régua contínua
- **WHEN** uma escala gráfica com quaisquer amplitudes de faixas (mesmo desiguais ou estreitas) é renderizada na tela
- **THEN** a trilha da régua gráfica contínua exibe os blocos coloridos com divisores e marcas de corte sem quebra de layout ou colisão de texto interno, e os cartões de detalhamento de graus são dispostos em grade balanceada com alturas equalizadas

#### Scenario: Cursor dinâmico do simulador sincronizado na régua contínua
- **WHEN** o usuário move o slider ou digita uma pontuação no simulador
- **THEN** um ponteiro indicador (pin) desliza ao longo da régua gráfica contínua apontando com precisão a posição proporcional do valor simulado
