# Tasks

## 1. Dados: CPF no histórico e cifragem do token

- [x] 1.1 Migration adicionando coluna `cpf` (nullable, `TEXT`) a `pessoas_sync_logs`; cast `encrypted` no model `PessoaSyncLog`; verificar com teste de feature que criar um log com CPF grava e lê o valor decifrado corretamente
- [x] 1.2 Cast `encrypted` em `PessoaIntegracao::api_token` (sem alterar o tipo de coluna, já `TEXT`); verificar com teste que ler `api_token` após salvar retorna o valor original em texto plano (decifrado de forma transparente) e que a coluna no banco não contém o texto plano
- [x] 1.3 Atualizar `SincronizacaoPessoaService::sincronizar()` para gravar o `cpf` em todo `PessoaSyncLog` criado (sucesso, não encontrado e falha), não só nos casos de sucesso; verificar com teste que um log de falha também tem `cpf` preenchido (spec: Requirement "Reprocessamento manual de sincronização com falha")

## 2. Gestão de integrações (CRUD)

- [x] 2.1 Adicionar a permissão `cadastros.pessoas.integracoes.manage` ao `module.json` do módulo Pessoas; verificar que aparece na listagem de permissões do módulo
- [x] 2.2 `IntegracaoController` (`index`, `store`, `show`, `update`) para `PessoaIntegracao`, usando `AutorizaPermissao` com a permissão da tarefa 2.1; a resposta SHALL NOT incluir `api_token` em texto plano (mascarado ou omitido); verificar com teste cobrindo os Scenarios "Cadastro de nova integração", "Desativação de integração" e "Gestão de integrações sem permissão"
- [x] 2.3 Registrar as rotas de integrações em `Routes/api.php` sob `/integracoes`, no mesmo grupo de middleware do módulo (`auth:sanctum` + `resolve.tenant` + `module-access:pessoas`)
- [x] 2.4 Toda mutação em `PessoaIntegracao` (criar, editar, ativar/desativar) registrada via `AuditLogger`, seguindo o padrão já usado em `PessoaController`; verificar com teste que o audit log é criado

## 3. Histórico de sincronização e reprocessamento

- [x] 3.1 `SyncLogController::index` — listagem paginada de `PessoaSyncLog` por tenant, com filtro por `integracao_id` e por `status`; verificar com teste cobrindo os Scenarios "Consulta do histórico de sincronização" e "Filtro por status de sincronização"
- [x] 3.2 `SyncLogController::reprocessar` — publica um novo evento `ImportarPessoaListener::TIPO` via `OutboxPublisher` com o `cpf` (decifrado) e `integracao_id` do log selecionado, exigindo a mesma permissão `cadastros.pessoas.integracoes.manage`; retorna erro claro se o log não tiver `cpf` gravado (logs anteriores a esta mudança); verificar com teste ponta a ponta (via `php artisan outbox:process`) cobrindo os Scenarios "Reprocessamento de falha" e "Reprocessamento não duplica pessoa já existente"
- [x] 3.3 Registrar as rotas de histórico/reprocessamento em `Routes/api.php` sob `/sync-logs`, no mesmo grupo de middleware do módulo

## 4. Qualidade do backend

- [x] 4.1 `phpstan analyse Modules/Pessoas` limpo (0 erros)
- [x] 4.2 Suíte do módulo passando isolada (`vendor/bin/phpunit Modules/Pessoas`) e dentro do boot completo da aplicação junto dos demais módulos, sem regressão nos testes já existentes de `ImportacaoController`/`SincronizacaoPessoaService`/`TenantIsolationTest`

## 5. Contrato no SDK

- [x] 5.1 Tipos `PessoaIntegracao`, `PessoaSyncLog` e inputs (`CreateIntegracaoInput`, `UpdateIntegracaoInput`) em `packages/sdk/src/modules/pessoas/types.ts`, com `api_token` tipado apenas como valor mascarado na leitura
- [x] 5.2 Métodos de cliente (`listarIntegracoes`, `criarIntegracao`, `atualizarIntegracao`, `listarSyncLogs`, `reprocessarSyncLog`) em `packages/sdk/src/modules/pessoas/client.ts`; verificar com `npm run typecheck` do pacote `@sysgov/sdk` (pacote não expõe script `typecheck` próprio nem é consumido por nenhum app ainda — verificado com `tsc --noEmit` direto sobre `src/index.ts`, sem erros)

## 6. Tela de gestão de integrações

- [x] 6.1 Tela/painel de listagem de integrações do tenant (nome, URL, status ativo/inativo, última sincronização), usando componentes de `@sysgov/ui`, visível apenas com a permissão `cadastros.pessoas.integracoes.manage`
- [x] 6.2 Formulário de cadastro/edição de integração (nome, URL, token — campo de senha, nunca reexibindo o valor salvo —, mapeamento de campos como campo de texto/JSON, ativar/desativar)
- [x] 6.3 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 7. Painel de histórico de sincronização

- [x] 7.1 Painel/lista do histórico de sincronização (status, contadores de processados/sucesso/falha, detalhes do erro), com filtro por status, acessível a partir da tela de gestão de integrações
- [x] 7.2 Ação de "reprocessar" em cada linha de histórico com status de falha, desabilitada enquanto a ação está em andamento (design.md - Risks); mensagem de sucesso indicando que a nova tentativa foi agendada
- [x] 7.3 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 8. Verificação final

- [x] 8.1 Revisar o checklist de qualidade da seção 9 do `sysgov-module-scaffolding` para as tabelas/colunas novas desta mudança: `tenant_id` + índice composto (ok, `PessoaIntegracao`/`PessoaSyncLog` já usam `TenantAware`), cifragem de PII (ok, `cpf` em `PessoaSyncLog` e `api_token` em `PessoaIntegracao`, ambos `encrypted`), `AuditLogger` em toda mutação de integração (ok, `store`/`update` de `IntegracaoController`), autorização server-side via `AutorizaPermissao` (ok, `IntegracaoController`/`SyncLogController`), rotas via `RouteServiceProvider` do módulo (ok, adicionadas ao `Routes/api.php` já registrado), contrato isolado no SDK (ok, `packages/sdk/src/modules/pessoas`)
- [x] 8.2 Confirmar manualmente (ou via teste) que nenhuma integração pré-existente ficou órfã após a migração do cast `encrypted` em `api_token` (design.md - Risks): `SELECT count(*) FROM pessoas_integracoes` no ambiente de destino antes de aplicar a migração — confirmado 0 registros no banco de desenvolvimento real (`docker compose exec mysql`)
