# Spec Delta

## Purpose

Define o comportamento completo do processo sucessório hereditário de titularidade de jazigo, incluindo máquina de estados, registro de herdeiros com ordem e representação, documentos por via de sucessão, vínculo com concessão, auditoria append-only e notificações de prazos — tudo parametrizável por tenant.

## ADDED Requirements

### Requirement: Abertura de processo sucessório vinculado a concessão e titular falecido

O sistema SHALL permitir abrir um processo de sucessão hereditária vinculado a uma concessão ativa e ao titular falecido, registrando a via de sucessão escolhida e o requerente.

#### Scenario: Abrir sucessão por inventário extrajudicial
- **WHEN** um usuário com permissão `cemiterios.sucessao.manage` abre um processo com via `inventario_extrajudicial` para uma concessão ativa
- **THEN** o processo nasce no estado `Solicitada`
- **THEN** a concessão fica vinculada ao processo sucessório
- **THEN** o requerente é registrado como autor da solicitação

#### Scenario: Abrir sucessão por inventário judicial
- **WHEN** um usuário com permissão `cemiterios.sucessao.manage` abre um processo com via `inventario_judicial` para uma concessão ativa
- **THEN** o processo nasce no estado `Solicitada`
- **THEN** o número do processo judicial é registrado em `processo_referencia`

#### Scenario: Abrir sucessão por alvará judicial
- **WHEN** um usuário com permissão `cemiterios.sucessao.manage` abre um processo com via `alvara_judicial` para uma concessão ativa
- **THEN** o processo nasce no estado `Solicitada`
- **THEN** o número do alvará é registrado em `processo_referencia`

#### Scenario: Abrir sucessão por arrolamento
- **WHEN** um usuário com permissão `cemiterios.sucessao.manage` abre um processo com via `arrolamento` para uma concessão ativa
- **THEN** o processo nasce no estado `Solicitada`
- **THEN** o número do processo de arrolamento é registrado em `processo_referencia`

#### Scenario: Impedir abertura duplicada para mesma concessão
- **WHEN** já existe um processo sucessório em andamento (estado diferente de `Sucedida`, `Indeferida`, `Arquivada`) para a concessão
- **THEN** o sistema impede a abertura de novo processo com erro de regra de negócio

### Requirement: Máquina de estados do processo sucessório com histórico append-only

O sistema SHALL manter o processo sucessório em uma máquina de estados (`Solicitada`, `Em_analise`, `Aguardando_documentos`, `Validada`, `Sucedida`, `Indeferida`, `Arquivada`) e gravar toda transição em histórico append-only (`sucessao_historico`) com usuário, motivo e timestamp.

#### Scenario: Transição Solicitada → Em_analise
- **WHEN** o analista inicia a análise do processo
- **THEN** o estado transita para `Em_analise`
- **THEN** é registrado evento em `sucessao_historico` com `de_estado = Solicitada`, `para_estado = Em_analise`, `usuario_id` e `motivo`

#### Scenario: Transição Em_analise → Aguardando_documentos
- **WHEN** o analista identifica documentos faltantes da via escolhida
- **THEN** o estado transita para `Aguardando_documentos`
- **THEN** é registrado evento em `sucessao_historico` listando documentos pendentes no `motivo`

#### Scenario: Transição Aguardando_documentos → Em_analise
- **WHEN** os documentos solicitados são recebidos e anexados
- **THEN** o estado transita para `Em_analise`
- **THEN** é registrado evento em `sucessao_historico`

#### Scenario: Transição Em_analise → Validada
- **WHEN** a cadeia sucessória e documentos são conferidos e aprovados
- **THEN** o estado transita para `Validada`
- **THEN** é registrado evento em `sucessao_historico` com parecer favorável no `motivo`

#### Scenario: Transição Validada → Sucedida
- **WHEN** o analista confirma a sucessão e indica o novo titular
- **THEN** o estado transita para `Sucedida`
- **THEN** a concessão vinculada transita para estado `Sucedida`
- **THEN** o titular indicado assume a titularidade da concessão
- **THEN** é registrado evento em `sucessao_historico` e em `audit_logs` da concessão

