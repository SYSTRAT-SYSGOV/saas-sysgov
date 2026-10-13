# Spec Delta: Vistoria

## Purpose

Módulo de Vistoria e Inspeção — digitalização do processo de fiscalização de campo conduzido pela Secretaria de Agricultura, compreendendo planejamento, execução e registro de vistorias, inspeções e autuações em propriedades rurais, estabelecimentos, feiras, eventos e demais locais sujeitos à fiscalização sanitária, agropecuária e ambiental municipal. Suporta operação em tablet com modo offline e coleta de assinatura/rubrica em tela. Opera sobre a base de dados única do Módulo de Cadastro Único Centralizado (`Modules/Pessoas`) e sobre a hierarquia organizacional do `Modules/OrgChart`, implementando internamente o armazenamento versionado de documentos/evidências e a tramitação do processo administrativo sancionatório decorrente da autuação.

## ADDED Requirements

### Requirement: Cadastro de locais fiscalizáveis
<!-- entities: LocalFiscalizavel, ClassificacaoAtividade -->

O sistema SHALL permitir o cadastro georreferenciado de propriedades rurais, estabelecimentos comerciais, feiras, eventos e demais locais sujeitos à fiscalização, com vinculação ao proprietário ou responsável resolvido no Cadastro Único Centralizado (`Modules/Pessoas`), histórico de vistorias anteriores e classificação por tipo de atividade (produção animal, produção vegetal, agroindústria, comércio de insumos e demais tipos definidos pela Secretaria).

O model `LocalFiscalizavel` SHALL usar a trait `TenantAware`.

#### Scenario: Cadastro de propriedade rural com georreferenciamento
- **GIVEN** um usuário autenticado com permissão `vistoria.locais.manage`
- **WHEN** `criarLocal()` recebe `tipo = 'propriedade_rural'`, `latitude`, `longitude`, `proprietario_pessoa_id` válido no Cadastro Único e `classificacao_atividade`
- **THEN** o local é persistido com `tenant_id` do contexto atual e registro de auditoria criado

#### Scenario: Vinculação a proprietário inexistente no Cadastro Único
- **WHEN** `criarLocal()` recebe `proprietario_pessoa_id` que não existe em `Modules/Pessoas` para o tenant atual
- **THEN** lança `DomainException` "Proprietário não encontrado no Cadastro Único" e o controller responde HTTP 422

#### Scenario: Consulta de histórico de vistorias do local
- **GIVEN** um local fiscalizável com 3 vistorias anteriores registradas
- **WHEN** `obterHistorico()` é chamado para esse local
- **THEN** retorna as 3 vistorias ordenadas por data decrescente, incluindo resultado (regular/irregular) de cada uma

---

### Requirement: Planejamento e agendamento de vistorias
<!-- entities: OrdemServico, RoteiroDeslocamento -->

O sistema SHALL permitir a criação de ordens de serviço de vistoria vinculadas a um fiscal ou equipe responsável, com tipo de ação (vistoria de rotina, inspeção sanitária, atendimento a denúncia, reinspeção, autuação), data prevista, roteiro de deslocamento e priorização por criticidade, com distribuição automática de demandas entre fiscais disponíveis, escopada pela unidade organizacional (`Modules/OrgChart`) da Secretaria de Agricultura.

#### Scenario: Criação de ordem de serviço com fiscal designado manualmente
- **GIVEN** um usuário com permissão `vistoria.ordens.manage` (chefia)
- **WHEN** `criarOrdemServico()` recebe `local_id`, `tipo_acao = 'vistoria_rotina'`, `fiscal_id`, `data_prevista` e `criticidade`
- **THEN** a ordem é persistida com status `'agendada'` e o fiscal designado é notificado

#### Scenario: Distribuição automática entre fiscais disponíveis
- **GIVEN** uma denúncia recebida sem fiscal pré-definido e dois fiscais da Secretaria de Agricultura com agenda disponível na data
- **WHEN** `distribuirAutomaticamente()` é chamado para a ordem
- **THEN** a ordem é atribuída ao fiscal com menor carga de ordens pendentes na mesma unidade organizacional, e esse fiscal é notificado

