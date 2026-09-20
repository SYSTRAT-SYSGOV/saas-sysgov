# Spec: finance

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Finance (Services/{AccountingService,BudgetExecutionService,FinanceService}, Models/{AccountingEntry,AccountingLine,ChartOfAccount,BudgetCommitment,BudgetSettlement,BudgetPayment,Revenue,Expense,Invoice,Transfer}, Http/Controllers/{FinanceController,FinanceEntryController,AccountingController,BudgetExecutionController}, Http/Requests/{StoreRevenueRequest,StoreExpenseRequest}, Policies/FinanceEntryPolicy, Providers/FinanceServiceProvider, Routes/api.php, Database/Migrations/*, Tests/Feature/*), apps/api/database/migrations/2026_08_31_120000_add_org_unit_id_to_contracts_and_expenses_table.php, apps/api/app/Services/ModuleAccessService, apps/web-client/src/modules/finance
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: Financeiro operacional e contábil-orçamentário público. Cobre entradas fiscais
(receitas, despesas, faturas, repasses), contabilidade pública pelo PCASP com partidas
dobradas e balancete de verificação, e o ciclo de execução da despesa
Empenho → Liquidação → Pagamento (NE/NL/OB) com restos a pagar. Todo valor monetário
trafega em centavos inteiros; todo dado é isolado por tenant e filtrado por unidade
organizacional; toda mutação é auditada e todo efeito externo sai por Outbox.

---

### Requirement: Lançamento contábil exige partidas dobradas balanceadas
<!-- id: AccountingService.createEntry -->
<!-- entities: AccountingEntry, AccountingLine, ChartOfAccount -->
<!-- triggers: Balancete de verificação apura saldos pela natureza da conta -->
<!-- enforced: AccountingService.createEntry() -->

Um lançamento contábil SHALL conter no mínimo 2 (duas) partidas e a soma dos valores de tipo
`debito` SHALL ser exatamente igual à soma dos valores de tipo `credito`, em centavos inteiros.
Cada partida referencia uma conta existente em `chart_of_accounts`, tem tipo `debito` ou
`credito` e `amount_cents >= 1`. O `total_amount_cents` do lançamento recebe o total de débitos.
A escrita do cabeçalho e das linhas roda em uma única `DB::transaction()`, o lançamento nasce
com `status = confirmado`, é auditado como `entry.created` e publica
`accounting.EntryCreated` no Outbox.

#### Scenario: lançamento balanceado
<!-- test: AccountingPartidasDobradasTest.test_accounting_entry_enforces_balanced_double_entry_bookkeeping() -->
- **WHEN** `createEntry()` recebe débito de 500000 em conta devedora e crédito de 500000 em conta credora
- **THEN** persiste o `AccountingEntry` com `total_amount_cents = 500000`, `status = confirmado`, grava as duas `AccountingLine`, audita e publica o evento no Outbox

#### Scenario: lançamento desbalanceado
<!-- test: AccountingPartidasDobradasTest.test_accounting_entry_enforces_balanced_double_entry_bookkeeping() -->
- **WHEN** `createEntry()` recebe débito de 500000 e crédito de 400000
- **THEN** lança `ValidationException` na chave `lines` com "As partidas dobradas estão desbalanceadas: Total Débitos (R$ 5.000,00) != Total Créditos (R$ 4.000,00)." e nada é persistido

#### Scenario: lançamento com uma única partida
- **WHEN** `createEntry()` recebe `lines` com menos de 2 itens
- **THEN** lança `ValidationException` "Um lançamento contábil exige no mínimo duas partidas dobradas (um débito e um crédito)."; o controller já barra antes por `lines => array|min:2` (HTTP 422)

#### Scenario: partida com conta inexistente ou valor zero
- **WHEN** `AccountingController.storeEntry()` recebe `lines.*.account_id` fora de `chart_of_accounts` ou `lines.*.amount_cents < 1`
- **THEN** responde HTTP 422 e o service nunca é chamado

---

### Requirement: Documentos fiscais e contábeis recebem numeração sequencial anual por tenant
<!-- id: AccountingService.createEntry -->
<!-- entities: AccountingEntry, BudgetCommitment, BudgetSettlement, BudgetPayment -->
<!-- enforced: AccountingService.createEntry() -->

Cada documento SHALL receber número gerado a partir do ano do seu documento e da contagem de
documentos do mesmo tipo naquele ano, no formato canônico do setor público: lançamento contábil
`LC-{ano}-{seq:5}`, empenho `{ano}NE{seq:6}`, liquidação `{ano}NL{seq:6}` e ordem bancária
`{ano}OB{seq:6}`. A sequência é `count(ano) + 1`. A unicidade é garantida pelo índice
`unique(tenant_id, {numero})` de cada tabela.

#### Scenario: primeiro lançamento contábil do exercício
- **WHEN** `createEntry()` é chamado com `entry_date` em 2026 e não há lançamentos de 2026 no tenant
- **THEN** o `entry_number` gerado é `LC-2026-00001`

#### Scenario: primeiro empenho do exercício
- **WHEN** `createCommitment()` é chamado com `commitment_date` em 2026 e não há empenhos de 2026
- **THEN** o `commitment_number` gerado é `2026NE000001`

#### Scenario: liquidação e pagamento
- **WHEN** `createSettlement()` / `createPayment()` são chamados no exercício 2026
- **THEN** os números gerados seguem `2026NL{seq:6}` e `2026OB{seq:6}`

---

### Requirement: Balancete de verificação apura saldos pela natureza da conta
<!-- id: AccountingService.generateTrialBalance -->
<!-- entities: ChartOfAccount, AccountingLine, AccountingEntry -->
<!-- depends_on: Lançamento contábil exige partidas dobradas balanceadas -->
<!-- enforced: AccountingService.generateTrialBalance() -->

O balancete SHALL percorrer todas as contas do plano do tenant, ordenadas por `code`, e somar
débitos e créditos das partidas cujos lançamentos pertençam ao exercício `year` (e, quando
`month` for informado, até aquele mês, acumulado). O saldo de cada conta SHALL ser
`debitos − creditos` para contas de natureza `devedora` e `creditos − debitos` para contas
`credora`. O resumo SHALL expor `total_debits_cents`, `total_credits_cents` e
`is_balanced = (total_debits_cents === total_credits_cents)`.

#### Scenario: balancete de exercício com um lançamento balanceado
<!-- test: AccountingPartidasDobradasTest.test_accounting_entry_enforces_balanced_double_entry_bookkeeping() -->
- **WHEN** `generateTrialBalance(2026)` roda após um lançamento de 500000 débito/crédito
- **THEN** retorna `summary.is_balanced = true` com `total_debits_cents = 500000` e `total_credits_cents = 500000`

#### Scenario: saldo de conta credora
- **WHEN** uma conta de `nature = credora` acumula 500000 de crédito e nenhum débito
- **THEN** seu `balance_cents` é `500000` (e não `-500000`)

#### Scenario: balancete acumulado até um mês
- **WHEN** `trialBalance` é chamado com `month`
- **THEN** somente lançamentos com `entry_date` de mês menor ou igual ao informado, no mesmo ano, entram na apuração

---

### Requirement: Plano de contas PCASP é consultado por tenant e por tipo de conta
<!-- id: AccountingController.chartOfAccounts -->
<!-- entities: ChartOfAccount -->
<!-- enforced: AccountingController.chartOfAccounts() -->

O plano de contas SHALL ser estruturado segundo o PCASP, com `code` único por tenant,
`account_type` restrito a `ativo`, `passivo`, `vpd`, `vpa`, `orcamentario_despesa`,
`orcamentario_receita`, `controle_devedor`, `controle_credor`, `nature` restrita a `devedora`
ou `credora`, `level` hierárquico, marcação `is_synthetic` (sintética/analítica) e `parent_id`
auto-referente. A listagem SHALL ser ordenada por `code` e filtrável por `account_type`.

#### Scenario: listagem completa do plano
- **WHEN** `chartOfAccounts()` é chamado sem filtro
- **THEN** retorna todas as contas do tenant ordenadas por `code`

#### Scenario: filtro por tipo de conta
- **WHEN** a query string traz `account_type=ativo`
- **THEN** somente contas desse tipo são retornadas

#### Scenario: código de conta duplicado no mesmo tenant
- **WHEN** duas contas do mesmo tenant tentam usar o mesmo `code`
- **THEN** a constraint `unique(tenant_id, code)` rejeita a segunda gravação

---

### Requirement: Empenho registra o compromisso da despesa e abre o ciclo de execução
<!-- id: BudgetExecutionService.createCommitment -->
<!-- entities: BudgetCommitment, OrgUnit -->
<!-- triggers: Liquidação não pode exceder o saldo empenhado -->
<!-- enforced: BudgetExecutionService.createCommitment() -->

A emissão de empenho SHALL exigir `commitment_date`, `supplier_name`, `expense_nature`
(natureza da despesa, ex.: `3.3.90.39`), `description` e `amount_cents >= 1`; `supplier_cnpj`,
`function_code` e `org_unit_id` são opcionais. O empenho nasce com `settled_amount_cents = 0`,
`paid_amount_cents = 0` e `status = empenhado`, é auditado como `commitment.created` e publica
`finance.CommitmentCreated` no Outbox.

#### Scenario: empenho válido
- **WHEN** `storeCommitment()` recebe payload válido
- **THEN** responde HTTP 201 com o empenho numerado, zerado em liquidado/pago e em `status = empenhado`

#### Scenario: empenho com valor zero ou negativo
- **WHEN** `amount_cents < 1`
- **THEN** responde HTTP 422 e nada é persistido

#### Scenario: empenho sem natureza da despesa
- **WHEN** `expense_nature` não é informado
- **THEN** responde HTTP 422

#### Scenario: unidade organizacional inexistente
- **WHEN** `org_unit_id` não existe em `org_units`
- **THEN** responde HTTP 422 (`exists:org_units,id`)

---

### Requirement: Liquidação não pode exceder o saldo empenhado
<!-- id: BudgetExecutionService.createSettlement -->
<!-- entities: BudgetSettlement, BudgetCommitment -->
<!-- depends_on: Empenho registra o compromisso da despesa e abre o ciclo de execução -->
<!-- triggers: Pagamento não pode exceder o valor liquidado -->
<!-- enforced: BudgetExecutionService.createSettlement() -->

O valor da liquidação SHALL ser menor ou igual ao saldo não liquidado do empenho
(`unsettled_amount_cents = max(0, amount_cents − settled_amount_cents)`). Autorizada, a
liquidação roda em `DB::transaction()`, herda o `org_unit_id` do empenho, nasce com
`status = liquidado`, soma-se a `settled_amount_cents` do empenho e promove o status do empenho
para `liquidado` quando o total liquidado atinge o valor empenhado, ou `liquidado_parcial` caso
contrário. Audita `settlement.created` e publica `finance.SettlementCreated` no Outbox.

#### Scenario: liquidação acima do saldo empenhado
- **WHEN** `createSettlement()` recebe `amount_cents` maior que `unsettled_amount_cents`
- **THEN** lança `ValidationException` "O valor da liquidação (R$ X) excede o saldo empenhado disponível (R$ Y)." e nada é persistido

#### Scenario: liquidação parcial
- **WHEN** a liquidação cobre parte do empenho
- **THEN** o empenho passa a `status = liquidado_parcial` com `settled_amount_cents` acumulado

#### Scenario: liquidação integral
- **WHEN** o total liquidado atinge ou supera `amount_cents` do empenho
- **THEN** o empenho passa a `status = liquidado`

#### Scenario: empenho já integralmente liquidado
- **WHEN** `unsettled_amount_cents` é 0 e chega nova liquidação
- **THEN** a validação falha, pois qualquer `amount_cents >= 1` excede o saldo

---

### Requirement: Pagamento não pode exceder o valor liquidado
<!-- id: BudgetExecutionService.createPayment -->
<!-- entities: BudgetPayment, BudgetSettlement, BudgetCommitment -->
<!-- depends_on: Liquidação não pode exceder o saldo empenhado -->
<!-- enforced: BudgetExecutionService.createPayment() -->

A ordem bancária SHALL ter valor menor ou igual ao `amount_cents` da liquidação de origem.
Autorizada, roda em `DB::transaction()`, herda o `org_unit_id` da liquidação, nasce com
`status = pago`, soma-se a `paid_amount_cents` do empenho e promove o empenho a `status = pago`
quando o total pago atinge o valor empenhado (mantendo o status anterior caso contrário).
Audita `payment.created` e publica `finance.PaymentCreated` no Outbox.

#### Scenario: pagamento acima do liquidado
- **WHEN** `createPayment()` recebe `amount_cents` maior que `settlement.amount_cents`
- **THEN** lança `ValidationException` "O valor da ordem de pagamento não pode exceder o valor liquidado." e nada é persistido

#### Scenario: pagamento que quita o empenho
- **WHEN** o total pago acumulado atinge `commitment.amount_cents`
- **THEN** o empenho passa a `status = pago`

#### Scenario: pagamento parcial
- **WHEN** o total pago acumulado ainda é inferior ao empenhado
- **THEN** o `status` do empenho permanece o anterior (`liquidado_parcial` ou `liquidado`) e somente `paid_amount_cents` é atualizado

---

### Requirement: Resumo da execução orçamentária apura restos a pagar e taxa de execução
<!-- id: BudgetExecutionController.budgetSummary -->
<!-- entities: BudgetCommitment -->
<!-- enforced: BudgetExecutionController.budgetSummary() -->

O resumo SHALL agregar, sobre os empenhos visíveis ao usuário, `total_committed_cents`,
`total_settled_cents` e `total_paid_cents`, derivar
`restos_a_pagar_cents = max(0, empenhado − pago)` e `execution_rate_percent = (pago / empenhado)
× 100` com 2 casas decimais, retornando `0` quando não há empenho. Todos os totais SHALL ser
expostos em centavos inteiros.

#### Scenario: tenant sem empenhos
- **WHEN** não há empenhos visíveis
- **THEN** todos os totais são 0 e `execution_rate_percent` é `0` (sem divisão por zero)

#### Scenario: empenhado maior que pago
- **WHEN** há saldo empenhado ainda não pago
- **THEN** `restos_a_pagar_cents` traz a diferença, nunca negativa

#### Scenario: usuário com escopo restrito de secretaria
- **WHEN** o usuário não é admin global
- **THEN** o resumo considera apenas empenhos das unidades organizacionais autorizadas pelo `ModuleAccessService.scopeQuery()`

---

### Requirement: Consulta e listagem de empenhos respeitam o escopo do objeto
<!-- id: BudgetExecutionController.showCommitment -->
<!-- entities: BudgetCommitment, BudgetSettlement, BudgetPayment, OrgUnit -->
<!-- enforced: BudgetExecutionController.showCommitment() -->

A listagem de empenhos SHALL ser paginada, filtrável por `status` e pesquisável por
`commitment_number`, `supplier_name` ou `description`, ordenada por `commitment_date`
decrescente. A consulta de um empenho específico, a criação de liquidação sobre ele e a criação
de pagamento sobre uma liquidação SHALL validar a unidade organizacional do próprio objeto
contra as unidades autorizadas do usuário — não apenas a rota — abortando com HTTP 403 quando
o objeto pertence a unidade fora do escopo (prevenção de BOLA).

#### Scenario: acesso a empenho de secretaria não autorizada
- **WHEN** `showCommitment()` é chamado por usuário não-admin cujo `allowedOrgUnitIds` não contém `commitment.org_unit_id`
- **THEN** aborta com HTTP 403

#### Scenario: liquidação sobre empenho fora do escopo
- **WHEN** `storeSettlement()` recebe empenho de unidade não autorizada
- **THEN** aborta com HTTP 403 antes de qualquer validação de valor

#### Scenario: pagamento sobre liquidação fora do escopo
- **WHEN** `storePayment()` recebe liquidação cujo `org_unit_id` não está autorizado
- **THEN** aborta com HTTP 403

#### Scenario: empenho inexistente
- **WHEN** o `id` não existe no tenant corrente
- **THEN** `findOrFail()` responde HTTP 404 (o global scope de tenant já removeu registros de outros tenants)

---

### Requirement: Entradas fiscais são criadas e alteradas com validação, escopo e rastreabilidade
<!-- id: FinanceEntryController.storeRevenue -->
<!-- entities: Revenue, Expense, OrgUnit, Contract, BudgetUnit -->
<!-- enforced: FinanceEntryController.storeRevenue() -->

Receitas e despesas SHALL exigir `description` (máx. 255), `amount_cents` inteiro `>= 1` e
`occurred_at`; `due_at`, `paid_at`, `contract_id` e `budget_unit_id` são opcionais e o `status`,
quando informado, SHALL pertencer a `pending | paid | overdue | cancelled`. A criação exige a
habilidade `create` da `FinanceEntryPolicy` (permissão `finance.manage`) e a alteração exige
`update` sobre o objeto. Toda criação/alteração é gravada em transação, auditada
(`finance/created`, `finance/updated`, com estado anterior e posterior) e publicada no Outbox
(`finance.revenue.created`, `finance.revenue.updated`, `finance.expense.created`,
`finance.expense.updated`).

#### Scenario: criação de receita válida
- **WHEN** `storeRevenue()` recebe payload válido de usuário com `finance.manage`
- **THEN** responde HTTP 201 com a receita criada, registra auditoria com `before = null` e publica `finance.revenue.created` com `amount_cents`

#### Scenario: usuário sem permissão de gestão
- **WHEN** o usuário não possui `finance.manage` no tenant corrente
- **THEN** `StoreRevenueRequest.authorize()` falha e a requisição responde HTTP 403

#### Scenario: status fora do domínio
- **WHEN** `status` é diferente de `pending`, `paid`, `overdue` ou `cancelled`
- **THEN** responde HTTP 422

#### Scenario: valor zero
- **WHEN** `amount_cents` é 0 ou negativo
- **THEN** responde HTTP 422 (`integer|min:1`)

#### Scenario: atualização de despesa
- **WHEN** `updateExpense()` é autorizado pela policy
- **THEN** a auditoria `finance/updated` grava o `before` completo e o `after` do objeto, e `finance.expense.updated` é publicado

---

### Requirement: Entradas fiscais são restritas às unidades organizacionais autorizadas
<!-- id: FinanceEntryController.resolveOrgUnitId -->
<!-- entities: Revenue, Expense, OrgUnit, OrgUnitUser, UserModuleAccess -->
<!-- enforced: FinanceEntryController.resolveOrgUnitId() -->

Para usuários que não são `is_platform_admin`, analista de suporte ou `admin_tenant`, a
listagem de receitas e despesas SHALL ser filtrada por `ModuleAccessService.scopeQuery()` sobre
`org_unit_id`, e a gravação SHALL resolver o `org_unit_id` server-side: quando o usuário tem
escopo restrito, o `org_unit_id` informado SHALL pertencer ao conjunto autorizado, sob pena de
HTTP 403 "Org unit não autorizada."; quando nenhum `org_unit_id` é informado, o sistema SHALL
adotar a primeira unidade vinculada ao usuário em `OrgUnitUser` no tenant corrente.

#### Scenario: gravação em secretaria não autorizada
- **WHEN** um usuário de escopo restrito envia `org_unit_id` fora de `allowedOrgUnitIds`
- **THEN** aborta com HTTP 403 "Org unit não autorizada." antes da persistência

#### Scenario: gravação sem org_unit_id informado
- **WHEN** o payload não traz `org_unit_id`
- **THEN** o sistema resolve a primeira unidade vinculada ao usuário em `org_unit_user` do tenant

#### Scenario: listagem por usuário de escopo restrito
- **WHEN** `indexRevenues()` / `indexExpenses()` são chamados por usuário não-admin
- **THEN** a paginação (25 por página, ordenada por `occurred_at` desc) retorna apenas registros das unidades autorizadas

#### Scenario: administrador do tenant
- **WHEN** o usuário é `admin_tenant`, `is_platform_admin` ou analista de suporte
- **THEN** nenhum filtro de unidade é aplicado e todos os registros do tenant são visíveis

---

### Requirement: Resumo financeiro consolida receitas, despesas, faturas, repasses e conciliações pendentes
<!-- id: FinanceController.summary -->
<!-- entities: Revenue, Expense, Invoice, Transfer, Reconciliation -->
<!-- enforced: FinanceController.summary() -->

O resumo SHALL retornar, em centavos inteiros, a soma de `amount_cents` de `revenues`,
`expenses`, `invoices` e `transfers` do tenant corrente, além da contagem de conciliações com
`status = pending`. As quatro somas SHALL ser filtradas pelas unidades organizacionais
autorizadas quando o usuário não for administrador global; quando o conjunto autorizado não
puder ser determinado, as somas SHALL ser zeradas por `whereRaw('1 = 0')`.

#### Scenario: administrador do tenant
- **WHEN** o usuário é admin global do tenant
- **THEN** as somas cobrem todos os registros do `tenant_id` resolvido pelo `TenantContext`

#### Scenario: usuário com escopo de secretarias
- **WHEN** `allowedOrgUnitIds()` retorna uma lista de unidades
- **THEN** as quatro consultas recebem `whereIn('org_unit_id', $allowedIds)`

#### Scenario: conciliações pendentes
- **WHEN** existem registros em `reconciliations` com `status = pending` no tenant
- **THEN** `pending_reconciliations` traz a contagem, sem filtro de unidade organizacional

---

### Invariant: Todo valor monetário do Finance é inteiro em centavos
<!-- entities: Revenue, Expense, Invoice, Transfer, AccountingEntry, AccountingLine, BudgetCommitment, BudgetSettlement, BudgetPayment -->
<!-- enforced: AccountingService.createEntry() -->
<!-- verified_by: AccountingPartidasDobradasTest.test_accounting_entry_enforces_balanced_double_entry_bookkeeping() -->

Nenhum campo monetário do módulo SHALL ser `float`, `decimal` ou string. Todas as colunas de
valor são `unsignedBigInteger` sufixadas `_cents` (`amount_cents`, `total_amount_cents`,
`settled_amount_cents`, `paid_amount_cents`), com cast `integer` nos models e validação
`['required','integer','min:1']` nas camadas HTTP. Toda aritmética de valores (soma de débitos
e créditos, saldo não liquidado, restos a pagar, acumulados de liquidação e pagamento) SHALL
ocorrer sobre inteiros; a conversão para reais existe apenas na formatação de mensagens de erro
(`number_format($cents / 100, ...)`) e na camada de apresentação. A única aritmética de ponto
flutuante do módulo é a taxa percentual de execução orçamentária, que não é valor monetário.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda tabela e model do Finance é isolado por tenant
<!-- entities: Revenue, Expense, Invoice, Transfer, ChartOfAccount, AccountingEntry, AccountingLine, BudgetCommitment, BudgetSettlement, BudgetPayment -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationTest.test_finance_entries_are_scoped_to_the_current_tenant() -->

Todas as 10 tabelas do módulo têm `tenant_id` com FK `cascadeOnDelete`, índices compostos
iniciados por tenant (`tenant_id, occurred_at`, `tenant_id, status`, `tenant_id, entry_date`,
`tenant_id, commitment_date`, `tenant_id, org_unit_id`) e unicidade escopada por tenant
(`unique(tenant_id, code)`, `unique(tenant_id, entry_number)`, `unique(tenant_id,
commitment_number)`, `unique(tenant_id, settlement_number)`, `unique(tenant_id,
payment_number)`, `unique(tenant_id, reference)`). Todos os 10 models usam o trait
`TenantAware`, que aplica o global scope `tenant` na leitura e preenche `tenant_id` na criação.
O `tenant_id` é resolvido server-side pelo `TenantContext` (middleware `tenant` / `ResolveTenant`
na rota) e nunca aceito do cliente — nenhuma regra de validação do módulo aceita `tenant_id`
no payload. Criar registro sem contexto de tenant e sem `tenant_id` explícito lança
`LogicException`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda escrituração contábil permanece balanceada
<!-- entities: AccountingEntry, AccountingLine -->
<!-- enforced: AccountingService.createEntry() -->
<!-- verified_by: AccountingPartidasDobradasTest.test_accounting_entry_enforces_balanced_double_entry_bookkeeping() -->

Para todo `AccountingEntry` persistido, a soma dos `amount_cents` de suas `AccountingLine` de
tipo `debito` SHALL ser igual à soma das de tipo `credito`, e `total_amount_cents` SHALL ser
igual a esse total. Consequentemente o balancete de qualquer período fechado SHALL retornar
`is_balanced = true`. O lançamento e suas linhas são gravados na mesma transação — não existe
cabeçalho sem partidas.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O total liquidado nunca excede o valor empenhado
<!-- entities: BudgetCommitment, BudgetSettlement -->
<!-- enforced: BudgetExecutionService.createSettlement() -->

Para todo `BudgetCommitment`, `settled_amount_cents <= amount_cents` e
`unsettled_amount_cents = max(0, amount_cents − settled_amount_cents) >= 0`. A execução da
despesa SHALL seguir estritamente Empenho → Liquidação → Pagamento: uma liquidação só existe
vinculada a um empenho (`commitment_id` NOT NULL) e um pagamento só existe vinculado a uma
liquidação (`settlement_id` NOT NULL), ambos com `cascadeOnDelete`. O `status` do empenho
progride monotonicamente em `empenhado → liquidado_parcial → liquidado → pago`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do Finance é auditada com cadeia de hash
<!-- entities: Revenue, Expense, AccountingEntry, BudgetCommitment, BudgetSettlement, BudgetPayment -->
<!-- enforced: App\Support\AuditLogger.record() -->

Criação e alteração de entradas fiscais, lançamentos contábeis, empenhos, liquidações e
pagamentos SHALL gravar registro em `audit_logs` com `tenant_id`, `user_id`, módulo
(`finance` ou `accounting`), ação nomeada (`created`, `updated`, `entry.created`,
`commitment.created`, `settlement.created`, `payment.created`), recurso identificado, estados
`before`/`after`, IP, user agent e timestamp, encadeados por `hash`/`prev_hash` SHA-256
(RN-USR-007) para detecção de adulteração.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Efeitos externos do Finance são sempre assíncronos via Outbox
<!-- entities: OutboxEvent, AccountingEntry, BudgetCommitment, BudgetSettlement, BudgetPayment, Revenue, Expense -->
<!-- enforced: App\Support\OutboxPublisher.publish() -->

Nenhum controller ou service do Finance SHALL executar chamada externa síncrona (banco, TCE,
Siconfi, PNCP, webhook). Todo efeito externo é enfileirado em `outbox_events` com
`status = pending` e `tenant_id` do contexto — `accounting.EntryCreated`,
`finance.CommitmentCreated`, `finance.SettlementCreated`, `finance.PaymentCreated`,
`finance.revenue.created`, `finance.revenue.updated`, `finance.expense.created`,
`finance.expense.updated`. Os eventos de contabilidade e execução orçamentária são publicados
dentro da mesma `DB::transaction()` da escrita que os originou.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A autorização do Finance é server-side e escopada ao objeto
<!-- entities: Revenue, Expense, Invoice, Transfer, UserModuleAccess, OrgUnit -->
<!-- enforced: FinanceEntryPolicy.update() -->

Toda rota do módulo passa por `auth:sanctum`, `tenant` e `module-access:finance`. A
`FinanceEntryPolicy` — registrada via `Gate::policy()` para `Revenue`, `Expense`, `Invoice` e
`Transfer` — SHALL exigir `finance.view` para leitura e `finance.manage` para escrita, sempre
resolvendo as roles pelo `tenant_id` do `TenantContext`, e nos métodos de objeto (`view`,
`update`) SHALL conferir adicionalmente `$entry->tenant_id === TenantContext::id()`. O escopo de
unidade organizacional é reconferido contra o objeto em cada ação de empenho/liquidação/
pagamento. Esconder botão ou item de menu no frontend não é controle de acesso.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A UI do Finance usa primitivas do design system e fonte monoespaçada para números
<!-- entities: FinanceModule -->
<!-- enforced: apps/web-client/src/modules/finance/FinanceModule.tsx -->

O painel financeiro do cliente SHALL compor exclusivamente primitivas do design system
(`PageHeader`, `Card`, `CardContent`, `Button`, `KpiCard`, `ScreenState`, `Badge`, importadas
do barril `@/components/ui`, que reexporta `@sysgov/ui`), sem `alert()` ou `window.confirm()`
nativos, e SHALL exibir todo valor monetário e percentual em `font-mono`, convertendo centavos
para reais apenas na formatação (`formatCurrencyBRL(cents / 100)`).

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: App\Support\Money não é utilizado em nenhum ponto do módulo Finance — a invariante monetária do projeto é cumprida na prática (inteiros em centavos ponta a ponta, zero uso de float/decimal em campos monetários), mas por convenção de nomenclatura `_cents` e casts `integer`, não pela classe de suporte canônica. Não foi possível determinar pelo código se isso é decisão deliberada ou drift. -->
<!-- uncertainty: BudgetExecutionService.createPayment() valida o valor apenas contra `settlement->amount_cents`, e não contra o saldo ainda não pago da liquidação. Como uma liquidação pode receber N pagamentos, a soma dos pagamentos pode, em tese, exceder o valor liquidado e o valor empenhado — não há guarda equivalente ao `unsettled_amount_cents` usado na liquidação, nem constraint de banco. Não há teste cobrindo pagamentos múltiplos sobre a mesma liquidação. -->
<!-- uncertainty: Tratamento oposto do retorno `null` de ModuleAccessService.allowedOrgUnitIds(): o método devolve `null` tanto para "acesso total" quanto para "sem acesso / expirado / revogado". FinanceController.summary() trata `null` como negação total (`whereRaw('1 = 0')`), enquanto FinanceEntryController e BudgetExecutionController tratam o mesmo `null` como acesso irrestrito (scopeQuery sem filtro, e resolveOrgUnitId aceitando qualquer `org_unit_id` informado). Não foi possível determinar no código qual dos dois é o comportamento pretendido. -->
<!-- uncertainty: ModuleAccessService.inferModuleAlias() mapeia `Modules\Finance\Models\FinanceEntry::class` para o alias `finance`, mas essa classe não existe no módulo (os models são Revenue, Expense, Invoice, Transfer, BudgetCommitment...). Na prática o filtro de granularidade módulo × org_unit nunca é aplicado a nenhum model do Finance quando o usuário tem acesso irrestrito. -->
<!-- uncertainty: AccountingController.resolveTenantId() e AccountingService.resolveTenantId() capturam Throwable e retornam null quando não há TenantContext, caso em que as consultas rodam sem filtro explícito de tenant. O isolamento fica dependendo apenas do global scope de TenantAware, que também não filtra quando não há tenant no contexto. Como as rotas passam pelo middleware `tenant`, não foi possível determinar pelo código se esse caminho é alcançável em produção. -->
<!-- uncertainty: Os controllers de Contabilidade (AccountingController) e Execução Orçamentária (BudgetExecutionController) não invocam Gate/Policy alguma — não existe policy registrada para AccountingEntry, ChartOfAccount, BudgetCommitment, BudgetSettlement ou BudgetPayment. A autorização se resume ao middleware `module-access:finance` mais a checagem manual de org_unit; a distinção entre `finance.view` e `finance.manage` declarada no module.json não é aplicada nesses endpoints (qualquer usuário com acesso ao módulo pode emitir empenho, liquidação, ordem bancária e lançamento contábil). -->
<!-- uncertainty: A numeração de documentos usa `count(ano) + 1` sem lock nem sequence. Em concorrência dois processos podem gerar o mesmo número; a colisão é barrada pelo índice unique(tenant_id, numero), resultando em erro de banco em vez de renumeração. Além disso, BudgetExecutionService conta empenhos/liquidações/pagamentos sem where explícito de tenant (depende do global scope TenantAware), enquanto AccountingService aplica o where de tenant explicitamente — tratamentos divergentes para o mesmo problema. -->
<!-- uncertainty: Os status `estornado` (accounting_entries) e `anulado` (budget_commitments) existem no enum das migrations, mas não há nenhum código no módulo que produza essas transições — não existem endpoints nem services de estorno/anulação. -->
<!-- uncertainty: A tabela `reconciliations` é consultada diretamente via DB::table() em FinanceController.summary(), sem model Eloquent, sem TenantAware e sem endpoints de escrita — o ciclo de conciliação bancária não está implementado no módulo. -->
<!-- uncertainty: Lacuna de teste: o único teste de isolamento de tenant (TenantIsolationTest) cobre apenas Revenue e Expense. Não há teste de isolamento para ChartOfAccount, AccountingEntry, AccountingLine, BudgetCommitment, BudgetSettlement, BudgetPayment, Invoice ou Transfer. Também não há teste algum para BudgetExecutionService (empenho/liquidação/pagamento), para FinanceEntryPolicy, nem para o escopo por unidade organizacional. -->
