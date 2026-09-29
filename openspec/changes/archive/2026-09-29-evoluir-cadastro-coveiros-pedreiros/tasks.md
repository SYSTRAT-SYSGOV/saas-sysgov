# Tasks

## 1. Backend — Migrations e Models

- [x] 1.1 Criar migration aditiva em `cemetery_operators`: `park_id` (FK nullable para `cemetery_parks`), `aso_validade` (date nullable), `epi_ultimo_registro` (date nullable), e converter `cpf_cnpj` para suportar valor criptografado (ajuste de tamanho de coluna se necessário) — verificar com `php artisan migrate` e `migrate:status` verdes
- [x] 1.2 Criar migration `create_cemetery_operator_licenses_table`: `tenant_id`, `operator_id` (FK `cemetery_operators`), `numero`, `validade` (date), `arquivo` (path nullable), `hash` (SHA-256 nullable), timestamps — índice composto `(tenant_id, operator_id, validade)`
- [x] 1.3 Criar migration `create_cemetery_operator_penalties_table`: `tenant_id`, `operator_id` (FK), `tipo` (advertencia\|suspensao\|descredenciamento), `inicio` (date), `fim` (date nullable), `motivo` (text), `arquivo` (path nullable), timestamps — índice `(tenant_id, operator_id, fim)`
- [x] 1.4 Criar migration aditiva em `inumacoes`: `coveiro_id`/`pedreiro_id` (FK nullable para `cemetery_operators`, `nullOnDelete`), mantendo `coveiro_nome`/`pedreiro_nome` intactos
- [x] 1.5 Migration de dados (idempotente, dentro de transação por tenant): criptografar `cpf_cnpj` existente via cast `encrypted` e recalcular `documento_hash`; para cada operador com `alvara_numero`/`alvara_validade` preenchidos, criar a primeira linha em `cemetery_operator_licenses` — verificar com teste dedicado (§7) que nenhum dado de alvará existente é perdido
- [x] 1.6 Atualizar `Modules\Cemiterios\Models\OperadorCemiterio`: `cpf_cnpj` como `encrypted` + `hidden`, `documento_mascarado` via `Documento::mascarar()` (mesmo padrão de `Empreiteiro`), relações `licencas()`, `penalidades()`, `park()`
- [x] 1.7 Criar Model `OperadorLicenca` (`cemetery_operator_licenses`) com `TenantAware`, cast `validade` => date, relação `operador()`
- [x] 1.8 Criar Model `OperadorPenalidade` (`cemetery_operator_penalties`) com `TenantAware`, casts `inicio`/`fim` => date, relação `operador()`, método `estaVigente(): bool`
- [x] 1.9 Atualizar `Modules\Cemiterios\Models\Inumacao`: adicionar `coveiro_id`/`pedreiro_id` aos `$casts`/relações (`belongsTo(OperadorCemiterio::class)`), sem remover `coveiro_nome`/`pedreiro_nome`

## 2. Backend — Serviços e Regras de Negócio

- [x] 2.1 Criar `OperadorCemiterioService` com `cadastrar(dados)`, `atualizar(operador, dados)`, `credenciar(operador, dados, ?arquivo)` (cria `OperadorLicenca`, calcula hash se houver arquivo), `sancionar(operador, dados, ?arquivo)` (cria `OperadorPenalidade`), `credenciamentoVigente(operador)`, `statusCredenciamento(operador)` (válido\|a_vencer\|vencido\|sem_credenciamento)
- [x] 2.2 Implementar `OperadorCemiterioService::validarDisponibilidade(operador)`: lança `RegraNegocioException` (422) se houver `OperadorPenalidade` de suspensão vigente ou de descredenciamento sem override explícito; suspensão aceita override com usuário `cemiterios.cadastros.manage` e justificativa obrigatória, registrado em auditoria
- [x] 2.3 Adicionar validação de saúde ocupacional a `OperadorCemiterioService`: `statusSaudeOcupacional(operador)` (válido\|a_vencer\|vencido) para `aso_validade`, mesma janela de 30 dias do credenciamento
- [x] 2.4 Atualizar os pontos de criação de `Inumacao` que recebem `coveiro_id`/`pedreiro_id` (`OperacaoService::inumar()`/`OperacaoController::update()`) para chamar `validarDisponibilidade()` antes de persistir o vínculo — `AlvaraObra` (`Empreiteiro`) não recebeu `coveiro_id`/`pedreiro_id` na migração 1.4 (é o cadastro de outro ator, sem coluna de operador), então não se aplica
- [x] 2.5 `Documento` (`Modules\Cemiterios\Support\Documento`) já é reaproveitado sem duplicação por `OperadorCemiterio`/`OperadorCemiterioService`/`CriptografarDocumentosOperadores` (mesmo padrão de `Empreiteiro`) — nenhuma alteração necessária