#### Scenario: Priorização por criticidade altera ordem de exibição
- **GIVEN** três ordens de serviço pendentes do mesmo fiscal com criticidade `'baixa'`, `'alta'` e `'urgente'`
- **WHEN** o fiscal consulta sua agenda do dia
- **THEN** as ordens são listadas em ordem decrescente de criticidade (urgente, alta, baixa)

---

### Requirement: Execução de vistoria em campo com suporte offline
<!-- entities: ExecucaoVistoria, FilaSincronizacao -->

O sistema SHALL disponibilizar execução de vistoria em tablet/smartphone com funcionamento em modo offline (sem conexão contínua à internet), enfileirando localmente os dados coletados e sincronizando automaticamente com o servidor assim que houver conectividade disponível, e com acesso do fiscal, no próprio dispositivo, ao histórico de vistorias anteriores do local a ser inspecionado (previamente baixado durante o último acesso online).

Cada registro criado offline SHALL receber um identificador único gerado no dispositivo (`client_uuid`), usado como `Idempotency-Key` na sincronização, de modo que reenvio por falha de rede nunca gere duplicidade.

#### Scenario: Preenchimento de vistoria sem conectividade
- **GIVEN** um fiscal autenticado com uma ordem de serviço já baixada no dispositivo e sem sinal de internet
- **WHEN** ele preenche o checklist, captura fotos e coleta assinatura
- **THEN** os dados são persistidos localmente no dispositivo com `client_uuid` e status `'pendente_sincronizacao'`, sem erro de rede exibido ao usuário

#### Scenario: Sincronização automática ao reconectar
- **GIVEN** um dispositivo com 2 vistorias pendentes de sincronização e conectividade restabelecida
- **WHEN** a aplicação detecta a reconexão
- **THEN** as 2 vistorias são enviadas ao servidor usando seus `client_uuid` como `Idempotency-Key`, e cada uma passa a status `'sincronizada'` após confirmação, sem intervenção manual do fiscal

#### Scenario: Reenvio duplicado por falha de rede não gera duplicidade
- **GIVEN** uma vistoria com `client_uuid = 'abc-123'` já recebida e persistida pelo servidor
- **WHEN** o dispositivo reenvia a mesma vistoria com o mesmo `client_uuid` por timeout de confirmação
- **THEN** o servidor identifica o `Idempotency-Key` já processado e retorna o registro existente, sem criar um segundo

#### Scenario: Acesso ao histórico do local offline
- **GIVEN** um fiscal que baixou a ordem de serviço do dia anterior, incluindo o histórico das 3 últimas vistorias do local
- **WHEN** ele abre a ordem de serviço sem conectividade
- **THEN** visualiza o histórico das 3 vistorias anteriores normalmente, a partir dos dados já armazenados no dispositivo

---

### Requirement: Formulários dinâmicos de vistoria e checklist
<!-- entities: ModeloFormulario, Pergunta, RespostaChecklist -->

O sistema SHALL permitir o preenchimento de formulários de vistoria parametrizáveis por tipo de fiscalização, com campos de múltipla escolha, texto livre, captura de fotografia e georreferenciamento automático do local no momento do registro, permitindo que a Secretaria customize os itens de checklist conforme a natureza da atividade fiscalizada, sem necessidade de nova implantação/deploy para criar um novo formulário.

#### Scenario: Criação de novo modelo de formulário pela chefia
- **GIVEN** um usuário com permissão `vistoria.formularios.manage`
- **WHEN** `criarModeloFormulario()` recebe `tipo_fiscalizacao = 'agroindustria'` e uma lista de perguntas com tipos (`multipla_escolha`, `texto_livre`, `foto`)
- **THEN** o modelo é persistido e passa a ficar disponível para seleção em novas ordens de serviço desse tipo, sem necessidade de deploy

