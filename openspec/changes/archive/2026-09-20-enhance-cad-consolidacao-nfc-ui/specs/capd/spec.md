# Spec Delta: capd

## ADDED Requirements

### Requirement: Capd.ConsolidacaoNfc.GestaoKpiExclusiva
A aba de Consolidação NFC Trienal & Ranking no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Total de Servidores no Triênio, Servidores Aptos com Taxa de Sucesso, Inaptos Encaminhados ao PMD e Nota de Corte com Média Global) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de consolidação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Consolidação NFC Trienal & Ranking" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da consolidação trienal

#### Scenario: Apresentação analítica de servidores aptos e inaptos
- **WHEN** os dados de consolidação de um ciclo trienal são carregados
- **THEN** os StatCards exibem o quantitativo de servidores aptos com sua respectiva taxa percentual (`font-mono tabular-nums`) e destacam os inaptos com aviso sobre o encaminhamento compulsório ao Plano de Melhoria de Desempenho (PMD)

### Requirement: Capd.ConsolidacaoNfc.DistribuicaoConceitos
A aba de Consolidação NFC Trienal & Ranking SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Concept Distribution Bar) demonstrando a proporção de servidores classificados em cada conceito regulamentar (Excelente, Bom, Regular e Insuficiente), acompanhada de badges semânticas do Design System SYSGOV.

#### Scenario: Distribuição visual dos conceitos avaliativos
- **WHEN** a consolidação trienal é exibida
- **THEN** a barra gráfica empilhada apresenta as fatias correspondentes a cada conceito com cores semânticas oficiais, indicando a quantidade e a porcentagem de servidores em cada faixa

### Requirement: Capd.ConsolidacaoNfc.CriteriosDesempateLegal
O painel de Consolidação NFC Trienal & Ranking SHALL fornecer painel instrutivo e transparente sobre as regras legais de desempate aplicadas na ordenação do ranking de progressão funcional, conforme estipulado no Art. 39 da Lei nº 1.704/2006.

#### Scenario: Consulta às regras de desempate da progressão
- **WHEN** o gestor ou membro da CAD acessa a aba do Ranking de Progressão
- **THEN** o sistema exibe os 3 critérios de desempate regimentais em ordem estrita de precedência (1º Maior NFC, 2º Tempo de serviço público e 3º Idade mais avançada)
