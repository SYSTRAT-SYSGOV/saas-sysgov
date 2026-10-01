# Spec: requerimentos

## Purpose

Módulo de Requerimentos — digitalização do fluxo de tramitação de proposições legislativas e demandas institucionais entre a Câmara Municipal e a Prefeitura Municipal. Compreende requerimentos, indicações, projetos de lei, projetos de resolução, projetos de decreto legislativo, moções, ofícios e demais instrumentos de comunicação formal entre os Poderes. Opera sobre a base de dados única mantida pelo Módulo de Cadastro Único Centralizado e integra-se nativamente com o Módulo de Processo Administrativo Digital e o Módulo de Gestão de Fluxos de Trabalho (Workflow), assegurando rastreabilidade, celeridade e transparência na tramitação entre os Poderes Executivo e Legislativo.

---

## Requirements

### Requirement: Cadastro tipificado de proposições e demandas
<!-- entities: Proposicao, TipoInstrumento, Autor, Anexo -->

O sistema DEVE permitir o cadastro parametrizável de proposições por tipo de instrumento — requerimento, indicação, projeto de lei, projeto de resolução, projeto de decreto legislativo, moção, ofício e demais espécies definidas pela Administração. Cada tipo DEVE possuir campos específicos (ementa, justificativa, autor(es), partido/bancada quando aplicável, área temática, dispositivos legais correlatos e anexos), numeração sequencial própria por tipo e exercício, e vinculação, quando cabível, a proposição ou processo anterior.

O model `Proposicao` DEVE usar a trait `TenantAware` e todo valor monetário DEVE usar a classe `Money` (centavos inteiros).

#### Scenario: Cadastro de requerimento com dados obrigatórios
- **GIVEN** um usuário autenticado com permissão de criar proposições
- **WHEN** `criarProposicao()` recebe `tipo_instrumento = 'requerimento'`, `ementa`, `autor_id`, `area_tematica` e `justificativa` válidos
- **THEN** a proposição é persistida com `tenant_id` do contexto atual, número sequencial gerado automaticamente no formato `{tipo}/{numero}/{exercicio}`, status inicial `'protocolado'` e registro de auditoria criado

#### Scenario: Cadastro com tipo de instrumento não parametrizado
- **WHEN** `criarProposicao()` recebe `tipo_instrumento` não cadastrado na tabela `requerimentos_tipos_instrumento`
- **THEN** lança `DomainException` "Tipo de instrumento não parametrizado" e o controller responde HTTP 422

#### Scenario: Vinculação a proposição anterior
- **GIVEN** uma proposição existente com id `origem_id`
- **WHEN** `criarProposicao()` recebe `vinculacao_proposicao_id = origem_id`
- **THEN** a nova proposição é persistida com a referência de vinculação e o histórico da proposição origem registra o vínculo

#### Scenario: Numeração sequencial reiniciada por exercício
- **GIVEN** que já existem 5 requerimentos no exercício 2026
- **WHEN** um novo requerimento é criado no exercício 2026
- **THEN** recebe número 6; se for o primeiro de 2027, recebe número 1

---

### Requirement: Fluxo de tramitação entre Poderes
<!-- entities: TramitacaoPoderes, Encaminhamento, Recebimento, PrazoRegimental -->

O sistema DEVE permitir a tramitação eletrônica do instrumento entre a Câmara Municipal e a Prefeitura Municipal, com encaminhamento formal do documento de um Poder a outro, registro de recebimento, atribuição de responsável pela resposta ou manifestação, e devolução da resposta ao Poder de origem, tudo com controle de prazos regimentais ou legais aplicáveis a cada tipo de instrumento, com alertas automáticos de proximidade e de vencimento de prazo.

#### Scenario: Encaminhamento da Câmara para a Prefeitura
- **GIVEN** uma proposição com status `'protocolado'` originada na Câmara Municipal
- **WHEN** `encaminharParaPoder()` é chamado com `poder_destino = 'prefeitura'`, `responsavel_id` e `prazo_dias = 30`
- **THEN** a tramitação é registrada com status `'encaminhado'`, a data limite de resposta é calculada, e o responsável na Prefeitura é notificado