#### Scenario: Preenchimento de checklist com georreferenciamento automático
- **GIVEN** uma vistoria em execução e um formulário do tipo `'agroindustria'` associado
- **WHEN** o fiscal responde a última pergunta do checklist
- **THEN** a resposta é persistida com `latitude`/`longitude` capturadas automaticamente no momento do registro

#### Scenario: Pergunta obrigatória não respondida bloqueia conclusão
- **GIVEN** um formulário com uma pergunta marcada como `obrigatoria = true`
- **WHEN** o fiscal tenta concluir a vistoria sem respondê-la
- **THEN** a conclusão é bloqueada e a pergunta pendente é destacada na interface

---

### Requirement: Lavratura de auto de infração e documentos em campo
<!-- entities: AutoInfracao, Documento, Contador -->

O sistema SHALL permitir a emissão, diretamente no dispositivo móvel, de auto de infração, notificação, termo de embargo/interdição, termo de apreensão ou documento equivalente, com preenchimento automático dos dados do autuado a partir do Cadastro Único, descrição da irregularidade constatada, enquadramento legal e prazo para defesa ou regularização, gerando numeração única e documento em PDF ao final do preenchimento.

A numeração sequencial SHALL ser atômica por tipo de documento e exercício, usando `DB::transaction()` + `lockForUpdate()` na tabela de contadores.

#### Scenario: Lavratura de auto de infração com dados preenchidos automaticamente
- **GIVEN** uma vistoria em execução vinculada a um local cujo proprietário está cadastrado no Cadastro Único
- **WHEN** o fiscal escolhe `emitirDocumento(tipo: 'auto_infracao')` e informa `irregularidade`, `enquadramento_legal` e `prazo_dias`
- **THEN** o documento é gerado com os dados do autuado preenchidos automaticamente, numeração única no formato `{tipo}/{numero}/{exercicio}` e PDF disponível para visualização/impressão

#### Scenario: Numeração sequencial reiniciada por exercício
- **GIVEN** que já existem 12 autos de infração emitidos no exercício 2026
- **WHEN** um novo auto de infração é emitido no mesmo exercício
- **THEN** recebe número 13; se for o primeiro de 2027, recebe número 1

#### Scenario: Emissão de termo de embargo com prazo de regularização
- **WHEN** `emitirDocumento(tipo: 'termo_embargo')` é chamado com `prazo_dias = 15`
- **THEN** o documento é gerado com a data limite de regularização calculada e vinculado automaticamente ao agendamento de reinspeção (ver requisito de reinspeção)

---

### Requirement: Coleta de assinatura e rubrica em tela
<!-- entities: AssinaturaColeta, RegistroRecusa -->

O sistema SHALL captar a assinatura ou rubrica do autuado, do responsável pelo estabelecimento ou de testemunha, diretamente na tela do dispositivo, por captura manuscrita touch, vinculando a assinatura ao documento gerado e registrando data, hora e coordenadas geográficas do momento da coleta. O sistema SHALL admitir o registro de recusa de assinatura pelo autuado, com campo específico para essa hipótese e identificação de testemunha quando aplicável.

O traçado da assinatura SHALL ser armazenado tanto em forma vetorial (pontos capturados) quanto rasterizada (PNG), vinculado ao documento por hash `sha256`.

#### Scenario: Coleta de assinatura do autuado vinculada ao documento
- **GIVEN** um auto de infração gerado e pronto para assinatura
- **WHEN** o autuado assina na tela do tablet
- **THEN** a assinatura é persistida com data/hora/coordenadas do momento da coleta e vinculada ao documento por hash, exibida no PDF final

#### Scenario: Registro de recusa de assinatura com testemunha
- **GIVEN** um auto de infração gerado e o autuado se recusa a assinar
- **WHEN** o fiscal registra `recusaAssinatura(motivo, testemunha_pessoa_id)`
- **THEN** o documento é marcado com `assinatura_status = 'recusada'`, o motivo é registrado, a testemunha é vinculada e o PDF final descreve a recusa formalmente

