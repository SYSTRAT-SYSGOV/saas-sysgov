# Delta da Especificação: CAPD - Portal de Auditoria e Controle Interno

## ADDED Requirements

### Requirement: Painel de Indicadores e KPIs de Controle Interno
O Portal de Auditoria e Controle Interno DEVE exibir, no topo da interface, uma esteira consolidada de indicadores de conformidade administrativa através de cartões analíticos (`StatCard` do `@sysgov/ui`), com métricas formatadas em `JetBrains Mono` (`font-mono tabular-nums`).

#### Scenario: Visualização do panorama geral de controle interno
- **WHEN** o auditor municipal ou analista de controle interno acessa o portal
- **THEN** o sistema exibe os cartões com o total de impedimentos ativos, registros gravados na trilha forense, total de avaliações em escrutínio amostral/notas extremas e índice de integridade das assinaturas criptográficas (100%).

---

### Requirement: Gestão e Homologação de Impedimentos e Conflitos de Interesse
O sistema DEVE permitir a fiscalização, declaração, homologação e eventual desativação fundamentada de impedimentos e suspeições por parentesco até o 3º grau (Art. 31 da Lei nº 1.704/2006).

#### Scenario: Listagem analítica de impedimentos cadastrados
- **WHEN** o auditor consulta a aba "Impedimentos & Parentesco"
- **THEN** o sistema exibe tabela analítica (`DataTable`) contendo o servidor avaliado, o substituto legal designado, o tipo de parentesco/impedimento, a data de lavratura e o status operacional.

#### Scenario: Homologação e desativação com justificativa do controle interno
- **WHEN** o auditor altera o status de um impedimento (ex: cessação do vínculo ou erro formal)
- **THEN** o sistema exige justificativa administrativa formal e registra o evento na trilha de auditoria imutável sem diálogos nativos do navegador.

---

### Requirement: Fila de Amostragem Regulatória e Trava Anti-Leniência
O sistema DEVE disponibilizar uma fila analítica de fiscalização para avaliações selecionadas por sorteio amostral (percentual mínimo de 10%) ou por enquadramento na trava anti-leniência (notas extremas de Grau 1 ou Grau 5 / pontuação < 4.00 ou >= 9.50).

#### Scenario: Inspeção de notas extremas contra o Diário de Bordo (CIT)
- **WHEN** o auditor inspeciona uma avaliação da fila de amostragem que recebeu nota extrema
- **THEN** o sistema apresenta a árvore de fatores avaliados e cruza com os incidentes críticos lançados previamente no Diário de Bordo daquele servidor, acusando se há fundamentação fática satisfatória.

#### Scenario: Emissão de parecer de auditoria
- **WHEN** o auditor conclui a análise de uma avaliação da amostra
- **THEN** o sistema permite registrar o parecer formal (Aprovado / Reavaliação Solicitada / Diligência Aberta), arquivando o despacho com assinatura eletrônica.

---

### Requirement: Trilha Forense Imutável e Verificador Criptográfico SHA-256
O sistema DEVE registrar de forma contínua todos os eventos críticos do ciclo de avaliação com carimbo UTC-3, IP do agente e assinatura em hash SHA-256, disponibilizando ferramenta visual de validação de autenticidade documental.

#### Scenario: Validação de hash criptográfico de documentos e atas
- **WHEN** o auditor submete um hash SHA-256 no campo de verificação de autenticidade
- **THEN** o sistema localiza a assinatura correspondente na base imutável, atesta a validade do registro e exibe o selo digital de conformidade com os metadados do evento.

#### Scenario: Exportação de dossiê de auditoria para Tribunais de Contas
- **WHEN** o auditor aciona a exportação da trilha forense
- **THEN** o sistema gera arquivo estruturado (CSV/JSON) com todas as evidências, assinaturas e carimbos de tempo para instrução perante órgãos de controle externo.

---

### Requirement: Trilha de Acessos a Dados Pessoais e Conformidade LGPD
O sistema DEVE monitorar e registrar as consultas aos prontuários e notas individuais dos servidores públicos, prevenindo vazamentos e garantindo a observância da Lei Geral de Proteção de Dados (LGPD).

#### Scenario: Consulta aos registros de visualização de notas
- **WHEN** o auditor acessa a aba "Conformidade LGPD & Acessos"
- **THEN** o sistema exibe o histórico de operadores que visualizaram notas, relatórios ou espelhos de servidores com data, horário e justificativa de acesso.
