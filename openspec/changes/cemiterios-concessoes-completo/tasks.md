# Tasks

## 1. Backend — Migração e Modelo

- [x] 1.1 Criar migration aditiva em `concessions` adicionando `motivo_extincao` (string, nullable) e
  `extinta_em` (date, nullable); verificar com `php artisan migrate` local e `composer test` sem quebras
- [x] 1.2 Atualizar `Modules\Cemiterios\Models\Concessao` (`@property`, `$casts['extinta_em' => 'date']`) e
  verificar que `composer static` (phpstan/larastan) não aponta novos erros

## 2. Backend — Filtros Avançados e Situação Financeira

- [x] 2.1 Estender `ConcessaoController@index` com os parâmetros `modalidade`, `setor_id` (via
  `whereHas('jazigo', fn ($q) => $q->where('sector_id', $v))`), `vence_ate` (data limite de término),
  `pendencia_regularizacao` e `busca` (texto livre combinando número, processo administrativo, código do
  jazigo, nome/documento do concessionário); verificar com teste de feature que cada filtro isola o
  resultado esperado
- [x] 2.2 Adicionar o parâmetro `financeiro` (`adimplente` | `inadimplente` | `sem_guias`) replicando o
  predicado de `JazigoController` (`whereHas`/`whereDoesntHave('guias', ...)`); verificar com teste de
  feature cobrindo os três valores
- [x] 2.3 Incluir no `index` o carregamento de `jazigo.cemiterio:id,nome` e do setor para exibir
  necrópole/setor na listagem sem N+1; verificar com teste de feature que a contagem de queries não
  aumenta por linha retornada

## 3. Backend — Extinção por Renúncia

- [x] 3.1 Implementar `ConcessaoService::renunciar(Concessao $concessao, string $motivo, ?string $processoAdministrativo)`
  validando `situacao === 'vigente'`, atualizando `situacao = 'extinta'`, `motivo_extincao = 'renuncia'`,
  `extinta_em = today()` e chamando `JazigoEstadoService::recalcular()`; verificar com teste de feature
  cobrindo o cenário de sucesso do spec `cemiterio/regras-concessao-sucessao`
- [x] 3.2 Adicionar `ConcessaoController@renunciar` (rota `POST /api/cemiterios/concessoes/{id}/renunciar`,
  permissão `cemiterios.concessoes.manage`, validação de `motivo` obrigatório) e registrar em `AuditLogger`
  (`concessao.renunciada`); verificar com teste de feature os cenários de motivo ausente e de concessão não
  vigente do spec
- [x] 3.3 Atualizar `AbandonoService::decidir()` para preencher `motivo_extincao = 'abandono'` e
  `extinta_em` ao extinguir a concessão; verificar que `ConcessoesTest`/testes de abandono existentes
  continuam passando

## 4. Backend — Histórico Auditável

- [x] 4.1 Adicionar `ConcessaoController@historico` (rota `GET /api/cemiterios/concessoes/{id}/historico`,
  permissão `cemiterios.view`) consultando `audit_logs` por `module = 'cemiterios'` e
  `resource = "Concessao #{id}"`, ordenado por data decrescente, com paginação; verificar com teste de
  feature que o acesso ao histórico de uma concessão de outro tenant retorna 404 (isolamento multi-tenant
  via `TenantAware` de `Concessao`)

## 5. Frontend — Filtros Avançados

- [x] 5.1 Criar `apps/web-client/src/modules/cemiterios/views/ConcessoesFiltros.tsx` seguindo o padrão de
  `InventarioFiltros.tsx` (linha principal + seção expansível, contador de filtros ativos, botão limpar)
  com os campos de `cemiterio/concessoes-gestao` (setor, modalidade, situação, pendência, financeiro,
  vencimento, busca — sem filtro de necrópole, já fixada pela aba); verificar com
  `npm run typecheck -w apps/web-client`
- [x] 5.2 Integrar `ConcessoesFiltros` em `ConcessoesView.tsx`, mantendo o filtro de necrópole ativa já
  aplicado por `cemiterio/isolamento-contextual-abas`, e repassar os novos parâmetros para
  `cemiteriosApi.concessoes(...)`; verificar manualmente que trocar cada filtro atualiza a listagem
- [x] 5.3 Atualizar `cemiteriosApi.concessoes()` em `api.ts` com os novos parâmetros de query e os tipos
  correspondentes; verificar com `npm run typecheck -w apps/web-client`

## 6. Frontend — Data Table Completa

- [x] 6.1 Habilitar `exportable`, `exportFileName`, `exportTitle`, `pageSizeSelector` e `resizableColumns`
  no `DataTable` da aba de concessões; verificar manualmente a exportação em CSV/XLSX/PDF respeitando os
  filtros ativos
- [x] 6.2 Adicionar as colunas "Setor/Quadra" e "Situação Financeira" (com `meta.exportValue`/
  `meta.sortValue`) em `colunasConcessoes`; verificar que a exportação inclui as novas colunas e que a
  ordenação por essas colunas funciona
- [x] 6.3 Exibir `motivo_extincao` como tooltip/texto auxiliar no `StatusChip` quando `situacao === 'extinta'`;
  verificar visualmente com uma concessão extinta por abandono e outra por renúncia

## 7. Frontend — Ação de Renúncia

- [x] 7.1 Adicionar botão "Renunciar" (visível quando `gerencia && situacao === 'vigente'`) com
  `ConfirmDialog`/`FormModal` exigindo motivo obrigatório, chamando o novo endpoint; verificar
  manualmente o fluxo completo e a rejeição quando o motivo é deixado em branco

## 8. Frontend — Histórico da Concessão

- [x] 8.1 Criar `views/DrawerHistoricoConcessao.tsx` reaproveitando o padrão de
  `PainelRegulatorioDrawer.tsx`, consumindo o endpoint de histórico; abrir a partir de uma ação na linha da
  tabela; verificar manualmente que uma concessão renovada mostra os dois eventos em ordem cronológica

## 9. Validação Final

- [x] 9.1 Rodar `composer test`, `composer static` e `composer lint` em `apps/api` e confirmar sucesso
- [x] 9.2 Rodar `npm run typecheck` e `npm test` em `apps/web-client` e confirmar sucesso
- [x] 9.3 Validar a mudança com `openspec validate cemiterios-concessoes-completo --strict`
