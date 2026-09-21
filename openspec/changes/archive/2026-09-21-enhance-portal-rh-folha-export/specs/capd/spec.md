# Spec Delta

## ADDED Requirements

### Requirement: Painel de Indicadores Executivos e Impacto Financeiro da Folha
A sub-aba "Exportação Folha de Pagamento" do Portal de RH SHALL exibir no topo um painel executivo com cartões de indicadores (KPIs) orçamentários consolidados da evolução funcional decorrente da cadência avaliativa.

#### Scenario: Exibição do impacto mensal e anualizado com encargos
- **WHEN** a aba de Exportação Folha de Pagamento é acessada
- **THEN** o painel exibe cartões com o Total da Folha Mensal Base, Impacto Financeiro Mensal do Reajuste (+10%), Impacto Anual Projetado (considerando 13º salário e terço constitucional de férias) e Quantitativo de Servidores Homologados vs Retidos em PMD

#### Scenario: Tipografia técnica e representação monetária
- **WHEN** os valores salariais, percentuais de reajuste e impactos orçamentários são renderizados
- **THEN** utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV e cálculos baseados em centavos inteiros (`int $cents`)

---

### Requirement: Filtros Avançados e Busca Multifacetada de Folha de Pagamento
A sub-aba de Exportação Folha de Pagamento SHALL fornecer campo de busca rápida por texto e um painel colapsável de filtros avançados para segmentação orçamentária e cadastral.

#### Scenario: Filtragem por Secretaria e Departamento institucional
- **WHEN** o gestor seleciona uma secretaria específica nos filtros avançados
- **THEN** a tabela e o sumário financeiro filtram os dados apenas para a pasta selecionada e atualizam o seletor contextual de departamentos

#### Scenario: Filtragem por Situação de Concessão Funcional
- **WHEN** o gestor filtra por servidores com status "Apto ao Reajuste (+10%)"
- **THEN** a interface exibe apenas os servidores que atingiram a nota de corte (NFC >= 70,00 pts), omitindo servidores em PMD

#### Scenario: Filtragem por Faixa Salarial e Magnitude do Impacto
- **WHEN** o gestor define critérios de faixa de remuneração ou impacto financeiro
- **THEN** a listagem isola os servidores pertencentes aos intervalos monetários informados

---

### Requirement: Pílulas de Acesso Rápido para Gestão da Folha (Quick Filters)
A interface de folha de pagamento SHALL disponibilizar botões de filtro rápido (*Quick Filters*) para consultas imediatas em 1 clique.

#### Scenario: Filtragem instantânea de servidores retidos em PMD
- **WHEN** o gestor clica na pílula "Retidos (PMD)"
- **THEN** a visualização é imediatamente restrita aos servidores cuja evolução salarial está sobrestada por nota insuficiente

---

### Requirement: Exportação Especializada para Múltiplos ERPs Municipais
O sistema SHALL disponibilizar opções de exportação parametrizadas para os principais sistemas integrados de gestão pública municipal (Betha Sistemas, IPM Atende.Net, Governa/CECAM e CSV Padrão Universal).

#### Scenario: Exportação para o conector Betha Sistemas
- **WHEN** o operador de RH seleciona o leiaute Betha Sistemas
- **THEN** o arquivo é gerado com delimitador ponto-e-vírgula, cabeçalhos padronizados do leiaute de importação de eventos e identificadores de rubrica salarial correspondentes

#### Scenario: Exportação para o conector IPM Atende.Net
- **WHEN** o operador seleciona o leiaute IPM Atende.Net
- **THEN** o arquivo é gerado com a formatação e campos compatíveis com a rotina de progressão por mérito da IPM

---

### Requirement: Grid Fluido de Folha de Pagamento sem Barra de Rolagem Lateral
A tabela de homologação financeira da folha de pagamento SHALL dimensionar suas colunas responsivamente sem travas fixas rígidas de largura mínima, ajustando-se a 100% do container e eliminando a barra de rolagem horizontal em resoluções de desktop (>= 1024px).

#### Scenario: Renderização fluida da tabela de impacto salarial
- **WHEN** a tabela de folha de pagamento é exibida em monitores desktop
- **THEN** apresenta todas as colunas essenciais (Servidor/Matrícula, Lotação, NFC, Salário Atual, Reajuste e Salário Projetado) com legibilidade completa e sem scroll horizontal lateral