## 3. Backend — Controllers, Requests e Rotas

- [x] 3.1 Criar Form Requests `CadastrarOperadorRequest`, `AtualizarOperadorRequest`, `CredenciarOperadorRequest` (upload de arquivo + número + validade), `SancionarOperadorRequest` (tipo + motivo + início/fim + arquivo opcional)
- [x] 3.2 Atualizar `OperadorCemiterioController::index()` para aceitar filtro `park_id` e `status_saude_ocupacional`, e expor `documento_mascarado` em vez de `cpf_cnpj`
- [x] 3.3 Atualizar `store()`/`update()` do controller para delegar a `OperadorCemiterioService`, mantendo compatibilidade de payload atual (`alvara_numero`/`alvara_validade` no corpo continuam aceitos e viram o primeiro credenciamento)
- [x] 3.4 Criar `OperadorLicencaController` com `store()` (novo credenciamento + upload) e `index()` (histórico de credenciamentos do operador)
- [x] 3.5 Criar `OperadorPenalidadeController` com `store()` (nova sanção) e `index()` (histórico de sanções do operador)
- [x] 3.6 Atualizar `OperadorCemiterioController::historico()` para consultar por `coveiro_id`/`pedreiro_id` com fallback para o casamento por nome nos registros legados (design.md - Decisão 5)
- [x] 3.7 Registrar as novas rotas em `Modules/Cemiterios/Routes/api.php`: `POST/GET /operadores/{id}/licencas`, `POST/GET /operadores/{id}/penalidades`, com os mesmos middlewares (`auth:sanctum`, `tenant.resolve`, `module-access:cemiterios`)
- [x] 3.8 Aplicar `cemiterios.cadastros.view` em todos os endpoints de leitura (`index`, `show`, `historico`, `licencas.index`, `penalidades.index`) e manter `cemiterios.cadastros.manage` nos de escrita

## 4. Backend — Configuração, Permissões e Seed

- [x] 4.1 Adicionar permissão `cemiterios.cadastros.view` ao `module.json` (`"Visualizar cadastro de coveiros e pedreiros credenciados"`)
- [x] 4.2 Atualizar `CemiteriosRbacSeeder` para conceder `cemiterios.cadastros.view` a todo papel que já possua `cemiterios.cadastros.manage`
- [x] 4.3 Adicionar config `cemiterios.saude_ocupacional` em `Modules/Cemiterios/Config/config.php` com `aso_periodicidade_dias` e `requisitos_legais` (placeholder `[REQUISITOS DE SAÚDE OCUPACIONAL — CONFIRMAR LEGISLAÇÃO MUNICIPAL]`, mesmo padrão de `base_legal` da sucessão hereditária)

## 5. Frontend — Tipos e API (`apps/web-client/src/modules/cemiterios/api.ts`)

- [x] 5.1 Atualizar o tipo `OperadorCemiterio`: remover `cpf_cnpj` cru, adicionar `documento_mascarado`, `park_id`, `aso_validade`, `epi_ultimo_registro`, `status_saude_ocupacional`
- [x] 5.2 Adicionar tipos `OperadorLicenca` e `OperadorPenalidade` espelhando os novos modelos
- [x] 5.3 Adicionar métodos em `cemiteriosApi`: `credenciarOperador(id, dados, arquivo)`, `licencasOperador(id)`, `sancionarOperador(id, dados, arquivo)`, `penalidadesOperador(id)`; atualizar `operadores()` para aceitar filtro `park_id`
- [x] 5.4 Rodar `tsc --noEmit` em `apps/web-client` e garantir compilação limpa (0 erros)

## 6. Frontend — Componentes e Views

