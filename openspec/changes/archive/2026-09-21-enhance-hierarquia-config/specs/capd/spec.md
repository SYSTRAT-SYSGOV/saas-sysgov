# Spec Delta: CAPD — Configuração de Hierarquia e Resolução Avaliativa

## ADDED Requirements

### Requirement: Painel Executivo e Métricas da Cadeia de Hierarquia Avaliativa
O sistema SHALL exibir no topo da aba de Configuração de Hierarquia um painel executivo com 4 cartões de indicadores (KPIs) sintetizando a cobertura e a integridade da cadeia de comando avaliativa:
1. **Total de Níveis Parametrizados**: Contagem de escalões configurados no tenant (ex.: Nível 0 - Setor, Nível 1 - Departamento, Nível 2 - Secretaria, Nível 3 - Gabinete/Prefeitura).
2. **Nível Topo Homologado**: Indicação se o topo da pirâmide institucional está homologado com avaliador ou papel RBAC vinculado (ex.: Controladoria ou Prefeito).
3. **Regras de Substituição Ativas**: Distribuição e prevalência das regras de impedimento ("Superior Hierárquico" vs "Substituto Legal").
4. **Status de Integridade da Cadeia**: Indicador visual (conforme / alerta) que aponta se há lacunas na sequência de níveis ou ausência de nível topo.

#### Scenario: Visualização dos KPIs com hierarquia íntegra
- **WHEN** o gestor acessa a aba de Configuração de Hierarquia com níveis de 0 a 2 cadastrados e nível 2 definido como topo
- **THEN** o painel exibe "3 Níveis Ativos", "Nível Topo Configurado (Nível 2)", "Regras de Substituição: 100% Definidas" e status "Cadeia Homologada"

#### Scenario: Visualização de alerta quando inexiste nível topo
- **WHEN** a listagem de níveis não possui nenhum registro com flag `is_topo = true`
- **THEN** o cartão de integridade exibe advertência visual destacando a ausência do topo institucional e orientando a definição do nível máximo

---

### Requirement: Gestão de Níveis com DataTable e Diálogo Seguro de Exclusão
A listagem de níveis hierárquicos SHALL ser estruturada através de um `DataTable` com suporte a ordenação natural por nível numérico ascendente, busca rápida por texto, badges semânticos e diálogo de confirmação seguro:
1. Não SHALL ser utilizado diálogo nativo do navegador (`window.confirm` ou `alert`) para desativação ou remoção de níveis.
2. A confirmação de exclusão/desativação DEVE utilizar obrigatoriamente o componente `ConfirmDialog` com título, mensagem descritiva de impacto e botão destrutivo explícito.
3. A numeração de níveis e identificadores DEVE utilizar tipografia técnica JetBrains Mono (`font-mono tabular-nums`).

#### Scenario: Ordenação por nível e badges de status
- **WHEN** os níveis são carregados da API
- **THEN** são apresentados em ordem crescente de nível (Nível 0, 1, 2...), com badge dourado `Crown` no nível topo e badges semânticos para as regras de substituição

#### Scenario: Desativação de nível via ConfirmDialog
- **WHEN** o usuário clica no botão de desativar/excluir de um nível ativo
- **THEN** é aberto um `ConfirmDialog` modal informando as consequências na resolução avaliativa e exigindo confirmação explícita antes de chamar a API

---

### Requirement: Simulador Interativo de Resolução de Avaliador da Hierarquia
A aba SHALL disponibilizar uma ferramenta de simulação interativa ("Quem avalia quem?") permitindo ao gestor de RH validar na prática o algoritmo de subida hierárquica e substituição:
1. O simulador permite selecionar uma unidade ou cargo de referência.
2. Apresenta a cadeia resolvida passo a passo: Chefe Imediato (Nível 0) $\to$ Superior Imediato (Nível 1) $\to$ Topo do Órgão.
3. Oferece um seletor de cenário de "Afastamento/Impedimento da Chefia", demonstrando em tempo real se a avaliação sobe para o superior hierárquico ou é transferida ao substituto legal designado.

#### Scenario: Simulação em fluxo normal de chefia ativa
- **WHEN** o gestor seleciona um departamento e testa o fluxo padrão
- **THEN** o simulador exibe a linha do tempo com o chefe imediato como primeiro avaliador competente

#### Scenario: Simulação com chefia imediata afastada
- **WHEN** o gestor ativa o switch de "Chefe Imediato em Licença/Afastado"
- **THEN** o simulador aplica a regra cadastrada no nível (sobe para o Diretor/Secretário ou direciona para o Substituto Legal) e destaca a fundamentação regimental

---

### Requirement: Visualização Esquemática em Árvore e Fluxo da Pirâmide Avaliativa
O painel SHALL fornecer uma visualização gráfica ou esquemática em pirâmide/árvore conectada dos níveis hierárquicos da organização:
1. Apresenta os cartões dos níveis em sequência visual da base ao ápice.
2. Cada cartão exibe o nível, nome, cargo de referência e ícone correspondente.
3. Mostra as setas ou conexões de fluxo de subida regimental da avaliação.

#### Scenario: Alternância entre visualização em Tabela e em Árvore
- **WHEN** o usuário clica no seletor de modo de visualização ("Tabela" vs "Estrutura em Árvore")
- **THEN** a interface alterna fluidamente entre o grid detalhado do `DataTable` e os cartões conectados da pirâmide institucional
