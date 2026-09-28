# Proposal

## Why

A aba **Sucessão Hereditária** do módulo Cemitérios (SIGCM) possui apenas um fluxo raso: cadastro de herdeiros e indicação de titular, sem máquina de estados do processo sucessório, sem distinção das vias de sucessão (inventário judicial, extrajudicial, alvará judicial, arrolamento), sem validação de cadeia sucessória e ordem de prioridade, sem vínculo automático com a concessão (transição para "Sucedida"), sem trilha de auditoria append-only e sem notificações de prazos de regularização. Municípios como Araucária/PR exigem regras parametrizáveis (ordem de prioridade, prazos, documentos por via) que hoje não existem. Esta mudança evolui a funcionalidade para cobrir o fluxo jurídico completo de sucessão causa mortis da titularidade de jazigo, em conformidade com a jurisprudência e boas práticas de administração cemiterial.

## What Changes

- **Nova máquina de estados do processo sucessório** (Solicitada → Em_analise → Aguardando_documentos → Validada → Sucedida / Indeferida / Arquivada) com histórico append-only (`sucessao_historico`)
- **Fluxos por via de sucessão**: inventário judicial, inventário extrajudicial (escritura pública), alvará judicial, arrolamento — cada um com documentos exigidos parametrizáveis
- **Registro completo de herdeiros**: grau de parentesco, ordem, direito de representação (herdeiro pré-morto), titular_indicado único, validação de ordem de prioridade parametrizável (companheiro, filhos, pais)
- **Documentos digitalizados com hash**: certidão de óbito, inventário, formal de partilha, escritura pública, alvará judicial, procuração — armazenamento em Object Storage, acesso restrito (LGPD)
- **Vínculo com a concessão**: transição automática da concessão para estado "Sucedida" ao concluir a sucessão; registro de regularização de uso (inclusão de titular / transferência)
- **Trilha de auditoria completa**: toda transição de estado, adição de herdeiro, upload de documento, parecer — grava em `sucessao_historico` e `audit_logs`
- **Notificações e prazos parametrizáveis**: prazo de regularização após falecimento (ex.: 120 dias), alertas de vencimento
- **Contratos de API novos/expandidos**: GET/POST/PUT sucessões, transições de estado, herdeiros, documentos, histórico, dashboards de pendentes e regularização
- **Migrações de banco** com `tenant_id`, índices compostos, `TenantAware`, `SoftDeletes`
- **Políticas RBAC**: `cemiterios.sucessao.manage`, `cemiterios.sucessao.view`, `cemiterios.sucessao.transition`
- **Frontend**: evolução da `SucessaoView.tsx` com wizard por via, validações, upload, timeline de histórico, badges de estado

## Capabilities

### New Capabilities

- `cemiterio/sucessao-hereditaria`: Máquina de estados completa do processo sucessório hereditário, registro de herdeiros com ordem e representação, documentos por via de sucessão, vínculo com concessão, auditoria append-only, notificações de prazos — tudo parametrizável por tenant

### Modified Capabilities

- `cemiterio/regras-concessao-sucessao`: Requisitos atuais cobrem apenas bloqueio de sepultamento de terceiros quando titular falecido e vinculação de processo administrativo. Serão **expandidos** para cobrir o fluxo sucessório completo (estados, transições, herdeiros, documentos, prazos, regularização), transformando a regra pontual em um processo gerenciado end-to-end

## Impact

### Backend (apps/api - Módulo Cemiterio)
- **Novas migrations**: `sucessoes` (evolução), `sucessao_herdeiros`, `sucessao_documentos`, `sucessao_historico` — todas com `tenant_id`, `TenantAware`, `SoftDeletes`
- **Models**: `Sucessao`, `SucessaoHerdeiro`, `SucessaoDocumento`, `SucessaoHistorico` com `Money` para valores, `OutboxPublisher` para eventos externos
- **Services**: `SucessaoService` (máquina de estados, validações, transições), `CadeiaSucessoriaService` (ordem prioridade, representação), `DocumentoSucessaoService` (upload, hash, LGPD)
- **Controllers**: `SucessaoController` (endpoints REST), `SucessaoTransicaoController`, `SucessaoHerdeiroController`, `SucessaoDocumentoController`
- **Policies**: `SucessaoPolicy` com permissões granulares
- **Form Requests**: validação de entrada para cada endpoint
- **Events/Listeners**: `SucessaoTransicionada`, `SucessaoConcluida`, `PrazoRegularizacaoProximo` → Outbox
- **Jobs**: `NotificarPrazoRegularizacaoJob`, `ProcessarSucessaoConcluidaJob`
- **Configuração tenant**: `sucessao_config` (ordem prioridade, prazos, docs por via, representação habilitada, base legal)

### Frontend (apps/web-client - módulo cemiterios)
- **SucessaoView.tsx** evoluída: wizard por via de sucessão, formulário de herdeiros com validação de ordem/representação, upload de documentos com preview, timeline de histórico (`sucessao_historico`), badges de estado, ações de transição protegidas por RBAC
- **Componentes reutilizáveis** de `@sysgov/ui`: `Modal`, `Button`, `Badge`, `KpiCard`, `DataTable`, `Stepper`, `FileUpload`, `Timeline`
- **SDK** (`@sysgov/sdk`): tipos TypeScript para `Sucessao`, `SucessaoHerdeiro`, `SucessaoDocumento`, `SucessaoHistorico`, enums de `ViaSucessao`, `EstadoSucessao`, `Parentesco`

### Banco de Dados
- 4 novas tabelas com índices compostos iniciando por `tenant_id`
- FK para `concessoes`, `parks`, `plots`, `users`
- Coluna `lock_version` para concorrência otimista em `sucessoes`

### Integrações/Externas (via Outbox)
- Notificações (e-mail, WhatsApp, push) para prazos de regularização
- Eventos para portal do concessionário (futuro)
- Eventos para integração com cartórios/registro civil (futuro)

### Documentação/Compliance
- LGPD: documentos com hash, acesso restrito, retenção parametrizável
- Auditoria completa em `audit_logs` (tenant_id, user_id, module, action, resource, before/after, IP, UA)
- Base legal parametrizável: `[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]`

### Perguntas Abertas (para validação com stakeholder)
1. Qual a lei/decreto municipal de Araucária/PR que regula a sucessão de jazigos? (ordem de prioridade, prazos, documentos exigidos por via)
2. A sucessão será feita exclusivamente pelo gestor no `web-client` ou também pelo concessionário no portal público?
3. Haverá integração com cartórios/registro civil para validação automática de certidões?
4. Qual o prazo padrão de regularização após falecimento? (ex.: 120, 180 dias?)
5. A ordem de prioridade (companheiro, filhos, pais) é fixa ou configurável por tenant?