#### Scenario: Registro de recebimento pelo Poder destinatário
- **GIVEN** uma tramitação com status `'encaminhado'` endereçada à Prefeitura
- **WHEN** um usuário da Prefeitura com permissão chama `registrarRecebimento()`
- **THEN** o status da tramitação é atualizado para `'recebido'`, data e hora de recebimento são registradas, e o Poder de origem é notificado

#### Scenario: Devolução de resposta ao Poder de origem
- **GIVEN** uma tramitação com status `'recebido'` e uma resposta formal elaborada
- **WHEN** `devolverResposta()` é chamado com o texto da resposta e anexos
- **THEN** a tramitação é atualizada para `'respondido'`, a resposta e anexos são persistidos, e o autor da proposição no Poder de origem é notificado

#### Scenario: Alerta de proximidade de vencimento de prazo
- **GIVEN** uma tramitação com data limite de resposta em 5 dias corridos e status `'recebido'`
- **WHEN** o scheduler diário executa `VerificarPrazosJob`
- **THEN** um alerta de proximidade é enviado ao responsável e ao setor de protocolo do Poder destinatário

#### Scenario: Alerta de vencimento de prazo
- **GIVEN** uma tramitação cuja data limite de resposta já expirou e status diferente de `'respondido'`
- **WHEN** o scheduler diário executa `VerificarPrazosJob`
- **THEN** o status da tramitação é atualizado para `'vencido'`, um alerta de vencimento é enviado ao responsável, ao autor e ao setor de protocolo de ambos os Poderes, e o evento é registrado na trilha de auditoria

---

### Requirement: Fluxo de tramitação interna
<!-- entities: TramitacaoInterna, EtapaLegislativa, Workflow -->

O sistema DEVE permitir a configuração de fluxo de tramitação interna específico para cada tipo de proposição, contemplando as etapas legislativas ou administrativas aplicáveis (protocolo, distribuição a comissões, parecer técnico e/ou jurídico, inclusão em pauta, votação, sanção/veto, publicação), com apoio do Módulo de Gestão de Fluxos de Trabalho (Workflow) para a automação das etapas e dos respectivos responsáveis.

#### Scenario: Configuração de workflow por tipo de proposição
- **GIVEN** um usuário administrador com permissão de configurar workflows
- **WHEN** `configurarWorkflow()` recebe `tipo_instrumento = 'projeto_lei'` e uma sequência de etapas: protocolo → comissão_constituicao_justica → comissao_financas → pauta → votacao → sancao → publicacao
- **THEN** o workflow é persistido vinculado ao tipo de instrumento, com ordem, responsáveis padrão por etapa e prazos internos

#### Scenario: Avanço automático de etapa via Workflow
- **GIVEN** uma proposição do tipo `'projeto_lei'` na etapa `'comissao_constituicao_justica'` cujo parecer foi emitido
- **WHEN** o módulo de Workflow notifica a conclusão da etapa
- **THEN** a proposição avança automaticamente para a próxima etapa configurada e os responsáveis da nova etapa são notificados

#### Scenario: Tipos de proposição sem tramitação interna obrigatória
- **GIVEN** o tipo de instrumento `'oficio'` configurado sem workflow de tramitação interna
- **WHEN** um ofício é protocolado
- **THEN** a tramitação vai diretamente para o fluxo entre Poderes, sem etapas internas intermediárias

---

### Requirement: Resposta e manifestação formal
<!-- entities: RespostaFormal, AnexoResposta -->

O sistema DEVE oferecer ambiente para elaboração da resposta ou manifestação do Poder destinatário, com editor de texto integrado e anexação de documentos complementares, antes do encaminhamento de volta ao Poder de origem.