#### Scenario: Transição Em_analise/Validada → Indeferida
- **WHEN** o analista indefere o processo com motivo e parecer
- **THEN** o estado transita para `Indeferida`
- **THEN** é registrado evento em `sucessao_historico` com motivo e parecer no campo `motivo`

#### Scenario: Transição Indeferida/Aguardando_documentos → Arquivada
- **WHEN** decorrido prazo configurado sem recurso ou manifestação
- **THEN** o estado transita para `Arquivada`
- **THEN** é registrado evento em `sucessao_historico`

#### Scenario: Concorrência otimista em transições
- **WHEN** duas transições concorrem para o mesmo processo
- **THEN** o sistema valida `lock_version` e rejeita a segunda com erro de concorrência

### Requirement: Registro de herdeiros com grau de parentesco, ordem, direito de representação e titular indicado

O sistema SHALL registrar herdeiros com grau de parentesco, ordem de prioridade, direito de representação (herdeiro pré-morto) e titular indicado único, validando a ordem de prioridade parametrizável por tenant.

#### Scenario: Registrar herdeiros com ordem e parentesco
- **WHEN** o usuário cadastra herdeiros informando nome, parentesco, documento, ordem
- **THEN** o sistema valida que a ordem segue a prioridade configurada (ex.: companheiro=1, filhos=2, pais=3)
- **THEN** cada herdeiro é persistido em `sucessao_herdeiros` com `parentesco`, `ordem`, `direito_representacao`

#### Scenario: Indicar titular único
- **WHEN** os herdeiros são registrados e exatamente um é marcado como `titular_indicado = true`
- **THEN** o sistema aceita a indicação
- **THEN** esse herdeiro será o novo titular ao concluir a sucessão

#### Scenario: Impedir múltiplos titulares indicados
- **WHEN** o usuário tenta marcar mais de um herdeiro como `titular_indicado`
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Direito de representação (herdeiro pré-morto)
- **WHEN** a configuração do tenant habilita `direito_representacao` e um herdeiro falecido deixa descendentes
- **THEN** o sistema permite cadastrar os representados com `direito_representacao = true` e `parentesco` refletindo a representação
- **THEN** a ordem de prioridade dos representados segue a regra do herdeiro representado

#### Scenario: Validação de ordem de prioridade parametrizável
- **WHEN** o tenant configura ordem de prioridade diferente do padrão (ex.: filhos antes de companheiro)
- **THEN** o sistema valida os herdeiros contra a configuração do tenant, não contra constante fixa

### Requirement: Documentos por via de sucessão com hash e armazenamento seguro

O sistema SHALL exigir e armazenar os documentos da via de sucessão escolhida (certidão de óbito, inventário, formal de partilha, escritura pública, alvará judicial, procuração), com hash de integridade e acesso restrito (LGPD).

#### Scenario: Upload de certidão de óbito (obrigatória para todas as vias)
- **WHEN** o usuário faz upload de certidão de óbito
- **THEN** o arquivo é armazenado no Object Storage com caminho `tenant/{tenant_id}/sucessao/{sucessao_id}/certidao_obito/{uuid}.pdf`
- **THEN** o hash SHA-256 é calculado e salvo em `sucessao_documentos.hash`
- **THEN** o registro em `sucessao_documentos` tem `tipo = certidao_obito`

#### Scenario: Documentos por inventário judicial
- **WHEN** a via é `inventario_judicial`
- **THEN** o sistema exige: certidão de óbito, inventário (inicial/decisão), formal de partilha, alvará de levantamento

#### Scenario: Documentos por inventário extrajudicial
- **WHEN** a via é `inventario_extrajudicial`
- **THEN** o sistema exige: certidão de óbito, escritura pública de inventário e partilha

#### Scenario: Documentos por alvará judicial
- **WHEN** a via é `alvara_judicial`
- **THEN** o sistema exige: certidão de óbito, alvará judicial indicando o sucessor

#### Scenario: Documentos por arrolamento
- **WHEN** a via é `arrolamento`
- **THEN** o sistema exige: certidão de óbito, termo de arrolamento, alvará judicial

#### Scenario: Acesso restrito a documentos (LGPD)
- **WHEN** um usuário sem permissão `cemiterios.sucessao.view` tenta acessar documento
- **THEN** o sistema retorna 403 Forbidden
- **THEN** o download de documento requer permissão e registra acesso em `audit_logs`