#### Scenario: Timestamp oficial usa o relógio do servidor, não do dispositivo
- **GIVEN** um dispositivo com o relógio local desconfigurado (adiantado em 2 horas) coletando uma assinatura offline
- **WHEN** a coleta é sincronizada com o servidor
- **THEN** o campo oficial de data/hora da assinatura usa o timestamp do servidor no momento da sincronização, e o timestamp do dispositivo é mantido apenas como metadado complementar

---

### Requirement: Anexação de evidências fotográficas e documentais
<!-- entities: Evidencia, MarcaDagua -->

O sistema SHALL permitir a captura e anexação de fotografias diretamente pelo aplicativo no momento da vistoria, com marca d'água automática contendo data, hora e coordenadas geográficas, além de upload de documentos complementares (notas fiscais, licenças, laudos) apresentados pelo fiscalizado no ato da inspeção.

A marca d'água SHALL ser aplicada no servidor no momento da sincronização, usando o timestamp do servidor, preservando a foto original sem marca d'água.

#### Scenario: Captura de fotografia com marca d'água
- **GIVEN** uma vistoria em execução
- **WHEN** o fiscal captura uma fotografia e ela é sincronizada com o servidor
- **THEN** a versão exibida/impressa da fotografia contém marca d'água com data, hora (do servidor) e coordenadas geográficas, e a foto original sem marca d'água é preservada no armazenamento

#### Scenario: Upload de documento complementar apresentado pelo fiscalizado
- **GIVEN** uma vistoria em execução e o fiscalizado apresenta uma nota fiscal em papel
- **WHEN** o fiscal fotografa/digitaliza o documento e anexa via `anexarDocumentoComplementar()`
- **THEN** o anexo é persistido vinculado à vistoria, com tipo `'documento_complementar'` e identificação de quem apresentou

---

### Requirement: Tramitação do processo administrativo sancionatório
<!-- entities: ProcessoSancionatorio, Defesa, Julgamento, Penalidade, Recurso -->

O sistema SHALL, ao lavrar um auto de infração, abrir automaticamente um processo administrativo sancionatório interno, com controle de prazo para apresentação de defesa pelo autuado e acompanhamento das etapas de julgamento, aplicação de penalidade e eventual recurso.

O `ProcessoSancionatorio` é modelado como máquina de estados (`aberto` → `em_defesa` → `em_julgamento` → `penalidade_aplicada` | `arquivado` → `em_recurso` → `concluido`), capacidade interna do módulo `Vistoria` (ver `design.md`, decisão 2) — não depende de um módulo de Processo Administrativo Digital externo.

#### Scenario: Abertura automática de processo ao lavrar auto de infração
- **GIVEN** um auto de infração lavrado com `prazo_dias = 15`
- **WHEN** o documento é sincronizado/confirmado pelo servidor
- **THEN** um `ProcessoSancionatorio` é aberto com status `'aberto'`, prazo de defesa calculado e autuado notificado

#### Scenario: Apresentação de defesa dentro do prazo
- **GIVEN** um processo com status `'aberto'` e prazo de defesa não vencido
- **WHEN** `apresentarDefesa()` é chamado com o texto/anexos da defesa
- **THEN** o status passa para `'em_defesa'` e o processo segue para julgamento

#### Scenario: Prazo de defesa vencido sem manifestação
- **GIVEN** um processo com status `'aberto'` e prazo de defesa expirado sem defesa apresentada
- **WHEN** o scheduler diário verifica os prazos
- **THEN** o processo avança automaticamente para `'em_julgamento'` com a anotação "revelia — ausência de defesa no prazo"

