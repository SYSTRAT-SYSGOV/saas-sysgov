# Spec Delta

## ADDED Requirements

### Requirement: Dashboard Analítico com Dados Reais do Tenant
A aba "Dashboard Analítico & BI" do Portal de RH e Secretaria Municipal de Gestão de Pessoas
SHALL derivar todos os seus gráficos (dispersão de notas, clusters por secretaria, média por
secretaria e proporção de conceitos) exclusivamente de dados reais do tenant autenticado
(avaliações, servidores e métricas do ciclo selecionado), sem valores estáticos fabricados. O
tempo de serviço exibido no gráfico de dispersão SHALL ser calculado a partir da data de admissão
real do servidor. Quando o ciclo selecionado não possuir avaliações concluídas, a aba SHALL exibir
um estado vazio explícito em vez de dados fictícios de exemplo.

#### Scenario: Ciclo com avaliações concluídas
- **WHEN** o usuário abre a aba Dashboard Analítico & BI com um ciclo que possui avaliações
  concluídas
- **THEN** os gráficos de dispersão, clusters, média por secretaria e proporção de conceitos
  refletem os valores reais de `nota_final`, `orgao_lotacao` e `data_admissao` dos servidores
  avaliados naquele ciclo e tenant

#### Scenario: Ciclo sem avaliações concluídas
- **WHEN** o usuário abre a aba Dashboard Analítico & BI com um ciclo que ainda não possui
  avaliações concluídas
- **THEN** a aba exibe um estado vazio explícito informando a ausência de dados, sem preencher os
  gráficos com valores de exemplo

### Requirement: Evolução de Desempenho Entre Ciclos
A aba Dashboard Analítico & BI SHALL exibir um gráfico de série histórica mostrando a média de
notas e a taxa de conclusão de avaliações por ciclo avaliativo do tenant, cobrindo todos os ciclos
já encerrados ou em andamento, não apenas o ciclo ativo selecionado.

#### Scenario: Tenant com múltiplos ciclos históricos
- **WHEN** o tenant possui dois ou mais ciclos avaliativos com avaliações concluídas
- **THEN** o gráfico de evolução exibe um ponto por ciclo, ordenado cronologicamente, com a média
  de notas e a taxa de conclusão daquele ciclo

### Requirement: Ranking de Secretarias por Desempenho
A aba Dashboard Analítico & BI SHALL exibir um ranking das secretarias municipais ordenado pela
média de notas de seus servidores no ciclo selecionado, destacando visualmente a secretaria com
melhor desempenho e a secretaria mais próxima do corte regimental de elegibilidade.

#### Scenario: Ranking com secretarias abaixo e acima do corte
- **WHEN** o ciclo selecionado possui secretarias com médias acima e abaixo do corte regimental
- **THEN** o ranking lista todas as secretarias em ordem decrescente de média, com indicação visual
  distinta para a secretaria de melhor desempenho e para a que está mais próxima do corte

### Requirement: Drill-Down por Departamento
Ao selecionar uma secretaria no Dashboard Analítico & BI, o sistema SHALL permitir o
detalhamento do desempenho por departamento/lotação física pertencente àquela secretaria, sem
navegação para fora da aba.

#### Scenario: Seleção de secretaria com múltiplos departamentos
- **WHEN** o usuário seleciona uma secretaria que possui mais de um departamento com servidores
  avaliados
- **THEN** o sistema exibe o detalhamento de desempenho por departamento daquela secretaria,
  calculado a partir das mesmas avaliações já carregadas

### Requirement: Destaque de Desempenho Individual (Top/Bottom)
A aba Dashboard Analítico & BI SHALL exibir os servidores com maior e menor nota final no ciclo
selecionado, com acesso direto ao espelho de avaliação de cada um.

#### Scenario: Consulta do destaque individual
- **WHEN** o usuário visualiza a seção de destaque de desempenho individual no ciclo selecionado
- **THEN** o sistema lista os servidores de maior e de menor nota final daquele ciclo, cada um com
  um atalho que abre o espelho de avaliação correspondente
