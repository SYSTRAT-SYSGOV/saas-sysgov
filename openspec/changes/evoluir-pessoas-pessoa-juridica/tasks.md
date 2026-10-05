# Tasks

## 1. Migrations de banco (tipo, campos de jurídica, unicidade, quadro societário)

- [x] 1.1 Criar migration renomeando `cpf`→`documento` e `cpf_hash`→`documento_hash` em `pessoas` via `renameColumn()` e verificar com `php artisan migrate` seguido de `php artisan migrate:rollback` sem erro em SQLite e MySQL local
- [x] 1.2 Criar migration adicionando `tipo` (`string`/enum, `NOT NULL DEFAULT 'fisica'`) e verificar, via tinker ou teste, que registros pré-existentes (seed) ficam com `tipo='fisica'` após a migração, sem necessidade de UPDATE manual
- [x] 1.3 Criar migration adicionando colunas de jurídica nullable (`razao_social`, `nome_fantasia`, `inscricao_estadual`, `inscricao_municipal`, `porte`, `natureza_juridica`, `responsavel_id` FK nullable → `pessoas.id`) e verificar `php artisan migrate` limpo
- [x] 1.4 Criar migration que remove o unique antigo `(tenant_id, cpf_hash)`, roda a checagem defensiva de duplicidade por `(tenant_id, tipo, documento_hash)` (aborta com exceção clara se encontrar duplicidade) e cria o novo unique composto — verificar com teste de migração que popula duplicatas propositais em `cpf_hash` sob tipos diferentes e confirma que a migração NÃO aborta (porque tipo as diferencia), e outro caso que insere duplicata real no mesmo tipo e confirma abort
- [x] 1.5 Criar migration da tabela `pessoa_socios` (`id`, `tenant_id`, `pessoa_id`, `socio_pessoa_id`, `percentual_participacao` nullable, `papel`, `data_entrada`, `data_saida` nullable, timestamps, soft deletes) e verificar `php artisan migrate` limpo, sem índice único de banco em `(pessoa_id, socio_pessoa_id)` (ver design.md Decisão 7)

## 2. Suporte a documento (CPF/CNPJ) e model Pessoa

- [x] 2.1 Estender `Support\Documento` com validação de dígitos verificadores de CNPJ (`valido(string $valor, string $tipo)`) e máscara por contagem de dígitos (`mascarar()`), e escrever `Tests/Unit` (ou `Feature`) cobrindo CNPJ válido, CNPJ inválido, CPF válido, CPF inválido e a máscara de cada um — verificar com `vendor/bin/phpunit --filter Documento`
- [x] 2.2 Atualizar `Models\Pessoa`: renomear casts/accessors (`documento` encrypted, `documento_hash`), `$appends` com `documento_mascarado` e alias `cpf_mascarado` (mesmo valor), `booted()` calculando `documento_hash` a partir de `documento`, nova relação `socios()` (`hasMany PessoaSocio`) e `responsavel()` (`belongsTo Pessoa`) — verificar com `vendor/bin/phpunit Modules/Pessoas/Tests/Feature/PessoaTest.php`
- [x] 2.3 Criar `Models\PessoaSocio` (`TenantAware`, `SoftDeletes`, relações `pessoa()` e `socio()` para `Pessoa`) e factory correspondente — verificar com um teste de feature mínimo criando um sócio via factory

## 3. Validação condicional por tipo (Form Requests)

- [x] 3.1 Atualizar `StorePessoaRequest`/`UpdatePessoaRequest`: campo `tipo` obrigatório, ramificação de regras (física: `nome`+`cpf`; jurídica: `razao_social`+`cnpj`, demais campos opcionais), unicidade por `(tenant_id, tipo, documento_hash)` ignorando o próprio registro no update, mensagens pt-BR específicas por tipo — verificar com `vendor/bin/phpunit --filter PessoaControllerTest`
- [x] 3.2 Adicionar teste cobrindo: CNPJ inválido rejeitado (422, nenhum registro criado), razão social ausente rejeitada, CNPJ duplicado no mesmo tenant rejeitado, mesmo CNPJ em tenants diferentes aceito, CPF e CNPJ com mesmos dígitos numéricos nunca colidem — novo arquivo `Tests/Feature/PessoaJuridicaValidacaoTest.php`, verificar com `vendor/bin/phpunit --filter PessoaJuridicaValidacaoTest`

