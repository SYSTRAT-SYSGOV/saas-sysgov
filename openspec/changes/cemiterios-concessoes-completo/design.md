# Design

## Context

Ver `proposal.md` - Why. Pontos técnicos relevantes que moldam a abordagem:

- `ConcessaoController@index` já aceita filtros simples (`park_id`, `situacao`, `holder_id`, `plot_id`,
  `numero`, `processo_administrativo`, `titular_falecido`) via `when()` do Eloquent — a mudança estende o
  mesmo padrão, sem trocar a abordagem.
- `JazigoController` já resolve inadimplência com `whereHas('concessoes.guias', fn ($g) => $g->where('situacao', 'emitida')->whereDate('vencimento', '<', today()))`
  — a tabela `charges` (guias) já tem índice `(tenant_id, situacao, vencimento)`, então o mesmo predicado
  aplicado a partir de `Concessao` (`whereHas('guias', ...)`) é igualmente indexado.
- `AuditLogger` já grava toda mutação em `audit_logs` com `module`, `resource` (string livre, ex.:
  `"Concessao #{$id}"`), `before`/`after`, usuário e timestamp — não existe hoje nenhuma tela que liste
  esses eventos filtrados por um recurso específico.
- `situacao = extinta` já é um valor válido no schema (`concessions.situacao`), hoje só atingido por
  `AbandonoService::decidir()`. `JazigoEstadoService::recalcular()` é o único ponto que deve tocar o
  estado do jazigo após qualquer mudança de concessão (evita duas fontes de verdade para o estado do
  jazigo).
- `InventarioFiltros.tsx` é o padrão visual e de código já aceito no módulo para painéis de filtro
  avançado expansível (linha principal + seção expansível, contador de filtros ativos, botão limpar).

## Goals / Non-Goals

**Goals:**
- Reaproveitar componentes, padrões de filtro e mecanismos de auditoria/estado já existentes no módulo —
  nenhuma peça de infraestrutura nova (sem fila, sem tabela de eventos dedicada, sem biblioteca nova).
- Deixar a extinção por renúncia auditável e reversível apenas por nova concessão (nunca por edição direta
  de estado).

**Non-Goals:**
- Não cobre a reforma da aba "Concessionários" (sub-aba `titulares`) além do necessário para os novos
  filtros — CRUD de concessionário permanece como está.
- Não introduz um "motor de regras" genérico de extinção; renúncia e abandono continuam sendo dois
  métodos de serviço distintos (`ConcessaoService::renunciar` e `AbandonoService::decidir`), não uma
  máquina de estados formal nova.
- Não cria uma tabela de eventos dedicada por concessão; o histórico lê `audit_logs` diretamente.

## Decisions

- **Filtros no backend via `when()` incremental em `ConcessaoController@index`, não um query builder
  genérico.** É o padrão já usado no próprio método e em `JazigoController`; introduzir uma camada de
  filtro genérica agora seria abstração sem um segundo consumidor real.
- **Situação financeira calculada por `whereHas('guias', ...)`, replicando o predicado já usado em
  `JazigoController`, em vez de desnormalizar um campo `situacao_financeira` na tabela `concessions`.**
  Evita um campo derivado que precisaria ser recalculado toda vez que uma guia for paga/cancelada;
  o índice já existente em `charges` torna a consulta barata mesmo no `whereHas`.
- **Histórico por concessão lendo `audit_logs` filtrado por `module = 'cemiterios'` e
  `resource = "Concessao #{id}"`, em vez de uma tabela `concession_events` nova.** A auditoria já
  registra exatamente os eventos que a proposta pede (criação, renovação, extinção, e quando a mudança
  de sucessão hereditária estiver em produção, a transferência de titular). Criar uma segunda tabela
  duplicaria dado que já existe e adicionaria mais um ponto de gravação a manter sincronizado.
  Alternativa descartada: emitir um evento de domínio dedicado — desnecessário sem outro consumidor
  além desta tela.
- **Extinção por renúncia como novo método `ConcessaoService::renunciar()`, espelhando a transação e a
  chamada a `JazigoEstadoService::recalcular()` já usadas em `AbandonoService::decidir()` e em
  `expirarVencidas()`.** Mantém único o ponto que decide o novo estado do jazigo a partir da concessão,
  em vez de duplicar essa lógica no controller.
- **Duas colunas nullable (`motivo_extincao`, `extinta_em`) na tabela `concessions` via migration
  aditiva, em vez de uma tabela de "motivos" à parte.** O conjunto de motivos é pequeno e não varia por
  tenant (`renuncia`, `abandono` — preenchido também retroativamente por `AbandonoService` ao decidir);
  uma tabela de referência seria complexidade sem benefício no volume atual.
- **Nenhuma permissão nova**: `renunciar` usa `cemiterios.concessoes.manage` (mesma permissão de
  `conceder`/`renovar`); o histórico usa `cemiterios.view` (mesma permissão de leitura da aba).
- **Nenhuma dependência nova**: exportação (CSV/XLSX/PDF) e paginação avançada já existem no `DataTable`
  local (`xlsx`, `jspdf`, `jspdf-autotable` já usados em outras telas); os filtros usam `Select`/`Input`
  de `@sysgov/ui`, como em `InventarioFiltros`.

## Risks / Trade-offs

- [Consulta a `audit_logs` por `resource` (string livre) pode variar de formato se algum código futuro
  gravar o recurso de forma diferente de `"Concessao #{$id}"`] → Mitigação: centralizar a leitura do
  histórico em um único método (`ConcessaoService`/controller), com o mesmo formato de string usado hoje
  pelo `ConcessaoController` ao chamar `AuditLogger`; um teste de feature cobre o formato esperado.
- [`whereHas('guias', ...)` em listagens muito grandes pode custar mais que um campo desnormalizado] →
  Mitigação: paginação já limita a 100 registros por página (`cemiterio/performance-carregamento`) e o
  índice `(tenant_id, situacao, vencimento)` em `charges` já existe; reavaliar desnormalização apenas se
  medição futura mostrar necessidade.
- [Renúncia e abandono resultam na mesma `situacao = extinta`, podendo confundir o operador sobre o
  motivo] → Mitigação: exibir `motivo_extincao` no `StatusChip`/tooltip da coluna Situação e no Drawer de
  histórico da listagem de Concessões.

## Migration Plan

1. Migration aditiva em `concessions`: `motivo_extincao` (string nullable), `extinta_em` (date nullable).
   Sem backfill obrigatório — concessões já extintas por abandono continuam funcionalmente corretas sem o
   motivo preenchido retroativamente; `AbandonoService::decidir()` passa a preencher os dois campos para
   novas extinções.
2. Backend: novos filtros em `ConcessaoController@index`, novo método `renunciar` (controller + service),
   novo endpoint de histórico. Cobertos por testes de feature antes de expor no frontend.
3. Frontend: `ConcessoesFiltros.tsx`, colunas novas em `ConcessoesView.tsx`, ação de renúncia, Drawer de
   histórico. Mudança confinada à aba já existente — sem alteração de rota.
4. Rollback: reverter o deploy do frontend não quebra o backend (filtros novos são opcionais via query
   string); reverter a migration é seguro por serem colunas nullable sem uso por outra funcionalidade.