#### Scenario: Validação de integridade via hash
- **WHEN** o sistema verifica documento armazenado
- **THEN** recalcula hash e compara com `sucessao_documentos.hash`
- **THEN** divergência gera alerta de integridade em `audit_logs`

### Requirement: Vínculo com concessão e regularização de uso

O sistema SHALL, ao concluir a sucessão (estado `Sucedida`), transitar a concessão para `Sucedida` e registrar a regularização de uso (inclusão de titular / transferência).

#### Scenario: Sucessão conclui e concessão transita para Sucedida
- **WHEN** o processo sucessório transita para `Sucedida`
- **THEN** a concessão vinculada tem seu estado alterado para `Sucedida`
- **THEN** o `titular_indicado` torna-se o novo concessionário titular
- **THEN** é registrado em `audit_logs` a mudança de titularidade da concessão

#### Scenario: Regularização de uso — inclusão de titular
- **WHEN** a sucessão é concluída e há herdeiros além do titular indicado
- **THEN** o sistema registra a inclusão dos demais herdeiros como usuários autorizados da concessão
- **THEN** a concessão mantém registro de todos os sucessores

#### Scenario: Regularização de uso — transferência
- **WHEN** a sucessão envolve transferência de direitos hereditários (art. 1.793 CC)
- **THEN** o sistema registra a cessão de direitos com documento comprobatório
- **THEN** o novo cessionário assume a posição do cedente na sucessão

### Requirement: Trilha de auditoria completa do processo sucessório

O sistema SHALL manter trilha de auditoria append-only de todo o processo sucessório (transições, herdeiros, documentos, pareceres) em `sucessao_historico` e `audit_logs`.

#### Scenario: Auditoria de transição de estado
- **WHEN** ocorre qualquer transição de estado
- **THEN** é gravado em `sucessao_historico`: `sucessao_id`, `de_estado`, `para_estado`, `motivo`, `usuario_id`, `created_at`
- **THEN** é gravado em `audit_logs`: `module = cemiterios`, `action = sucessao.transition`, `resource = sucessao:{id}`, `before/after` com estados

#### Scenario: Auditoria de herdeiros
- **WHEN** herdeiros são adicionados, atualizados ou removidos
- **THEN** é gravado em `audit_logs`: `action = sucessao.herdeiros.upsert`, `before/after` com lista completa

#### Scenario: Auditoria de documentos
- **WHEN** documento é feito upload ou removido
- **THEN** é gravado em `audit_logs`: `action = sucessao.documentos.upload|delete`, `resource = sucessao_documento:{id}`, `after` com hash e tipo

#### Scenario: Auditoria de parecer
- **WHEN** analista registra parecer no processo
- **THEN** é gravado em `sucessao_historico` com `motivo` contendo o parecer
- **THEN** é gravado em `audit_logs`: `action = sucessao.parecer`

### Requirement: Notificações e prazos de regularização parametrizáveis

O sistema SHALL notificar sobre prazos de regularização após o falecimento do titular, com prazos parametrizáveis por tenant.

#### Scenario: Notificação de prazo próximo do vencimento
- **WHEN** a `data_falecimento` + `prazo_regularizacao_dias` (config tenant) - 30 dias = data atual
- **THEN** o sistema dispara notificação (e-mail, notificação in-app) para gestores do cemitério
- **THEN** a notificação cita o processo sucessório, jazigo, concessionário falecido e dias restantes

#### Scenario: Notificação de prazo vencido
- **WHEN** a `data_falecimento` + `prazo_regularizacao_dias` < data atual e processo não está em `Sucedida`
- **THEN** o sistema dispara notificação de urgência
- **THEN** o processo é sinalizado no dashboard de pendentes

#### Scenario: Configuração de prazo por tenant
- **WHEN** o tenant configura `prazo_regularizacao_dias = 120` (ou outro valor)
- **THEN** todas as notificações e cálculos usam esse valor, nunca constante fixa

#### Scenario: Configuração de documentos exigidos por via
- **WHEN** o tenant configura documentos obrigatórios para cada via
- **THEN** a validação de `Aguardando_documentos` usa a configuração do tenant

