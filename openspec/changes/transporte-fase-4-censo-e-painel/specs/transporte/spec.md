## ADDED Requirements

### Requirement: Pré-validação do Registro 60
O sistema DEVE gerar, por ano letivo, a pré-validação do transporte para o Censo, listando por aluno as pendências `sem_alocacao_ativa` (aluno que teve alocação no ano e não tem nenhuma ativa), `rota_sem_veiculo`, `rural_sem_declaracao`, `veiculo_nao_adaptado` e `sem_codigo_inep`, e o aviso `turno_divergente`. O sistema DEVE marcar `approved` somente quando não houver pendência; o aviso não impede a aprovação. Exige `transporte.censo.export`.

#### Scenario: Rota sem veículo
- **GIVEN** um aluno alocado em rota sem veículo
- **WHEN** a pré-validação do ano é executada
- **THEN** o aluno aparece com a pendência `rota_sem_veiculo` e `approved` é falso

#### Scenario: Necessidade especial em veículo comum
- **GIVEN** um aluno com necessidade especial alocado em veículo não acessível
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `veiculo_nao_adaptado`

#### Scenario: Aluno rural sem declaração
- **GIVEN** uma alocação em rota rural com `usa_transporte_rural` falso
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `rural_sem_declaracao`

#### Scenario: Aluno sem código Inep
- **GIVEN** o leiaute do ano exige o código Inep do aluno e ele não está cadastrado
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `sem_codigo_inep`

#### Scenario: Sem pendências
- **WHEN** todos os dados estão consistentes
- **THEN** `approved` é verdadeiro e a lista vem vazia

#### Scenario: Só aviso de turno
- **GIVEN** a única ocorrência é um `turno_divergente`
- **WHEN** a pré-validação é executada
- **THEN** o aviso é listado e `approved` continua verdadeiro

#### Scenario: Usuário sem permissão
- **WHEN** um usuário sem `transporte.censo.export` pede a pré-validação
- **THEN** o servidor responde 403

### Requirement: Arquivo do Registro 60 no leiaute oficial do Educacenso
O sistema DEVE gerar o arquivo do Registro 60 conforme o leiaute oficial vigente do Inep para o ano do Censo, com uma linha por alocação ativa do ano letivo, preenchendo transporte público, poder público responsável e as onze tipologias de veículo, e escolhendo o leiaute pelo ano informado. Os campos de matrícula que o módulo não possui DEVEM sair vazios onde o leiaute permitir.

#### Scenario: Aluno transportado por ônibus municipal
- **GIVEN** um aluno com poder público 2 em rota com veículo de tipologia 3
- **WHEN** o arquivo do ano é gerado
- **THEN** a linha tem transporte público 1, poder público 2 e a tipologia ônibus marcada, com as demais zeradas

#### Scenario: Tipologia ferroviária
- **GIVEN** um veículo de tipologia 11
- **WHEN** o arquivo é gerado
- **THEN** a tipologia ferroviário está marcada

#### Scenario: Alocação encerrada
- **GIVEN** um aluno com alocação encerrada
- **WHEN** o arquivo é gerado
- **THEN** ele não tem linha

#### Scenario: Ano sem leiaute implementado
- **WHEN** se pede o arquivo de um ano para o qual não há leiaute implementado
- **THEN** o sistema responde 422 informando os anos disponíveis

#### Scenario: Arquivo de referência
- **GIVEN** o exemplo do documento oficial do ano
- **WHEN** os mesmos dados são gerados pelo sistema
- **THEN** o arquivo é idêntico ao de referência

### Requirement: Anulação da declaração de transporte público
O sistema DEVE deixar vazios os campos de transporte público e zerar as tipologias na linha do aluno cuja alocação não tem atendimento curricular, tem mediação didática `distancia` ou tem país de residência diferente de `BR`.

#### Scenario: Sem atendimento curricular
- **GIVEN** uma alocação com `atendimento_curricular` falso
- **WHEN** o arquivo é gerado
- **THEN** transporte público e poder público ficam vazios

#### Scenario: Ensino a distância
- **GIVEN** uma alocação com mediação `distancia`
- **WHEN** o arquivo é gerado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Residência no exterior
- **GIVEN** uma alocação com país de residência `PY`
- **WHEN** o arquivo é gerado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Caso comum
- **GIVEN** atendimento curricular, mediação presencial e país `BR`
- **WHEN** o arquivo é gerado
- **THEN** a declaração não é anulada

### Requirement: Escolha dos campos a exportar
O sistema DEVE oferecer, por leiaute, um catálogo de campos do Registro 60 em que o usuário marca quais exportar. Campos obrigatórios do leiaute DEVEM vir marcados e NÃO PODEM ser desmarcados. No arquivo oficial, o campo não selecionado DEVE sair vazio na sua posição; no CSV de conferência, DEVE ser omitido. Campos sensíveis DEVEM exigir confirmação explícita, e a observação de necessidade especial NÃO DEVE existir no catálogo.