- [x] 6.1 Atualizar `OperadoresView.tsx`: filtro por necrópole ativa (reaproveitando `useCemiteriosNavigation`), indicador de saúde ocupacional nos cards de resumo, `documento_mascarado` em vez de `cpf_cnpj`
- [x] 6.2 Criar componente `HistoricoCredenciamentoOperador.tsx` (drawer/modal com `DataTable` ou lista, seguindo o padrão de `HistoricoTimeline`): lista de credenciamentos, upload de novo alvará com arquivo
- [x] 6.3 Criar componente `SancoesOperador.tsx`: lista de sanções aplicadas, formulário de nova sanção (tipo, motivo, período, anexo opcional) restrito a `cemiterios.cadastros.manage`
- [x] 6.4 Atualizar o modal de cadastro/edição de operador para incluir `park_id` (select de necrópole) e os campos de saúde ocupacional (`aso_validade`, `epi_ultimo_registro`)
- [x] 6.5 Atualizar o formulário de nova inumação (`ModalNovaInumacao.tsx`) que hoje pedia `coveiro_nome`/`pedreiro_nome` em texto livre, para oferecer autocomplete sobre operadores cadastrados (preenchendo `coveiro_id`/`pedreiro_id`), mantendo o texto livre como alternativa quando nenhum corresponder
- [x] 6.6 Exibir mensagem de bloqueio quando a API rejeitar a vinculação de um operador sancionado (RegraNegocioException 422 `operador.suspenso`), com a opção de override para suspensão quando o usuário tiver `cemiterios.cadastros.manage`

## 7. Testes — Backend

- [x] 7.1 Criar `OperadorCemiterioServiceTest`: credenciamento (histórico preservado, cálculo do vigente), sanção (advertência/suspensão/descredenciamento), `validarDisponibilidade` (bloqueio de suspenso/descredenciado, override de suspensão auditado)
- [x] 7.2 Criar teste da migration de dados: operador pré-existente com `alvara_numero`/`alvara_validade` preenchidos gera exatamente um `OperadorLicenca` após a migração, sem perda de dado (`test_migracao_de_dados_preserva_alvara_existente_e_e_idempotente`)
- [x] 7.3 Criar teste de criptografia: `cpf_cnpj` nunca aparece em texto puro na resposta de `index`/`show`/`update`; busca por `documento_hash` continua localizando o operador correto (`test_documento_nunca_aparece_em_texto_puro_e_busca_por_hash_funciona`)
- [x] 7.4 Atualizar `OperadoresTest.php`: cobrir filtro por `park_id`, endpoints de credenciamento e sanção, `historico()` com vínculo por `coveiro_id` e fallback por nome coexistindo
- [x] 7.5 Isolamento multi-tenant de `cemetery_operator_licenses`/`cemetery_operator_penalties` já é coberto pela descoberta automática de `TenantIsolationTest::modelos()` (todas as classes em `Models/`); `popular()` foi ajustado para também criar `OperadorLicenca`/`OperadorPenalidade` no tenant A
- [x] 7.6 Criar teste de permissão: usuário só com `cemiterios.cadastros.view` lista mas não cadastra/credencia/sanciona; usuário sem nenhuma das duas permissões recebe 403
- [x] 7.7 `vendor/bin/phpunit Modules/Cemiterios/Tests/Feature` → 206 testes OK; `composer static` (PHPStan) → 0 erros

## 8. Testes — Frontend

- [x] 8.1 Atualizar/criar `OperadoresView.test.tsx`: filtro por necrópole, exibição de `documento_mascarado`, indicador de saúde ocupacional
- [x] 8.2 Criar `HistoricoCredenciamentoOperador.test.tsx`: listagem do histórico, upload de novo credenciamento
- [x] 8.3 Criar `SancoesOperador.test.tsx`: registro de sanção, exibição de sanção vigente vs. histórica
- [x] 8.4 `npx vitest run src/modules/cemiterios` → 37 arquivos / 175 testes OK; `tsc --noEmit` → 0 erros

## 9. Documentação

- [x] 9.1 Criar `docs/modules/cadastro-coveiros-pedreiros.md` (mesmo formato de `docs/modules/sucessao-hereditaria.md`): modelo de dados, regras de negócio, endpoints, permissões, e a pergunta em aberto de saúde ocupacional documentada para confirmação junto à Prefeitura de Araucária/PR