#### Scenario: Configuração de ordem de prioridade
- **WHEN** o tenant configura `ordem_prioridade = [companheiro, filhos, pais]` (ou variação)
- **THEN** a validação de herdeiros usa essa ordem

### Requirement: Consultas e dashboards de processos sucessórios

O sistema SHALL disponibilizar endpoints para listagem, filtros e dashboards de processos sucessórios.

#### Scenario: Listar processos com filtros
- **WHEN** usuário com `cemiterios.sucessao.view` acessa `GET /sucessoes`
- **THEN** retorna lista paginada com filtros: `estado`, `via`, `park_id`, `concession_id`, `data_falecimento_inicio/fim`

#### Scenario: Dashboard de processos pendentes
- **WHEN** usuário acessa `GET /sucessoes/pendentes`
- **THEN** retorna contagem por estado: `Em_analise`, `Aguardando_documentos`, `Validada`
- **THEN** lista processos com dias em cada estado

#### Scenario: Dashboard de regularização
- **WHEN** usuário acessa `GET /sucessoes/regularizacao`
- **THEN** retorna processos que precisam de regularização de uso (sucessão, inclusão, transferência)
- **THEN** inclui dias desde falecimento e status do prazo

#### Scenario: Detalhe de processo com histórico
- **WHEN** usuário acessa `GET /sucessoes/{id}`
- **THEN** retorna processo completo com herdeiros, documentos, histórico (`sucessao_historico`)

#### Scenario: Histórico append-only
- **WHEN** usuário acessa `GET /sucessoes/{id}/historico`
- **THEN** retorna lista cronológica imutável de todas as transições e eventos

## MODIFIED Requirements

### Requirement: Bloqueio de sepultamento de terceiros em jazigo com titular falecido sem sucessão

O sistema SHALL bloquear a realização de novos sepultamentos (inumações) de terceiros em jazigos concedidos cujo titular concessionário esteja registrado com óbito (`titular_falecido`), exigindo a comprovação de regularização de sucessão hereditária através de processo administrativo municipal ou alvará judicial.

#### Scenario: Impedir sepultamento de terceiro sem sucessão regularizada
- **WHEN** um operador tenta cadastrar uma nova inumação de pessoa não autorizada em jazigo cujo concessionário titular possui flag de falecido sem partilha/sucessão formalizada (processo não está em `Sucedida`)
- **THEN** o sistema impede a confirmação do sepultamento com erro de regra de negócio indicando que a concessão possui sucessão hereditária pendente
- **THEN** a mensagem de erro referencia o processo sucessório pendente (ID e estado atual)

#### Scenario: Permitir sepultamento do próprio titular falecido
- **WHEN** o sepultamento sendo realizado for do próprio titular concessionário da concessão
- **THEN** o sistema autoriza a inumação na gaveta livre do jazigo
- **THEN** registra o status de titular falecido para futuras movimentações
- **THEN** dispara automaticamente a sugestão de abertura de processo sucessório se não houver nenhum em andamento

### Requirement: Vinculação obrigatória de processo administrativo municipal à concessão

O sistema SHALL vincular obrigatoriamente a toda concessão cemiterial o número do Processo Administrativo Municipal correspondente, distinguindo concessões de tipo comum/temporário (terra com prazo de vigência determinado) de concessões perpétuas (gaveta/concreto com direito perpétuo de aforamento).

#### Scenario: Nova concessão requer processo administrativo
- **WHEN** uma nova concessão é emitida pelo operador
- **THEN** o sistema armazena e valida o número do processo administrativo municipal
- **THEN** define o prazo de validade conforme a modalidade temporária ou perpétua

#### Scenario: Renovação de concessão temporária
- **WHEN** uma concessão temporária é renovada ou revalidada
- **THEN** o sistema registra o novo processo administrativo de renovação
- **THEN** atualiza a data limite de vigência da concessão

#### Scenario: Concessão sucedida mantém rastreabilidade do processo original
- **WHEN** a concessão transita para `Sucedida` via processo sucessório
- **THEN** o processo administrativo original permanece vinculado
- **THEN** o novo titular herda o vínculo com o processo administrativo originário