#### Scenario: Elaboração de resposta com editor de texto
- **GIVEN** uma tramitação com status `'recebido'` e um usuário responsável autenticado
- **WHEN** `elaborarResposta()` é chamado com `conteudo` contendo texto formatado e `anexos[]` com arquivos
- **THEN** a resposta é persistida como rascunho (`status = 'rascunho'`), permitindo edição posterior antes do envio

#### Scenario: Envio de resposta formal
- **GIVEN** uma resposta com status `'rascunho'`
- **WHEN** `enviarResposta()` é chamado
- **THEN** o status da resposta é alterado para `'enviado'`, a tramitação é atualizada para `'respondido'`, e o Poder de origem é notificado

#### Scenario: Tentativa de editar resposta já enviada
- **GIVEN** uma resposta com status `'enviado'`
- **WHEN** `elaborarResposta()` é chamado para editar
- **THEN** lança `DomainException` "Resposta já enviada não pode ser editada" e o controller responde HTTP 422

---

### Requirement: Notificações e alertas automáticos
<!-- entities: Notificacao, PreferenciaNotificacao -->

O sistema DEVE notificar automaticamente, por e-mail e/ou pelo Portal do Servidor/Portal do Vereador, os responsáveis por cada etapa da tramitação, o autor da proposição e o setor de protocolo, sempre que houver mudança de status, encaminhamento entre Poderes, resposta recebida ou proximidade de vencimento de prazo.

As notificações DEVEM ser disparadas via Laravel Events + Listeners + Jobs em fila (Redis), garantindo que a experiência do usuário não seja impactada por latências de envio.

#### Scenario: Notificação de mudança de status
- **GIVEN** uma proposição que avança de `'protocolado'` para `'em_tramitacao_interna'`
- **WHEN** o evento `ProposicaoStatusChanged` é disparado
- **THEN** o listener `EnviarNotificacaoStatus` dispara um Job que envia notificação ao autor, ao responsável pela nova etapa e ao setor de protocolo

#### Scenario: Notificação de resposta recebida
- **GIVEN** uma tramitação entre Poderes que recebe resposta do Poder destinatário
- **WHEN** `devolverResposta()` conclui com sucesso
- **THEN** o autor da proposição é notificado com o resumo da resposta e link para acesso ao texto integral

#### Scenario: Preferências de notificação do usuário
- **GIVEN** um usuário que configurou preferência para receber notificações apenas por e-mail
- **WHEN** uma notificação é disparada para esse usuário
- **THEN** a notificação é enviada apenas pelo canal e-mail, respeitando a preferência configurada

---

### Requirement: Painel de acompanhamento público
<!-- entities: PainelPublico -->

O sistema DEVE disponibilizar painel de consulta pública, integrado ao Portal da Transparência e/ou ao Portal Institucional, com informações sobre proposições em tramitação, autor, situação atual, histórico de tramitação e, quando aplicável, o texto integral e a resposta formal, assegurando publicidade e transparência do processo legislativo e administrativo à população.

#### Scenario: Consulta pública de proposições em tramitação
- **GIVEN** um cidadão acessando o Portal da Transparência
- **WHEN** acessa o painel de proposições sem autenticação
- **THEN** visualiza lista paginada de proposições com filtros por tipo, autor, área temática, situação e período, com informações públicas (ementa, autor, situação, datas de tramitação)

#### Scenario: Visualização do texto integral de proposição pública
- **GIVEN** uma proposição com visibilidade pública configurada
- **WHEN** um cidadão clica na proposição no painel público
- **THEN** visualiza o texto integral da proposição, histórico de tramitação resumido e, se respondida, o texto da resposta formal

#### Scenario: Proposição com restrição de visibilidade
- **GIVEN** uma proposição marcada como `visibilidade_publica = false`
- **WHEN** consultada via painel público
- **THEN** a proposição não aparece nos resultados de busca pública

---

### Requirement: Consulta e acompanhamento pelo autor
<!-- entities: AcompanhamentoAutor -->

O sistema DEVE oferecer ambiente de consulta individualizado, no qual o autor da proposição (vereador, comissão, secretaria ou setor da Prefeitura) possa acompanhar em tempo real a situação de suas proposições, incluindo prazos, pendências e histórico completo de tramitação, sem necessidade de solicitação formal de informação ao setor responsável.

