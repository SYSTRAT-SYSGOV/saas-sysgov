# Spec Delta: CAPD — Painel de Acompanhamento de PMD (DRH)

## ADDED Requirements

### Requirement: Painel Executivo e Indicadores do Plano de Melhoria de Desempenho (PMD)
O sistema SHALL exibir no topo da aba de Acompanhamento de PMD um conjunto de 4 cartões de indicadores executivos (KPIs) sintetizando a situação dos servidores sob plano de recuperação funcional:
1. **Total de PMDs Ativos / Em Risco**: Contagem de servidores com planos em situação "Aberto" ou "Em Andamento", com destaque semântico em cor de alerta (âmbar) caso o valor seja maior que zero.
2. **Total de Planos Superados / Verificados**: Contagem acumulada de planos cuja reavaliação registrou evolução satisfatória do servidor.
3. **Taxa de Recuperação Funcional**: Percentual de servidores que comprovaram superação da nota de corte em relação ao total de planos concluídos/verificados, formatado em `font-mono tabular-nums`.
4. **Alertas de Prazos Críticos**: Contagem de planos com data limite expirada ou com vencimento nos próximos 30 dias, sinalizando a urgência de intervenção da chefia imediata ou da Comissão CAD.

#### Scenario: Visualização dos KPIs com planos ativos e vencidos
- **WHEN** o gestor de RH acessa a aba com 6 planos ativos, 2 planos com prazo expirado e 14 planos já verificados
- **THEN** o painel exibe "6 PMDs em Acompanhamento" com borda de destaque em âmbar, "14 Superados", taxa de recuperação calculada e alerta destacando "2 Planos Vencidos"

#### Scenario: Visualização quando inexistem servidores sob PMD
- **WHEN** não existem servidores com planos abertos no tenant
- **THEN** o cartão de PMDs ativos exibe valor "0" com indicador positivo de plena conformidade de notas do quadro funcional

---

### Requirement: Listagem Analítica do PMD com Identificação do Servidor e Gestão de Prazos
A tabela de acompanhamento de PMD SHALL ser estruturada através do componente `DataTable` de `@sysgov/ui`, provendo identificação clara dos servidores, progresso de ações pactuadas, alertas temporais e busca multifacetada:
1. **Identificação do Servidor**: Exibição em destaque do nome completo do servidor avaliado, com matrícula funcional e cargo em tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
2. **NFC Gatilho de Origem**: Exibição da nota consolidada que motivou a abertura do plano, com valor numérico em `font-mono tabular-nums` e cor de destaque.
3. **Acompanhamento de Ações Acordadas**: Exibição da quantidade e percentual de ações já cumpridas em relação ao total pactuado no plano.
4. **Alertas Semânticos de Prazos**:
   - Prazos expirados são identificados com badge vermelho ("Vencido");
   - Prazos com vencimento em até 30 dias são identificados com badge âmbar ("Vence em breve");
   - Prazos regulares são identificados com badge neutro/informativo.
5. **Filtros e Paginação**:
   - Busca textual por nome do servidor, matrícula, objetivos ou ciclo;
   - Filtro por status (Aberto, Em Andamento, Concluído, Verificado, Cancelado ou Todos);
   - Filtro por urgência de prazo (Todos, Vencidos, A Vencer em 30 dias, No Prazo);
   - Paginação configurável com seletor de registros por página (`pageSizeSelector`).

#### Scenario: Filtragem por planos com prazo vencido
- **WHEN** o gestor seleciona o filtro de urgência "Vencidos"
- **THEN** a tabela exibe exclusivamente os planos cuja data limite é anterior à data corrente e cujo status não seja "verificado" ou "cancelado"

#### Scenario: Busca textual por matrícula do servidor
- **WHEN** o usuário digita a matrícula funcional "10042" no campo de busca
- **THEN** a listagem filtra instantaneamente o plano correspondente ao referido servidor, exibindo seus objetivos e status atual

---

### Requirement: Modal de Verificação de Evolução com Comparativo e Análise de Superação
Ao acionar o registro de verificação de evolução de um PMD, o sistema SHALL abrir um modal assistido que apresenta comparativo analítico entre a nota anterior e a nova nota apurada:
1. **Painel Comparativo**: Exibe a NFC Gatilho de origem ao lado da Nova NFC informada pelo usuário.
2. **Cálculo Automático de Variação (Delta)**: O sistema calcula e exibe em tempo real a diferença de pontuação em `font-mono tabular-nums` com sinalização positiva ou negativa.
3. **Diagnóstico de Superação**: Informa claramente se a nova nota atinge o patamar mínimo regulamentar (≥ 70,00 pontos na escala 0–100 ou ≥ 7,0 na escala 0–10) para desobstrução da progressão funcional.
4. **Parecer Circunstanciado**: Campo estruturado para registro formal das justificativas, observações da chefia imediata e evidências de desenvolvimento.

#### Scenario: Registro de evolução com superação da nota de corte
- **WHEN** o gestor informa a nova nota "76,50" para um PMD cuja nota gatilho era "62,00"
- **THEN** o modal exibe indicador em verde "+14,50 pts", confirma o status "Apto à Superação (NFC ≥ 70,00)" e habilita a conclusão da verificação

#### Scenario: Registro de evolução sem atingimento da nota de corte
- **WHEN** o gestor informa a nova nota "66,00" para um PMD cuja nota gatilho era "60,00"
- **THEN** o modal exibe o delta "+6,00 pts", porém adverte que a pontuação permanece abaixo da nota de corte, orientando a continuidade das medidas de apoio funcional

---

### Requirement: Exportação de Relatório de PMD para Auditoria e Comissão CAD
O painel de acompanhamento de PMD SHALL disponibilizar ferramenta de exportação de dados em formato CSV, permitindo que a Comissão CAD e a gestão de pessoal auditem as intervenções realizadas:
1. A exportação contempla todos os registros filtrados na visão ativa.
2. O arquivo gerado deve conter cabeçalhos em português (ex.: ID, Servidor, Matrícula, Cargo, Ciclo de Origem, NFC Gatilho, Objetivos, Prazo, Status, Ações Concluídas, Nova NFC, Data Verificação).
3. O arquivo DEVE ser formatado com codificação UTF-8 com BOM (`\uFEFF`) para compatibilidade nativa com o Excel e suítes de escritório.

#### Scenario: Download da planilha de acompanhamento
- **WHEN** o gestor clica no botão "Exportar CSV"
- **THEN** o sistema realiza o download automático do arquivo `acompanhamento_pmd_capd_{data}.csv` com os dados sanitizados e prontos para conferência
