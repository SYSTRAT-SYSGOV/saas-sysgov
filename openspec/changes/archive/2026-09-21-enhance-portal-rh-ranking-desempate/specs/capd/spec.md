# Spec Delta

## ADDED Requirements

### Requirement: Filtros Especializados e Busca na Classificação e Desempate Art. 39
A sub-aba "Classificação Oficial & Desempate Art. 39" do Portal de RH SHALL disponibilizar uma barra de busca rápida multifacetada e um painel colapsável de filtros avançados, permitindo aos gestores segmentar o ranking funcional por órgão de lotação, cargo efetivo, conceito avaliativo e elegibilidade à progressão.

#### Scenario: Filtragem por Secretaria e Departamento do organograma
- **WHEN** o gestor seleciona uma secretaria específica no painel de filtros
- **THEN** a tabela de classificação filtra instantaneamente apenas os servidores lotados na referida pasta e reajusta o seletor contextual de departamentos

#### Scenario: Filtragem por Elegibilidade à Progressão Funcional
- **WHEN** o gestor seleciona a opção "Elegíveis à Progressão (NFC >= 70)"
- **THEN** o sistema exibe exclusivamente os servidores aptos à evolução na carreira, ocultando os servidores encaminhados para PMD

#### Scenario: Filtragem exclusiva de Servidores com Empate de Notas
- **WHEN** o gestor seleciona a opção "Apenas Casos de Desempate (Art. 39)"
- **THEN** a listagem filtra exclusivamente os servidores que compartilham a mesma pontuação na NFC e cuja classificação final foi desempatada por tempo de serviço ou idade

---

### Requirement: Painel de Indicadores Executivos do Ranking de Progressão
A sub-aba de Classificação e Desempate SHALL exibir no topo um painel com cartões de indicadores executivos (KPIs) consolidados do ciclo de avaliação e progressão.

#### Scenario: Exibição de métricas gerais de ranqueamento e média NFC
- **WHEN** a aba de Classificação Oficial & Desempate Art. 39 é aberta
- **THEN** o painel exibe cartões com o Total de Ranqueados, Total e Percentual de Aptos à Progressão, Total de Casos em PMD, Média da NFC Geral e Quantidade de Empates Desempatados pelo Art. 39

#### Scenario: Alerta visual para servidores encaminhados ao PMD
- **WHEN** o índice ou contagem de servidores com NFC inferior a 70,00 pontos é exibido
- **THEN** utiliza a cor semântica de alerta/danger do Design System SYSGOV e destaca a necessidade de plano de melhoria

---

### Requirement: Tabela Fluida de Desempate sem Barra de Rolagem Horizontal
A tabela de Classificação Oficial & Desempate Art. 39 SHALL dimensionar suas colunas proporcionalmente sem travas rígidas de largura mínima, ajustando-se a 100% do container e eliminando a barra de rolagem horizontal em resoluções de desktop (>= 1024px).

#### Scenario: Ajuste responsivo de colunas no desktop
- **WHEN** a tabela de ranking e desempate é renderizada em desktop
- **THEN** apresenta as colunas Posição, Servidor Público, Lotação Institucional, 1º NFC, 2º Tempo de Serviço, 3º Idade Civil, Conceito e Status de Elegibilidade sem gerar scroll horizontal

#### Scenario: Tipografia técnica nos critérios legais do Art. 39
- **WHEN** os dados de posição, NFC, dias de serviço, idade e matrícula são renderizados
- **THEN** utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

---

### Requirement: Pílulas de Acesso Rápido para Classificação Funcional
A interface de Classificação Oficial & Desempate Art. 39 SHALL fornecer pílulas de navegação rápida (*Quick Filters*) para filtragem ágil em 1 clique.

#### Scenario: Alternância rápida de faixas de conceito e empates
- **WHEN** o gestor clica na pílula "Empates Art. 39"
- **THEN** o filtro é aplicado imediatamente exibindo apenas os servidores cujas posições decorreram da aplicação dos critérios de desempate