#### Scenario: Dashboard do autor
- **GIVEN** um vereador autenticado no Portal do Vereador
- **WHEN** acessa "Minhas Proposições"
- **THEN** visualiza dashboard com cards de KPI (total de proposições, em tramitação, respondidas, com prazo vencido), lista de proposições com filtros e indicadores visuais de status (badges coloridos)

#### Scenario: Detalhamento de tramitação para o autor
- **GIVEN** uma proposição de autoria do usuário autenticado
- **WHEN** clica para visualizar detalhes
- **THEN** visualiza o histórico completo de tramitação (interna e entre Poderes), com datas, responsáveis, prazos e status de cada etapa, além de acesso ao texto integral da resposta quando existente

#### Scenario: Acesso de autor a proposição de outro autor
- **GIVEN** um vereador autenticado tentando acessar detalhes de proposição de outro autor
- **WHEN** a proposição tem `visibilidade_publica = false` e o usuário não é autor nem possui perfil de administrador
- **THEN** o controller responde HTTP 403

---

### Requirement: Relatórios gerenciais e estatísticos
<!-- entities: Relatorio, Indicador -->

O sistema DEVE permitir a emissão de relatórios gerenciais contendo quantidade de proposições por tipo, autor, período, área temática e situação (em tramitação, respondida, arquivada, aprovada, rejeitada); tempo médio de tramitação e de resposta por tipo de instrumento; e indicadores de cumprimento de prazos regimentais ou legais, subsidiando a gestão do relacionamento institucional entre os Poderes.

#### Scenario: Relatório quantitativo por tipo e período
- **GIVEN** um usuário com perfil de gestor acessando o módulo de relatórios
- **WHEN** solicita relatório com filtros `tipo_instrumento = 'todos'`, `periodo_inicio = '2026-01-01'`, `periodo_fim = '2026-12-31'`
- **THEN** o sistema gera relatório com contagem de proposições por tipo, autor, área temática e situação no período

#### Scenario: Indicador de tempo médio de tramitação
- **GIVEN** um usuário com perfil de gestor
- **WHEN** solicita indicador de tempo médio para o tipo `'requerimento'` no exercício corrente
- **THEN** o sistema calcula e exibe o tempo médio (em dias) entre o protocolo e a resposta final, com mediana e desvio padrão

#### Scenario: Indicador de cumprimento de prazos
- **GIVEN** um usuário com perfil de gestor
- **WHEN** solicita indicador de cumprimento de prazos regimentais
- **THEN** o sistema exibe percentual de tramitações respondidas dentro do prazo, com alertas e fora do prazo, segmentado por tipo de instrumento

---

### Requirement: Segregação de acesso por Poder e por perfil
<!-- entities: User, Role, Poder, Permissao -->

O sistema DEVE implementar controle de acesso segregado por perfil de usuário e por Poder (Câmara Municipal e Prefeitura Municipal), de modo que cada Poder edite e tramite apenas as proposições e respostas sob sua responsabilidade, com visibilidade compartilhada e em tempo real do andamento das proposições em tramitação conjunta, sem que isso implique acesso de um Poder aos processos internos exclusivos do outro que não estejam vinculados à proposição em trâmite.

#### Scenario: Usuário da Câmara tenta editar proposição da Prefeitura
- **GIVEN** um usuário vinculado ao Poder `'camara'` e uma proposição originada no Poder `'prefeitura'`
- **WHEN** tenta editar a proposição
- **THEN** a Policy `ProposicaoPolicy::update()` nega acesso e o controller responde HTTP 403

#### Scenario: Visibilidade compartilhada de tramitação conjunta
- **GIVEN** uma proposição da Câmara encaminhada à Prefeitura (tramitação entre Poderes ativa)
- **WHEN** um usuário da Prefeitura consulta a proposição
- **THEN** visualiza os dados da proposição e o histórico de tramitação entre Poderes, mas não tem acesso às etapas de tramitação interna da Câmara que não sejam de sua competência