## 4. Quadro societário (service, requests, rotas)

- [x] 4.1 Criar `Services\SocioService` (`adicionar`, `atualizar`, `encerrar`) validando, dentro de `DB::transaction`: sócio deve ser `tipo=fisica` do mesmo tenant, pessoa jurídica não pode ser sócia de si mesma, e nenhum vínculo ativo duplicado para o mesmo par — registrando auditoria via `AuditLogger` em cada mutação
- [x] 4.2 Criar `Http\Requests\{Store,Update,Encerrar}SocioRequest` e `Http\Resources\PessoaSocioResource`, e adicionar métodos `storeSocio`/`updateSocio`/`encerrarSocio` em `PessoaController` com `$this->authorize('update', $pessoa)` (mesma permissão de vínculos/documentos)
- [x] 4.3 Registrar rotas `POST /{pessoa}/socios`, `PUT /{pessoa}/socios/{socio}`, `POST /{pessoa}/socios/{socio}/encerrar` em `Routes/api.php` e incluir `socios` via `whenLoaded` em `PessoaResource`
- [x] 4.4 Criar `Tests/Feature/QuadroSocietarioTest.php` cobrindo: sócio pessoa física adicionado com sucesso, pessoa jurídica rejeitada como sócia, sócia de outro tenant rejeitada, jurídica não pode ser sócia de si mesma, encerramento de sócio preserva histórico, e cada mutação registrada em `audit_logs` — verificar com `vendor/bin/phpunit --filter QuadroSocietarioTest`

## 5. Vínculos ampliados e bloqueio de promoção

- [x] 5.1 Adicionar `fornecedor`, `contratada`, `concessionaria`, `permissionaria`, `credenciada` a `PessoaVinculo::TIPOS`, mantendo os tipos de física existentes — verificar com teste estendendo `Tests/Feature/PessoaVinculoTest.php` cobrindo um vínculo `fornecedor` em pessoa jurídica
- [x] 5.2 Bloquear promoção de jurídica em `PessoaPolicy::promote()` (retorna `false`) e em `PromocaoUsuarioService::promover()` (lança `RegraNegocioException` com mensagem clara) — estender `Tests/Feature/PromocaoUsuarioTest.php` e `PromocaoControllerTest.php` com o caso "jurídica não promovível", verificando HTTP 403/422 e que nenhuma conta é criada

## 6. Importação, exportação e busca tipo-aware

- [x] 6.1 Atualizar `ImportacaoPessoaService::importar()` para aceitar `tipo` e `cnpj` nos dados externos, validar com `Documento::valido($documento, $tipo)` e deduplicar por `(tenant_id, tipo, documento_hash)` — estender `Tests/Feature/ImportacaoPessoaTest.php` com o caso de importação de jurídica por CNPJ
- [x] 6.2 Atualizar `PessoaExportService` (`exportJson`/`exportCsv`/`pessoaParaExport`) para incluir `tipo` e campos de jurídica como colunas adicionais ao final (sem reordenar colunas existentes, ver design.md Risco) — estender `Tests/Feature/PessoaExportTest.php` verificando que uma pessoa jurídica aparece corretamente nos dois formatos
- [x] 6.3 Atualizar `PessoaService::listar()` para aceitar filtro `tipo` e buscar por CNPJ (14 dígitos) e razão social, mantendo o comportamento atual de busca por CPF/nome inalterado — estender `Tests/Feature/CpfUnicidadeEBuscaTest.php` (ou criar `PessoaJuridicaBuscaTest.php`) cobrindo busca por CNPJ formatado e por trecho de razão social
- [x] 6.4 Atualizar `PessoaResource` (`compact` e completo) para devolver documento mascarado dinâmico (`documento_mascarado` + alias `cpf_mascarado`) e, no modo `compact`, `nome` resolvido para `razao_social` quando `tipo=juridica` (ver design.md Decisão 6) — estender `Tests/Feature/PessoaControllerTest.php` verificando que a listagem compacta de uma jurídica devolve a razão social em `nome`

