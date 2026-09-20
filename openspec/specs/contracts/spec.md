# Spec: contracts

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Contracts (Services/{ContractLifecycleService,SupportTicketService}, Http/Controllers/{ContractController,SupportTicketController}, Http/Requests/{StoreContractRequest,UpdateContractRequest}, Models/{Contract,ContractAddendum,ContractAttachment,ContractHistory,SupportTicket,TicketMessage}, Policies/ContractPolicy, Providers/ContractsServiceProvider, Routes/api.php, Database/Migrations/*, Tests/Feature/{ContractLifecycleTest,TenantIsolationTest}, module.json), apps/api/database/migrations/2026_08_31_120000_add_org_unit_id_to_contracts_and_expenses_table.php, apps/web-client/src/modules/contracts/ContractsModule.tsx
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: ciclo de vida de contratos administrativos do órgão público — cadastro, aditamento com
teto legal da Lei 14.133/2021, transição de status, histórico append-only, KPIs de carteira e
vencimento — mais o helpdesk (tickets de suporte com SLA por prioridade) que compartilha o mesmo
módulo. Cobre escopo de dados por unidade organizacional (secretaria), isolamento multi-tenant,
auditoria encadeada e publicação assíncrona de eventos via Outbox.

---

### Requirement: Cadastro de contrato exige número, vigência coerente e valor em centavos
<!-- id: ContractController.store -->
<!-- entities: Contract, OrgUnit, User -->
<!-- triggers: Aditivos não podem ultrapassar o teto legal do contrato -->
<!-- enforced: ContractController.store() -->

A criação de contrato SHALL exigir `number`, `title`, `starts_at`, `ends_at` e `amount_cents`.
A data final SHALL ser igual ou posterior à inicial (`after_or_equal:starts_at`) e o valor SHALL
ser inteiro não negativo em centavos. `manager_id`, `inspector_id` e `org_unit_id` SHALL existir
nas respectivas tabelas quando informados, e `max_addenda_percent` SHALL estar entre 0 e 100
(padrão 25,00 pela migration). Criado o registro, `ContractLifecycleService.createContract()`
SHALL gravar auditoria `contract.created` e publicar `contracts.ContractCreated` no Outbox,
respondendo HTTP 201 com o contrato.

#### Scenario: contrato válido criado
<!-- test: ContractLifecycleTest.test_contract_addenda_cannot_exceed_legal_limit_of_25_percent() -->
- **WHEN** `createContract()` recebe número, título, vigência e `amount_cents = 10000000`
- **THEN** o contrato é persistido com `tenant_id` do contexto, auditoria `contract.created` é gravada e o evento `contracts.ContractCreated` fica pendente em `outbox_events`

#### Scenario: data final anterior à inicial
- **WHEN** `store()` recebe `ends_at` anterior a `starts_at`
- **THEN** responde HTTP 422 e nada é persistido

#### Scenario: valor negativo
- **WHEN** `store()` recebe `amount_cents` negativo ou não inteiro
- **THEN** responde HTTP 422 (`integer`, `min:0`)

#### Scenario: número duplicado no mesmo tenant
- **WHEN** já existe contrato com o mesmo `number` no tenant
- **THEN** a constraint `unique(tenant_id, number)` rejeita a inserção

#### Scenario: usuário sem escopo global omite a unidade organizacional
- **WHEN** `store()` é chamado por usuário que não é `is_platform_admin`, analista de suporte nem `admin_tenant`, sem `org_unit_id` e com escopo irrestrito no módulo
- **THEN** `resolveOrgUnitId()` atribui a primeira `OrgUnitUser` vinculada ao usuário no tenant

#### Scenario: unidade organizacional fora do escopo do usuário
- **WHEN** o `org_unit_id` informado não está em `allowedOrgUnitIds(user, 'contracts', tenant)`
- **THEN** aborta com HTTP 403 "Org unit não autorizada."

---

### Requirement: Aditivos não podem ultrapassar o teto legal do contrato
<!-- id: ContractLifecycleService.addAddendum -->
<!-- entities: Contract, ContractAddendum, ContractHistory -->
<!-- depends_on: Cadastro de contrato exige número, vigência coerente e valor em centavos -->
<!-- enforced: ContractLifecycleService.addAddendum() -->

O acréscimo acumulado de aditivos SHALL ser limitado a `max_addenda_percent` do valor original
do contrato (teto legal da Lei 14.133/2021, padrão 25%). O limite é avaliado sobre a soma
`total_addenda_amount_cents + amount_cents` do novo aditivo contra
`max_allowed_addenda_cents = round(amount_cents × max_addenda_percent / 100)`. Aprovado, o
aditivo SHALL ser criado, `total_addenda_amount_cents` atualizado, um `ContractHistory` de ação
`addendum_created` gravado com estado anterior/posterior, auditoria `contract.addendum_added`
registrada e `contracts.ContractAddendumAdded` publicado no Outbox com o novo total efetivo.

#### Scenario: aditivo dentro do teto
<!-- test: ContractLifecycleTest.test_contract_addenda_cannot_exceed_legal_limit_of_25_percent() -->
- **WHEN** um contrato de 10.000.000 centavos com teto 25% recebe aditivo de 2.000.000 centavos (20%)
- **THEN** `total_addenda_amount_cents` passa a 2.000.000 e `effective_total_cents` a 12.000.000

#### Scenario: aditivo que estoura o teto acumulado
<!-- test: ContractLifecycleTest.test_contract_addenda_cannot_exceed_legal_limit_of_25_percent() -->
- **WHEN** um segundo aditivo de 1.000.000 centavos levaria o acumulado a 30% (acima dos 25%)
- **THEN** lança `ValidationException` na chave `amount_cents` citando o valor do aditivo, o percentual máximo e o teto em reais; nem o aditivo nem o total do contrato são gravados

#### Scenario: aditivo de valor zero ou negativo
- **WHEN** `addAddendum()` recebe `amount_cents <= 0` (aditivo de prazo/supressão)
- **THEN** a verificação de teto é ignorada (`$requestedAmountCents > 0`) e o aditivo é criado normalmente

#### Scenario: número de aditivo repetido no mesmo contrato
- **WHEN** já existe aditivo com o mesmo `number` para o par (tenant, contrato)
- **THEN** a constraint `unique(tenant_id, contract_id, number)` rejeita a inserção

#### Scenario: aditivo em contrato fora do escopo do usuário
- **WHEN** `ContractController.addAddendum()` é chamado por usuário não-admin cujo `allowedOrgUnitIds` não contém o `org_unit_id` do contrato
- **THEN** aborta com HTTP 403 antes de qualquer validação de valor

---

### Requirement: Transição de status é restrita ao conjunto canônico e sempre historiada
<!-- id: ContractController.changeStatus -->
<!-- entities: Contract, ContractHistory -->
<!-- depends_on: Cadastro de contrato exige número, vigência coerente e valor em centavos -->
<!-- enforced: ContractController.changeStatus() -->

A mudança de status SHALL aceitar exclusivamente `draft`, `active`, `in_renewal`, `suspended`,
`ended` ou `cancelled`, com `reason` opcional gravado em `cancellation_reason`. Toda transição
SHALL produzir um `ContractHistory` de ação `status_changed_to_{novo}` com os estados anterior e
posterior, auditoria `contract.status_{novo}` e publicação de `contracts.ContractStatusChanged`
no Outbox contendo status antigo e novo.

#### Scenario: status fora da lista
- **WHEN** `changeStatus()` recebe status diferente dos seis valores permitidos
- **THEN** responde HTTP 422 (`in:draft,active,in_renewal,suspended,ended,cancelled`) e nada muda

#### Scenario: cancelamento com motivo
- **WHEN** `changeStatus()` recebe `status = cancelled` e `reason` preenchido
- **THEN** grava `cancellation_reason`, o histórico `status_changed_to_cancelled` e o evento Outbox com `old_status` e `new_status`

#### Scenario: transição sem motivo apaga o motivo anterior
- **WHEN** `changeStatus()` é chamado sem `reason`
- **THEN** `cancellation_reason` é sobrescrito com `null`, pois o service grava `$reason` incondicionalmente

---

### Requirement: Edição de contrato não altera valor, número nem status
<!-- id: ContractController.update -->
<!-- entities: Contract, OrgUnit -->
<!-- enforced: ContractController.update() -->

A edição SHALL aceitar apenas `org_unit_id`, `title`, `supplier_name`, `supplier_cnpj`,
`manager_id`, `inspector_id`, `starts_at`, `ends_at` e `renewal_rule`. `number`, `amount_cents`,
`total_addenda_amount_cents`, `max_addenda_percent` e `status` NÃO são editáveis por esta rota —
valor só muda por aditivo e status só muda pela rota de transição. A reatribuição de
`org_unit_id` SHALL ser revalidada contra o escopo do usuário.

#### Scenario: tentativa de alterar o valor pela edição
- **WHEN** `update()` recebe `amount_cents` no corpo
- **THEN** o campo é descartado pela validação e `amount_cents` permanece inalterado

#### Scenario: edição de contrato de outra secretaria
- **WHEN** o `org_unit_id` do contrato não está em `allowedOrgUnitIds` do usuário não-admin
- **THEN** aborta com HTTP 403

#### Scenario: transferência do contrato para outra unidade
- **WHEN** `update()` recebe `org_unit_id` pertencente ao escopo do usuário
- **THEN** o contrato é reassociado à nova unidade

---

### Requirement: Listagem e detalhe são escopados por unidade organizacional
<!-- id: ContractController.index -->
<!-- entities: Contract, OrgUnit, User -->
<!-- enforced: ContractController.index() -->

A leitura de contratos SHALL ser restrita, para usuários sem papel global
(`is_platform_admin`, analista de suporte ou `admin_tenant` no tenant), às unidades
organizacionais liberadas em `ModuleAccessService.scopeQuery(query, user, 'contracts', tenant,
'org_unit_id')`, que expande hierarquicamente secretaria → departamentos. A listagem SHALL
suportar filtros por `status`, `contract_type` e busca textual em número, título, nome e CNPJ do
fornecedor, paginando por `per_page` (padrão 25) e ordenando por `ends_at` decrescente. O detalhe
SHALL retornar o contrato com aditivos, anexos, histórico, gestor, fiscal e unidade, acompanhado
das métricas financeiras derivadas.

#### Scenario: usuário sem acesso a nenhuma unidade
- **WHEN** `allowedOrgUnitIds()` retorna lista vazia
- **THEN** `scopeQuery()` aplica `whereRaw('1 = 0')` e a listagem volta vazia

#### Scenario: detalhe de contrato fora do escopo
- **WHEN** `show()` recebe id de contrato cujo `org_unit_id` não está na lista permitida do usuário não-admin
- **THEN** aborta com HTTP 403

#### Scenario: métricas do detalhe
- **WHEN** `show()` retorna um contrato
- **THEN** o payload inclui `amount_cents`, `total_addenda_cents`, `effective_total_cents`, `max_allowed_addenda_cents` e `addenda_percentage_used` (0 quando `amount_cents` é zero, evitando divisão por zero)

#### Scenario: busca textual
- **WHEN** `index()` recebe `search`
- **THEN** filtra por `LIKE` em `number`, `title`, `supplier_name` ou `supplier_cnpj`, mantendo o escopo de unidade e de tenant

---

### Requirement: KPIs da carteira incluem alerta de vencimento em 30 e 60 dias
<!-- id: ContractController.summaryKPIs -->
<!-- entities: Contract -->
<!-- enforced: ContractController.summaryKPIs() -->

O resumo SHALL retornar total de contratos, contratos `active`, soma de `amount_cents`, soma de
`total_addenda_amount_cents`, o total efetivo (soma das duas) e a contagem de contratos `active`
com `ends_at` entre hoje e +30 dias e entre hoje e +60 dias. Todos os agregados SHALL respeitar
o mesmo escopo de unidade organizacional aplicado à listagem.

#### Scenario: usuário restrito a uma secretaria
- **WHEN** `summaryKPIs()` é chamado por usuário não-admin
- **THEN** todos os agregados consideram apenas contratos das unidades permitidas

#### Scenario: contrato vencendo em 20 dias
- **WHEN** existe contrato `active` com `ends_at` daqui a 20 dias
- **THEN** ele é contado tanto em `expiring_30_days` quanto em `expiring_60_days` (as janelas são cumulativas, ambas iniciando em `now()`)

#### Scenario: contrato vencido ou não ativo
- **WHEN** o contrato tem `ends_at` no passado ou status diferente de `active`
- **THEN** não entra em nenhuma das contagens de vencimento

---

### Requirement: Abertura de ticket gera numeração anual sequencial e prazo de SLA por prioridade
<!-- id: SupportTicketService.openTicket -->
<!-- entities: SupportTicket, TicketMessage, User -->
<!-- triggers: Mensagem do solicitante reabre a análise do ticket -->
<!-- enforced: SupportTicketService.openTicket() -->

A abertura de ticket SHALL gerar `ticket_number` no formato `TICK-{ano}-{sequencial 4 dígitos}`,
contado sobre os tickets do tenant criados no ano corrente. A categoria SHALL pertencer a
`duvida`, `suporte_tecnico` (padrão), `integracao_siconfi`, `white_label`, `reclamacao` ou
`outro`; a prioridade a `baixa`, `media` (padrão), `alta` ou `critica`. O prazo `sla_due_at`
SHALL ser calculado a partir de agora conforme a prioridade: crítica 4h, alta 12h, média 24h,
baixa 48h. O ticket nasce com status `aberto`, registra auditoria `ticket.opened` no módulo
`support` e publica `support.TicketOpened` no Outbox.

#### Scenario: ticket crítico
- **WHEN** `openTicket()` recebe `priority = critica`
- **THEN** `sla_due_at` é `now() + 4h` e o status inicial é `aberto`

#### Scenario: prioridade e categoria omitidas
- **WHEN** o corpo não traz `priority` nem `category`
- **THEN** o ticket assume `media` (SLA 24h) e `suporte_tecnico`

#### Scenario: mensagem inicial informada
- **WHEN** `initial_message` é preenchido
- **THEN** uma `TicketMessage` do solicitante é criada junto com o ticket, com os anexos informados

#### Scenario: segundo ticket do ano no tenant
- **WHEN** já existe 1 ticket do tenant criado no ano corrente
- **THEN** o novo recebe `TICK-{ano}-0002`

#### Scenario: categoria fora da lista
- **WHEN** `SupportTicketController.store()` recebe categoria ou prioridade fora do enum
- **THEN** responde HTTP 422 e nada é persistido

---

### Requirement: Mensagem do solicitante reabre a análise do ticket
<!-- id: SupportTicketService.addMessage -->
<!-- entities: SupportTicket, TicketMessage -->
<!-- depends_on: Abertura de ticket gera numeração anual sequencial e prazo de SLA por prioridade -->
<!-- enforced: SupportTicketService.addMessage() -->

Toda mensagem SHALL registrar autor, texto, marcação de nota interna e anexos opcionais, e SHALL
publicar `support.TicketMessageAdded` no Outbox. Uma mensagem NÃO interna em ticket com status
`aguardando_cliente` SHALL transicionar o ticket para `em_analise`. Notas internas
(`is_internal_note = true`) NÃO alteram o status.

#### Scenario: resposta do cliente em ticket aguardando
- **WHEN** `addMessage()` recebe mensagem não interna e o ticket está em `aguardando_cliente`
- **THEN** o status passa a `em_analise` e o evento Outbox é publicado com `is_internal = false`

#### Scenario: nota interna do atendente
- **WHEN** `addMessage()` recebe `is_internal_note = true`
- **THEN** a mensagem é gravada, o status permanece inalterado e o evento carrega `is_internal = true`

#### Scenario: mensagem em ticket já resolvido
- **WHEN** o ticket está em `resolvido` ou `fechado`
- **THEN** a mensagem é aceita e gravada — não há bloqueio por status no código

---

### Requirement: Resolução de ticket carimba data e notifica assincronamente
<!-- id: SupportTicketService.resolveTicket -->
<!-- entities: SupportTicket -->
<!-- depends_on: Abertura de ticket gera numeração anual sequencial e prazo de SLA por prioridade -->
<!-- enforced: SupportTicketService.resolveTicket() -->

A resolução SHALL mudar o status para `resolvido`, gravar `resolved_at = now()`, registrar
auditoria `ticket.resolved` no módulo `support` e publicar `support.TicketResolved` no Outbox.

#### Scenario: ticket resolvido
- **WHEN** `resolve()` é chamado para um ticket do tenant corrente
- **THEN** status vira `resolvido`, `resolved_at` é preenchido e o evento fica pendente no Outbox

#### Scenario: ticket de outro tenant
- **WHEN** `resolve()` recebe id de ticket de outro tenant
- **THEN** a consulta escopada por `tenant_id` não encontra o registro e responde HTTP 404

#### Scenario: resolução repetida
- **WHEN** `resolve()` é chamado novamente em ticket já `resolvido`
- **THEN** `resolved_at` é sobrescrito com o novo `now()` e um novo evento é publicado — não há guarda de idempotência

---

### Invariant: Todo dado do módulo é isolado por tenant
<!-- entities: Contract, ContractAddendum, ContractAttachment, ContractHistory, SupportTicket, TicketMessage -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationTest.test_contracts_are_scoped_to_the_current_tenant() -->

Os seis modelos do módulo SHALL usar o trait `TenantAware`, que aplica o global scope `tenant`
em toda leitura e preenche `tenant_id` na criação a partir do `TenantContext`, resolvido
server-side pelo middleware `tenant` (`ResolveTenant`) e nunca aceito do cliente. Todas as
tabelas (`contracts`, `contract_addenda`, `contract_attachments`, `contract_history`,
`support_tickets`, `ticket_messages`) SHALL ter `tenant_id` com FK em cascata e índices/unicidades
compostos iniciando por `tenant_id`. Criar registro sem contexto de tenant e sem `tenant_id`
explícito SHALL lançar `LogicException`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Acesso é sempre decidido no servidor, por rota e por objeto
<!-- entities: Contract, User, OrgUnit -->
<!-- enforced: ContractController.isGlobalAdmin() -->
<!-- verified_by: (sem teste automatizado no módulo) -->

Todas as rotas do módulo SHALL passar por `auth:sanctum`, `tenant`, `bindings` e
`module-access:contracts`. Além do gate de rota, cada operação sobre contrato SHALL reconferir a
`org_unit_id` do objeto contra `ModuleAccessService.allowedOrgUnitIds()` antes de ler, editar,
aditar ou mudar status — o filtro de rota não substitui a verificação por objeto (BOLA).
`ContractPolicy` está registrada via `Gate::policy()` e escopa `view`/`update` ao
`tenant_id` do contexto além de exigir as permissões `contracts.view` / `contracts.manage`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Valores financeiros trafegam apenas como centavos inteiros
<!-- entities: Contract, ContractAddendum -->
<!-- enforced: Contract.getEffectiveTotalCentsAttribute() -->

`amount_cents` e `total_addenda_amount_cents` SHALL ser `unsignedBigInteger` no banco, castados
como `integer` no modelo e validados como `integer` na entrada. Nenhum valor monetário é
armazenado ou somado como float: `effective_total_cents` e `max_allowed_addenda_cents` são
derivados por aritmética inteira (com `round()` no teto percentual), e a divisão por 100 aparece
somente na formatação de mensagens de erro e na apresentação do frontend.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Histórico do contrato é append-only
<!-- entities: ContractHistory, Contract -->
<!-- enforced: ContractHistory -->

`ContractHistory` SHALL gravar `before`/`after` em JSON, autor (`user_id`, nulo quando não há
usuário autenticado) e `created_at` com `useCurrent()`. O modelo desativa `timestamps`
(`public $timestamps = false`) e não expõe `updated_at`: registros são apenas acrescentados, nunca
atualizados. Aditamento e transição de status SHALL sempre produzir uma entrada.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Efeitos externos do módulo são sempre assíncronos via Outbox
<!-- entities: Contract, ContractAddendum, SupportTicket, TicketMessage -->
<!-- enforced: App\Support\OutboxPublisher.publish() -->

Nenhum controller ou service do módulo SHALL fazer chamada externa síncrona. Todo efeito externo
é publicado em `outbox_events` com status `pending` e `tenant_id` do contexto —
`contracts.ContractCreated`, `contracts.ContractAddendumAdded`, `contracts.ContractStatusChanged`,
`support.TicketOpened`, `support.TicketMessageAdded`, `support.TicketResolved`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Mutações do ciclo de vida são auditadas com encadeamento de hash
<!-- entities: Contract, ContractAddendum, SupportTicket -->
<!-- enforced: App\Support\AuditLogger.record() -->

Criação de contrato, aditamento, transição de status, abertura e resolução de ticket SHALL gravar
registro em `audit_logs` com módulo (`contracts` ou `support`), ação nomeada
(`contract.created`, `contract.addendum_added`, `contract.status_{novo}`, `ticket.opened`,
`ticket.resolved`), recurso legível, estados anterior/posterior, `tenant_id`, `user_id`, IP,
user-agent, timestamp e hash SHA-256 encadeado ao `prev_hash` do registro anterior.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A UI de contratos usa primitivas do design system e fonte monoespaçada para números
<!-- entities: ContractsModule -->
<!-- enforced: apps/web-client/src/modules/contracts/ContractsModule.tsx -->

A tela de contratos do painel do cliente SHALL exibir número do contrato, valores, totais
efetivos e datas em `font-mono tabular-nums`, converter centavos para reais apenas na
apresentação (`formatCurrencyBRL(amount_cents / 100)`) e representar o status por chip do design
system com mapa de rótulo e variante, sem `alert()` ou `window.confirm()` nativos.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: `StoreContractRequest` e `UpdateContractRequest` existem, chamam `authorize()` via `ContractPolicy` (create/update) e definem regras próprias (`number` max:60, `title` max:200, `status` in:draft,active,suspended,ended), mas NENHUM controller do módulo os type-hinta — `ContractController` valida inline com `$request->validate()` e limites diferentes (`number` max:50, `title` max:255) e nunca chama `authorize()`/`Gate`. Não foi possível determinar pelo código se os FormRequests são resquício ou o destino pretendido; a spec segue o caminho efetivamente executado (controller inline). -->
<!-- uncertainty: Como os FormRequests não são usados, `ContractPolicy` (e as permissões `contracts.view` / `contracts.manage`) nunca é avaliada em runtime pelas rotas do módulo. A autorização efetiva vem do middleware `module-access:contracts` mais as checagens de `org_unit_id` no controller. `module.json` do Contracts também não declara a chave `permissions`, ao contrário do padrão de outros módulos. -->
<!-- uncertainty: `changeStatus()` não implementa máquina de estados: qualquer status do enum é aceito a partir de qualquer outro (inclusive `cancelled` → `active`, ou mudança de status em contrato já `ended`). Não há evidência no código de que transições sejam restritas, então nenhum Requirement de transição proibida foi escrito. -->
<!-- uncertainty: `ContractController.update()` grava direto no modelo, sem `ContractHistory`, sem `AuditLogger` e sem Outbox — divergindo de `createContract`/`addAddendum`/`changeStatus`. Não foi possível determinar se é omissão ou decisão (edição de campos não financeiros). -->
<!-- uncertainty: `SupportTicketService.openTicket()` gera `ticket_number` por `count() + 1` fora de transação/lock; duas aberturas concorrentes no mesmo tenant e ano produzem o mesmo número e colidem com `unique(tenant_id, ticket_number)`. Não há retry no código. -->
<!-- uncertainty: `SupportTicketController.resolveTenantId()` e `SupportTicketService.resolveTenantId()` capturam qualquer `Throwable` e retornam `null`, caso em que as consultas rodam sem filtro de `tenant_id` (o global scope do `TenantAware` também só atua com tenant presente). Na prática o middleware `tenant` da rota deveria impedir esse estado, mas o fallback existe e não foi possível confirmar se é intencional. -->
<!-- uncertainty: A auditoria de tickets usa o módulo `support`, enquanto o código vive no módulo `contracts` e as rotas ficam sob `api/contracts/tickets`. Não foi possível determinar se helpdesk é um capability separado ainda não extraído. -->
<!-- uncertainty: `ContractAttachment` tem modelo e tabela (`contract_attachments`, com `storage_key`, `mime_type`, `size_bytes`, `uploaded_by`) e é carregado em `show()`, mas não existe rota, controller ou service de upload/remoção no módulo. O contrato de anexos não está expresso em código executável. -->
<!-- uncertainty: `max_addenda_percent` é `decimal(5,2)` no banco mas castado como `float` no modelo e usado em `round($this->amount_cents * ($this->max_addenda_percent / 100))`. É percentual, não valor monetário, mas é a única aritmética em ponto flutuante que influencia um limite financeiro. -->
<!-- uncertainty: `ContractLifecycleTest` estende `Tests\TestCase` enquanto `TenantIsolationTest` estende `Modules\Contracts\Tests\TestCase`. O teste de isolamento cobre apenas leitura de `Contract` (tenant B não enxerga contrato do tenant A); não há teste de isolamento para `ContractAddendum`, `ContractAttachment`, `ContractHistory`, `SupportTicket` nem `TicketMessage`, e não há teste algum de HTTP/autorização por org_unit. -->