#### Scenario: Acesso a processos internos não vinculados
- **GIVEN** um usuário da Prefeitura e um processo administrativo interno da Câmara não vinculado a proposição em trâmite conjunto
- **WHEN** tenta acessar o processo interno da Câmara
- **THEN** o sistema nega acesso, pois o processo não está vinculado a proposição em tramitação conjunta

---

### Requirement: Trilha de auditoria
<!-- entities: AuditoriaLog -->

O sistema DEVE registrar log de toda inclusão, tramitação, resposta e alteração de status de proposição, com identificação do usuário responsável, Poder de origem, data e hora, disponibilizado para fins de auditoria interna e externa e de eventual controle pelo Tribunal de Contas.

Toda mutação DEVE ser registrada via `AuditLogger` na tabela `audit_logs`, em conformidade com o padrão do SYSGOV.

#### Scenario: Registro de auditoria na criação de proposição
- **GIVEN** um usuário autenticado que cria uma proposição
- **WHEN** `criarProposicao()` persiste com sucesso
- **THEN** um registro é inserido em `audit_logs` com `event = 'proposicao.criada'`, `user_id`, `tenant_id`, `poder_origem` e metadados da proposição

#### Scenario: Registro de auditoria na tramitação entre Poderes
- **GIVEN** uma tramitação entre Poderes realizada
- **WHEN** `encaminharParaPoder()` conclui com sucesso
- **THEN** um registro é inserido em `audit_logs` com `event = 'proposicao.tramitacao_encaminhada'`, incluindo `poder_origem`, `poder_destino` e `prazo_dias`

#### Scenario: Consulta de trilha de auditoria
- **GIVEN** um auditor ou controlador interno autenticado
- **WHEN** consulta a trilha de auditoria de uma proposição específica
- **THEN** visualiza todos os eventos ordenados cronologicamente, com usuário, Poder, data/hora e detalhes da operação

---

### Requirement: Conformidade legal e APIs de integração
<!-- entities: IntegracaoDiarioOficial, IntegracaoAssinaturaDigital -->

O sistema DEVE estar em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) quanto ao tratamento de dados pessoais eventualmente constantes das proposições, com criptografia de dados em trânsito e em repouso, e disponibilização de interfaces de programação de aplicações (APIs) abertas e documentadas para eventual integração com o Diário Oficial Eletrônico, para fins de publicação automática de atos aprovados, e com o módulo de Assinatura Digital da plataforma.

#### Scenario: API de publicação no Diário Oficial
- **GIVEN** uma proposição aprovada com status `'aprovado'` e necessidade de publicação
- **WHEN** o endpoint `POST /api/requerimentos/publicar-diario` é chamado com os dados da proposição
- **THEN** o sistema formata e disponibiliza os dados da proposição para integração com o Diário Oficial Eletrônico, registrando a tentativa de publicação na trilha de auditoria

#### Scenario: Integração com Assinatura Digital
- **GIVEN** uma proposição ou resposta que necessita de assinatura digital com validade jurídica
- **WHEN** o fluxo de assinatura é acionado
- **THEN** o sistema invoca o módulo de Assinatura Digital da plataforma (ICP-Brasil via PSC) e registra o timestamp e ID de transação

#### Scenario: Conformidade LGPD — dados pessoais
- **GIVEN** uma proposição contendo dados pessoais (CPF, endereço) de cidadão
- **WHEN** a proposição é persistida ou transmitida
- **THEN** os dados pessoais são criptografados em repouso (AES-256) e transmitidos exclusivamente via TLS 1.3, com registro de acesso aos dados pessoais na trilha de auditoria

#### Scenario: Ocultação de dados pessoais no painel público
- **GIVEN** uma proposição com `visibilidade_publica = true` mas contendo dados pessoais no conteúdo
- **WHEN** exibida no painel público
- **THEN** os dados pessoais (CPF, RG, endereço, telefone) são automaticamente mascarados ou suprimidos da visualização pública