## 7. SDK (@sysgov/sdk)

- [x] 7.1 Atualizar `packages/sdk/src/modules/pessoas/types.ts`: `Pessoa` ganha `tipo`, `razao_social`, `nome_fantasia`, `inscricao_estadual`, `inscricao_municipal`, `porte`, `natureza_juridica`, `responsavel_id`, `socios?`; nova interface `PessoaSocio`; `TipoVinculoPessoa` ampliado com os 5 tipos jurídicos; `CreatePessoaInput`/`UpdatePessoaInput` com `tipo` e `cnpj` opcionais — verificar com `npm run typecheck -w @sysgov/sdk`
- [x] 7.2 Atualizar `packages/sdk/src/modules/pessoas/client.ts` com `listarSocios`, `adicionarSocio`, `atualizarSocio`, `encerrarSocio` — verificar com `npm run typecheck -w @sysgov/sdk` e `npm test -w @sysgov/sdk` (se houver suíte)

## 8. Frontend cliente (apps/web-client/src/modules/pessoas)

- [x] 8.1 Adicionar ao `NovaPessoaWizard` um primeiro passo de seleção de tipo (física/jurídica) que ramifica os campos seguintes (razão social, nome fantasia, CNPJ, inscrições, porte, natureza jurídica, responsável para jurídica) — verificar com teste de componente cobrindo os dois fluxos (ex.: estender `__tests__/PessoasComponentesMdm.test.tsx`)
- [x] 8.2 Adicionar seção de quadro societário em `PessoaDetailView` para pessoas com `tipo=juridica`, reutilizando `usePessoaPicker`/`PessoaPicker` (já compatível por backend, ver design.md Decisão 6) para selecionar sócios — verificar com teste de componente exercitando adicionar/encerrar um sócio
- [x] 8.3 Adicionar coluna "Tipo" e filtro por tipo em `PessoasListView`, e exibir identificador mascarado dinâmico — verificar com teste de componente da listagem
- [x] 8.4 Atualizar `apps/web-client/src/modules/pessoas/api.ts` e hooks (`usePessoas`, `useSubEntidades`) com os novos campos/métodos de sócio — verificar com `npm run typecheck -w apps/web-client` e `npm test -w apps/web-client`

## 9. Isolamento de tenant e regressão final

- [x] 9.1 Estender `Tests/Feature/TenantIsolationTest.php` cobrindo: CNPJ duplicado rejeitado no mesmo tenant, mesmo CNPJ aceito em tenants diferentes, CPF e CNPJ com dígitos idênticos nunca colidem (mesmo tenant e tenants diferentes), sócio de outro tenant rejeitado — verificar com `vendor/bin/phpunit --filter TenantIsolationTest`
- [x] 9.2 Rodar a suíte completa do backend (`composer test` em `apps/api`) e `composer static` (PHPStan nível 6) sem erros novos
- [x] 9.3 Rodar `npm run typecheck` e `npm test` na raiz do monorepo (cobre SDK, `apps/web-client` e `packages/ui`) sem erros novos, confirmando que os consumidores existentes de `PessoaPicker` em `apps/web-client/src/modules/cemiterios/*` continuam passando sem alteração
- [x] 9.4 Rodar `npm run generate:registry` e confirmar que `moduleRegistry.generated.ts` não precisa de mudança (nenhuma permissão nova foi criada)