#### Scenario: Campo opcional desmarcado
- **GIVEN** um campo opcional do leiaute
- **WHEN** o usuário o desmarca e gera o arquivo oficial
- **THEN** a posição do campo continua no arquivo, vazia, e as demais não mudam de lugar

#### Scenario: Campo omitido no CSV
- **WHEN** o mesmo campo desmarcado é usado no CSV de conferência
- **THEN** a coluna não aparece

#### Scenario: Campo obrigatório
- **WHEN** o usuário tenta desmarcar um campo obrigatório do leiaute
- **THEN** a interface o mantém marcado e explica que o leiaute o exige

#### Scenario: Campo sensível
- **WHEN** o usuário marca um campo sensível
- **THEN** o sistema pede confirmação e o campo consta na auditoria da geração

#### Scenario: Observação de necessidade especial
- **WHEN** o catálogo de campos é listado
- **THEN** a observação da necessidade especial não está nele

#### Scenario: Campo selecionado sem dado
- **GIVEN** um campo selecionado que nenhum aluno tem preenchido
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `campo_sem_dado` com o nome do campo

### Requirement: Modelos de exportação
O sistema DEVE permitir salvar a seleção de campos como um modelo nomeado, por leiaute e por tenant, reaplicá-lo, editá-lo e excluí-lo, e DEVE ter um modelo padrão "Registro 60 completo" que não pode ser excluído nem alterado.

#### Scenario: Salvar e reaplicar
- **WHEN** o usuário salva a seleção como "Conferência da Secretaria" e a escolhe numa outra sessão
- **THEN** os mesmos campos vêm marcados

#### Scenario: Modelo padrão
- **WHEN** o usuário tenta excluir o modelo "Registro 60 completo"
- **THEN** o sistema responde 409

#### Scenario: Modelo de outro tenant
- **WHEN** um usuário pede o modelo de outro tenant
- **THEN** o sistema responde 404

#### Scenario: Modelo de outro leiaute
- **WHEN** um modelo salvo para um ano é aplicado a um ano cujo leiaute não tem alguns dos campos
- **THEN** os campos inexistentes são ignorados e o usuário é avisado

### Requirement: CSV de conferência
O sistema DEVE oferecer um CSV de conferência (UTF-8 com BOM, separador `;`) com aluno, escola, turno, rota, placa, tipologia e as variáveis de transporte, sem CPF, sem endereço e sem a observação de necessidade especial, neutralizando células iniciadas por `=`, `+`, `-` ou `@`.

#### Scenario: Nome iniciado por sinal
- **GIVEN** um nome de aluno que começa com "="
- **WHEN** o CSV de conferência é gerado
- **THEN** a célula é gravada com um apóstrofo à frente

#### Scenario: Sem dado sensível
- **WHEN** o CSV de conferência é gerado
- **THEN** ele não tem CPF, endereço nem observação de necessidade especial

### Requirement: Auditoria e guarda dos arquivos do Censo
Cada pré-validação e cada geração de arquivo DEVE ser auditada com usuário, ano, tipo de arquivo, quantidade de linhas, versão do leiaute e a lista de campos exportados. O arquivo gerado NÃO DEVE ser guardado no servidor.

#### Scenario: Geração registrada
- **WHEN** o arquivo do Educacenso é gerado
- **THEN** o `audit_logs` tem o evento com o ano, o total de linhas e a versão do leiaute

#### Scenario: Nada guardado
- **WHEN** a geração termina
- **THEN** não resta arquivo no armazenamento do servidor

### Requirement: Painel de lotação
O módulo DEVE ter um painel com: rotas ativas, veículos ativos, alunos transportados, ocupação média (ponderada pela capacidade) e rotas em superlotação, e a lista de rotas com a faixa de ocupação (verde até 80 %, amarelo de 81 % a 100 %, vermelho acima de 100 %), mostrando também o rótulo de texto, não só a cor. Rotas sem veículo DEVEM aparecer como pendência.

#### Scenario: Rota vermelha
- **WHEN** uma rota tem mais alunos que a capacidade
- **THEN** ela aparece em vermelho com o rótulo "Superlotada" e no topo da lista

#### Scenario: Rota sem veículo
- **WHEN** uma rota não tem veículo
- **THEN** ela aparece como pendência, sem percentual

#### Scenario: Sem dados
- **WHEN** o tenant não tem rotas
- **THEN** o painel mostra o estado vazio

### Requirement: Alertas no painel
O painel DEVE incluir os alertas de vencimento da frota (Fase 1), com os críticos primeiro.

#### Scenario: Alerta crítico no topo
- **GIVEN** um alerta crítico de vistoria e um de atenção de CNH
- **WHEN** o painel é aberto
- **THEN** o crítico aparece antes do de atenção

### Requirement: Consulta da auditoria do módulo
O módulo DEVE ter tela de auditoria com filtro por período, ação e usuário, exigindo `transporte.audit`.

#### Scenario: Filtro por ação
- **WHEN** o auditor filtra pela ação `alocacao.excesso_autorizado`
- **THEN** só esses eventos aparecem, com a justificativa
