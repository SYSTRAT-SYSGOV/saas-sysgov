# Spec Delta: capd

## ADDED Requirements

### Requirement: Capd.PesosFatores.GestaoKpiExclusiva
A aba de Pesos dos Fatores no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos de parametrização ponderada (Soma Total dos Pesos, Total de Fatores Ativos, Situação do Fator H Redistribuível e Média Ponderada por Fator) e SHALL suprimir a exibição dos cards gerais de governança institucional no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de pesos sem cards de outras áreas
- **WHEN** o usuário seleciona a aba "Pesos dos Fatores (100%)" no Portal da CAD
- **THEN** o sistema oculta os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente) e exibe os cards exclusivos de parametrização de pesos da aba

#### Scenario: Atualização em tempo real dos indicadores de conformidade
- **WHEN** o usuário altera o peso de um fator na interface
- **THEN** o card de Soma Total atualiza instantaneamente a soma calculada, sinalizando conformidade com badge de sucesso quando atingir exatamente 100,00% ou aviso de divergência caso contrário

### Requirement: Capd.PesosFatores.VisualizacaoDistribuicao
A aba de Pesos dos Fatores SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Visual Stacked Distribution Bar) refletindo a proporção de peso atribuída a cada fator de avaliação ativo no modelo de formulário selecionado, utilizando dados numéricos formatados em `font-mono tabular-nums`.

#### Scenario: Renderização gráfica da partição dos 100%
- **WHEN** um modelo de formulário com fatores cadastrados é carregado
- **THEN** a barra empilhada exibe segmentos proporcionais a cada fator com suas respectivas siglas, nomes e percentuais, garantindo distinção visual clara entre eles

### Requirement: Capd.PesosFatores.BalanceamentoPresets
O painel de Pesos dos Fatores SHALL disponibilizar ferramentas de produtividade para balanceamento rápido da soma dos pesos em exatamente 100,00%, incluindo botão de auto-balanceamento proporcional e presets de distribuição (Distribuição Equitativa e Foco em Competências Técnicas).

#### Scenario: Auto-balanceamento de pesos com ajuste fino
- **WHEN** o usuário aciona o botão de auto-balanceamento com fatores ativos cuja soma diverge de 100%
- **THEN** o sistema recalcula e ajusta os pesos proporcionalmente de modo que a soma total resulte exatamente em 100,00%, marcando o formulário como alterado para posterior persistência
