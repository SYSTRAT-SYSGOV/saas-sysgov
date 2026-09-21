# Spec Delta: CAPD — Painel de Pendências de Hierarquia (DRH)

## ADDED Requirements

### Requirement: Painel Executivo e Indicadores de Pendências de Hierarquia
O sistema SHALL exibir no topo do painel de Pendências de Hierarquia um conjunto de 4 cartões de indicadores (KPIs) sintetizando o estado de bloqueios e inconsistências avaliativas:
1. **Total de Pendências Abertas**: Quantidade de inconsistências pendentes de resolução manual, com destaque semântico em cor de alerta (âmbar) caso o valor seja superior a zero.
2. **Total de Pendências Resolvidas**: Quantidade acumulada de pendências já sanadas pelo DRH.
3. **Taxa de Saneamento**: Percentual de pendências resolvidas em relação ao total acumulado, formatado em `font-mono tabular-nums`.
4. **Distribuição por Tipo de Inconsistência**: Contagem segmentada entre "Sem Superior Resolvido", "Afastamento sem Substituto" e "Topo da Hierarquia sem Configuração".

#### Scenario: Visualização dos KPIs com pendências ativas
- **WHEN** o gestor de RH acessa a aba com 5 pendências em aberto e 15 já resolvidas
- **THEN** o painel exibe "5 Pendências Abertas" com borda de destaque em âmbar, "15 Resolvidas", taxa de saneamento de "75,0%" e a contagem por cada uma das categorias de bloqueio

#### Scenario: Visualização quando não há pendências abertas
- **WHEN** não existem pendências com status "aberta" no tenant
- **THEN** o cartão de pendências abertas exibe valor "0" com indicador positivo de integridade cadastral plena

---

### Requirement: Listagem Analítica com DataTable, Filtros Multifacetados e Busca
A visualização das pendências de hierarquia SHALL ser estruturada através do componente `DataTable` de `@sysgov/ui`, provendo busca textual, filtros avançados, ordenação e tipografia técnica:
1. **Busca Textual**: Campo de pesquisa rápida que filtra dinamicamente por nome completo do servidor, matrícula funcional ou texto descritivo do motivo/diagnóstico.
2. **Filtros Multifacetados**:
   - Filtro de Status: "Abertas", "Resolvidas" ou "Todas";
   - Filtro de Tipo de Pendência: "Todos", "Sem superior resolvido", "Afastamento sem substituto" e "Topo sem configuração";
   - Filtro por Ciclo Avaliativo.
3. **Colunas Estruturadas**:
   - Servidor (Nome em destaque e matrícula em `font-mono tabular-nums`);
   - Ciclo Avaliativo (Nome e ano de referência);
   - Categoria da Inconsistência (com badge semântico colorido e ícone alusivo);
   - Diagnóstico do Motor de Hierarquia (motivo detalhado com tooltip);
   - Status (`StatusChip` com variação warning para Aberta e success para Resolvida);
   - Resolução/Auditoria (identificação do avaliador designado e data/hora em `font-mono tabular-nums` quando resolvida);
   - Ações (botão "Resolver" para pendências abertas e "Ver Detalhes" para histórico).
4. **Controle de Paginação**: Suporte nativo a paginação com seleção de registros por página (`pageSizeSelector`).

#### Scenario: Filtragem por categoria de inconsistência
- **WHEN** o operador do RH seleciona o filtro "Afastamento sem substituto"
- **THEN** a tabela exibe exclusivamente os servidores cujo chefe imediato entrou em licença/férias e para os quais não foi cadastrado substituto legal no sistema

#### Scenario: Busca rápida por matrícula
- **WHEN** o usuário digita a matrícula "10234" no campo de busca
- **THEN** a listagem filtra instantaneamente o servidor correspondente, mantendo a paginação e os totais contextualizados

---

### Requirement: Modal de Resolução Assistido e Seguro com Seleção Qualificada
Ao acionar a resolução de uma pendência aberta, o sistema SHALL abrir um modal interativo que substitui a inserção cega de IDs por uma experiência assistida e segura:
1. **Ficha de Contexto do Servidor**: Exibe dados cadastrais do servidor avaliado (nome, matrícula, ciclo de avaliação) e o diagnóstico completo emitido pelo motor de hierarquia.
2. **Seleção Amigável do Avaliador Designado**:
   - Permite selecionar o avaliador por meio de seletor ou busca contextual (nome, cargo ou matrícula);
   - Impede submissão sem seleção explícita de um usuário válido.
3. **Alerta de Impacto**: Informa de maneira transparente que a confirmação redirecionará automaticamente as avaliações não-homologadas em aberto do servidor para o avaliador designado.
4. **Registro e Atualização Imediata**: Ao confirmar com sucesso, a pendência é marcada como resolvida, os dados de auditoria (`resolvido_por` e `resolvido_em`) são atualizados e a listagem reflete imediatamente o novo estado sem necessidade de recarregar a página inteira.

#### Scenario: Resolução assistida com sucesso
- **WHEN** o gestor do RH abre a resolução para o servidor "Carlos Silva", seleciona o Diretor de Divisão "Marcos Souza" como avaliador e clica em "Confirmar Designação"
- **THEN** o sistema envia a requisição para a API, fecha o modal, atualiza a pendência para "Resolvida", transfere a avaliação em andamento para Marcos Souza e exibe notificação de êxito

#### Scenario: Tentativa de resolução sem selecionar avaliador
- **WHEN** o operador abre o modal e tenta submeter sem selecionar um avaliador
- **THEN** o botão de confirmação permanece desabilitado ou validação visual orienta a seleção de um gestor válido

---

### Requirement: Exportação Tabular de Inconsistências para Saneamento Cadastral
O painel de pendências SHALL disponibilizar funcionalidade de exportação de dados para planilha CSV, permitindo que a equipe de Recursos Humanos audite as inconsistências estruturais e notifique os setores competentes:
1. A exportação contempla todos os registros filtrados na visão ativa ou a totalidade das pendências.
2. O arquivo gerado deve conter cabeçalhos em português (ex.: ID, Servidor, Matrícula, Ciclo, Tipo de Pendência, Diagnóstico, Status, Avaliador Designado, Data Resolução).
3. O conteúdo deve ser formatado com codificação UTF-8 com BOM (`\uFEFF`) para abertura direta e correta no Excel sem distorção de caracteres acentuados.

#### Scenario: Exportação do relatório de pendências
- **WHEN** o gestor clica no botão "Exportar CSV"
- **THEN** o navegador efetua o download imediato do arquivo `pendencias_hierarquia_capd_{data}.csv` com os dados sanitizados e prontos para conferência
