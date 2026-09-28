# cemiterio/operacoes-ordens-servico Specification

## Purpose
Permite aos administradores e equipes de campo dos cemitérios municipais controlar e monitorar todo o ciclo operacional de ordens de serviço, inumações, exumações e trasladações através de tabelas interativas (DataTable), alternância de visualização para campo, filtros multicritério e painel de indicadores operacionais.

## Requirements

### Requirement: Painel Superior de Indicadores Operacionais (KPIs)
O sistema DEVE (SHALL) exibir um painel consolidado de métricas operacionais no topo da aba de Operações, contextualizado ao cemitério ativo ou à visão municipal integrada.

#### Scenario: Visualização dos indicadores operacionais consolidados
- **WHEN** o usuário acessa a aba de Operações
- **THEN** o sistema exibe cartões de indicadores (KPIs) apresentando: total de Ordens de Serviço em aberto, ordens em execução no dia, total de inumações confirmadas no mês vigente e total de exumações/trasladações sob acompanhamento sanitário.

#### Scenario: Atualização dos indicadores conforme necrópole selecionada
- **WHEN** o usuário alterna a necrópole ativa através do seletor superior
- **THEN** os valores das métricas operacionais são recalculados e atualizados imediatamente para refletir apenas os dados da necrópole selecionada.

### Requirement: Visualização de Ordens de Serviço em DataTable e Cartões
O sistema DEVE (SHALL) disponibilizar alternância dinâmica entre visualização em Tabela Estruturada (`DataTable`) e visualização em Cartões (`Cards`), permitindo operação em terminais de escritório e dispositivos móveis de fiscais em campo.

#### Scenario: Alternância entre visão em tabela e visão em cartões
- **WHEN** o operador clica no seletor de modo de visualização entre "Tabela" e "Cartões"
- **THEN** o sistema alterna instantaneamente a renderização da lista de ordens de serviço preservando os filtros ativos, paginação e ordenação selecionados.

#### Scenario: Visualização estruturada com paginação e ordenação em DataTable
- **WHEN** o usuário está no modo de visualização em Tabela
- **THEN** o sistema exibe colunas contendo Número/Ano da OS (em JetBrains Mono), Tipo de Operação, Jazigo Vinculado, Falecido, Data/Hora Agendada, Equipe Responsável, Situação Operacional com Badge e Ações Rápidas, permitindo ordenação e seleção de quantidade de registros por página.

### Requirement: Painel de Filtros Avançados de Operações
O sistema DEVE (SHALL) fornecer um painel retrátil de filtros avançados para busca e segmentação rápida de ordens de serviço, inumações e exumações.

#### Scenario: Filtragem por situação, tipo e período de agendamento
- **WHEN** o operador aplica filtros combinados de situação (ex: "Em Execução"), tipo de operação (ex: "Inumação") e intervalo de datas agendadas
- **THEN** o sistema filtra a listagem exibindo exclusivamente os registros que atendem cumulativamente a todos os critérios informados.

#### Scenario: Busca textual instantânea unificada
- **WHEN** o usuário digita um termo na caixa de busca rápida (número da OS, nome do falecido ou código do jazigo)
- **THEN** o sistema refina os resultados exibidos em tempo real sem recarregar a tela inteira.

#### Scenario: Limpeza rápida de filtros avançados
- **WHEN** o usuário clica no botão "Limpar Filtros"
- **THEN** todos os filtros avançados são redefinidos para seus estados padrão e a listagem completa é restaurada.

### Requirement: Modal de Detalhes Completos da Ordem de Serviço
O sistema DEVE (SHALL) permitir a abertura de um modal com o raio-x detalhado de qualquer ordem de serviço selecionada.

#### Scenario: Consulta detalhada da ordem de serviço
- **WHEN** o usuário clica sobre uma linha da tabela ou no botão "Ver Detalhes" de um cartão de OS
- **THEN** o sistema abre um modal amplo exibindo dados cadastrais da OS, informações completas do falecido, dados do jazigo e gaveta, equipe designada, histórico de transições de estado, justificativas registradas (para suspensões ou cancelamentos) e botão para emissão/download da guia em PDF.

### Requirement: Transições de Estado e Ações Rápidas na Listagem
O sistema DEVE (SHALL) permitir a transição segura do ciclo de vida das ordens de serviço (Iniciar, Concluir, Suspender e Cancelar) com validações e exigência de justificativa quando cabível.

#### Scenario: Iniciar execução de ordem de serviço emitida
- **WHEN** o usuário com permissão clica em "Iniciar" em uma OS com situação "emitida"
- **THEN** o sistema registra a transição para "em_execucao", grava evento na trilha de auditoria e atualiza o status na listagem.

#### Scenario: Suspender ordem de serviço com motivo obrigatório
- **WHEN** o usuário clica em "Suspender" em uma OS em execução
- **THEN** o sistema exibe diálogo de confirmação exigindo o preenchimento do motivo (ex: restos ainda não decompostos), gravando o motivo e atualizando a situação para "suspensa".

### Requirement: DataTable Enriquecida para Inumações e Exumações
O sistema DEVE (SHALL) fornecer tabelas completas para histórico de inumações e exumações com rastreabilidade sanitária e atalhos operacionais.

#### Scenario: Navegação e revisão de inumações históricas
- **WHEN** o usuário acessa a aba de Inumações e filtra por "Pendentes de revisão"
- **THEN** o sistema lista apenas os registros de sepultamento histórico que necessitam de conferência de certidão e dados documentais, permitindo a homologação direta.

#### Scenario: Acesso direto ao prontuário do túmulo a partir da inumação
- **WHEN** o usuário clica no código do jazigo ou no botão de ação da inumação
- **THEN** o sistema abre a visualização detalhada do túmulo correspondente sem perder a posição na listagem de operações.