#### Scenario: Aplicação de penalidade e abertura de prazo de recurso
- **GIVEN** um processo com status `'em_julgamento'`
- **WHEN** `julgar()` é chamado com decisão `'procedente'` e `penalidade` (multa em centavos e/ou outra sanção)
- **THEN** o status passa para `'penalidade_aplicada'`, a penalidade é persistida com `Money` (centavos inteiros, nunca float) e um novo prazo de recurso é aberto

---

### Requirement: Controle de reinspeção e reincidência
<!-- entities: Reinspecao, HistoricoReincidencia -->

O sistema SHALL gerenciar os prazos para regularização de irregularidades constatadas, com agendamento automático de reinspeção ao término do prazo concedido, e manter histórico de reincidência do mesmo local ou responsável em fiscalizações anteriores.

#### Scenario: Agendamento automático de reinspeção ao fim do prazo
- **GIVEN** um auto de infração com prazo de regularização de 15 dias
- **WHEN** o prazo expira
- **THEN** uma nova ordem de serviço do tipo `'reinspecao'` é criada automaticamente para o mesmo local, vinculada ao auto de infração original

#### Scenario: Identificação de reincidência na criação de nova ordem de serviço
- **GIVEN** um local com 2 autuações anteriores nos últimos 12 meses
- **WHEN** uma nova ordem de serviço é criada para esse local
- **THEN** a tela de execução exibe destaque de "local reincidente" com o histórico das autuações anteriores visível ao fiscal

#### Scenario: Regularização constatada em reinspeção encerra o acompanhamento
- **GIVEN** uma reinspeção em execução referente a um auto de infração com prazo vencido
- **WHEN** o fiscal registra `constatarRegularizacao()`
- **THEN** o processo sancionatório vinculado é atualizado para refletir a regularização e o acompanhamento de prazo é encerrado

---

### Requirement: Painel gerencial e mapa de fiscalização
<!-- entities: PainelGerencial, IndicadorProdutividade -->

O sistema SHALL disponibilizar painel gerencial com visualização em mapa das vistorias realizadas e pendentes, indicadores de produtividade por fiscal, quantidade de autuações por tipo de irregularidade e por período, taxa de regularização após autuação e tempo médio entre a vistoria e a conclusão do processo administrativo decorrente.

#### Scenario: Visualização em mapa de vistorias pendentes e realizadas
- **GIVEN** um usuário com perfil de chefia acessando o painel gerencial
- **WHEN** aplica o filtro de período do mês corrente
- **THEN** visualiza um mapa com marcadores distintos para vistorias pendentes e realizadas no período, com clique abrindo o detalhe da ordem de serviço

#### Scenario: Indicador de produtividade por fiscal
- **GIVEN** três fiscais com 10, 15 e 8 vistorias concluídas no mês
- **WHEN** a chefia consulta o indicador de produtividade
- **THEN** o painel exibe a contagem de vistorias concluídas por fiscal no período, ordenável

#### Scenario: Taxa de regularização após autuação
- **GIVEN** 20 autos de infração emitidos no período, dos quais 14 resultaram em regularização constatada em reinspeção
- **WHEN** a chefia consulta a taxa de regularização
- **THEN** o painel exibe 70% de taxa de regularização para o período filtrado

---

### Requirement: Segregação de acesso por perfil (fiscal × chefia)
<!-- entities: User, Role, OrdemServicoPolicy -->

O sistema SHALL controlar o acesso segmentado por perfil, de modo que o fiscal de campo tenha acesso apenas às ordens de serviço a ele atribuídas e ao histórico necessário à execução da vistoria, e a chefia da Secretaria de Agricultura detenha acesso administrativo integral para distribuição de demandas, acompanhamento gerencial e emissão de relatórios, escopado pela unidade organizacional do `Modules/OrgChart`.

#### Scenario: Fiscal tenta acessar ordem de serviço de outro fiscal
- **GIVEN** um usuário com role `vistoria.fiscal` e uma ordem de serviço atribuída a outro fiscal
- **WHEN** tenta visualizar os detalhes dessa ordem
- **THEN** a `OrdemServicoPolicy::view()` nega acesso e o controller responde HTTP 403

#### Scenario: Chefia acessa todas as ordens da própria unidade organizacional
- **GIVEN** um usuário com role `vistoria.chefia` vinculado à unidade "Secretaria de Agricultura"
- **WHEN** consulta a listagem de ordens de serviço
- **THEN** visualiza todas as ordens de todos os fiscais vinculados a essa unidade e subunidades, sem acesso a ordens de outras secretarias

#### Scenario: Chefia distribui demanda entre fiscais
- **GIVEN** um usuário com role `vistoria.chefia` e permissão `vistoria.ordens.manage`
- **WHEN** reatribui uma ordem de serviço de um fiscal para outro
- **THEN** a reatribuição é permitida, registrada em auditoria, e ambos os fiscais (anterior e novo) são notificados

---

### Requirement: Trilha de auditoria
<!-- entities: AuditoriaLog -->

O sistema SHALL registrar log de toda vistoria realizada, documento emitido, assinatura coletada e alteração de status do processo decorrente, com identificação do fiscal responsável, data, hora e coordenadas geográficas, disponibilizado para fins de auditoria interna e externa.

Toda mutação SHALL ser registrada via `AuditLogger` na tabela `audit_logs`, em conformidade com o padrão do SYSGOV.

#### Scenario: Registro de auditoria na lavratura de auto de infração
- **GIVEN** um fiscal que lavra um auto de infração
- **WHEN** o documento é persistido com sucesso
- **THEN** um registro é inserido em `audit_logs` com `event = 'vistoria.auto_infracao.emitido'`, `user_id`, `tenant_id`, coordenadas geográficas e metadados do documento

#### Scenario: Registro de auditoria na alteração de status do processo sancionatório
- **GIVEN** um processo sancionatório que avança de `'em_defesa'` para `'em_julgamento'`
- **WHEN** a transição ocorre
- **THEN** um registro é inserido em `audit_logs` com `event = 'vistoria.processo.status_alterado'`, estado anterior e novo estado

#### Scenario: Consulta de trilha de auditoria por auditor
- **GIVEN** um usuário com perfil de auditor interno
- **WHEN** consulta a trilha de auditoria de uma vistoria específica
- **THEN** visualiza todos os eventos (vistoria, documentos, assinatura, processo) ordenados cronologicamente, com fiscal, data/hora e coordenadas

---

### Requirement: Conformidade legal, criptografia e APIs de integração
<!-- entities: CriptografiaLgpd, IntegracaoApiAberta -->

O sistema SHALL estar em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) quanto ao tratamento de dados pessoais do autuado e de eventuais testemunhas, com criptografia de dados em trânsito e em repouso, inclusive durante o período de operação offline do aplicativo móvel, e SHALL disponibilizar interfaces de programação de aplicações (APIs) abertas e documentadas para eventual integração com sistemas de vigilância sanitária ou agropecuária de âmbito estadual ou federal.

#### Scenario: Dados pessoais criptografados em repouso, inclusive offline
- **GIVEN** uma vistoria preenchida offline com dados pessoais do autuado armazenados temporariamente no dispositivo (IndexedDB)
- **WHEN** os dados ainda não foram sincronizados
- **THEN** o armazenamento local está criptografado com chave derivada da sessão autenticada, e os dados em trânsito na sincronização usam TLS 1.3

#### Scenario: API documentada para integração estadual/federal
- **GIVEN** um sistema estadual de vigilância agropecuária autorizado
- **WHEN** consome o endpoint `GET /api/vistoria/autuacoes` com credenciais M2M válidas
- **THEN** recebe os dados no formato documentado (OpenAPI/Swagger), com a tentativa de integração registrada na trilha de auditoria

#### Scenario: Acesso de sistema externo não autorizado
- **WHEN** uma requisição M2M é feita sem credencial válida a qualquer endpoint de `/api/vistoria/*`
- **THEN** o sistema responde HTTP 401 e registra a tentativa
