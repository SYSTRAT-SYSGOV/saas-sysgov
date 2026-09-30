# Tasks

## 1. Scaffold do módulo backend

- [x] 1.1 Executar `php artisan make:module Pessoas` em `apps/api` e verificar que a estrutura padrão foi gerada (`Config/`, `Database/Migrations/`, `Http/`, `Models/`, `Policies/`, `Providers/`, `Routes/api.php`, `Services/`, `Tests/`, `module.json`)
- [x] 1.2 Preencher `module.json` (name, alias `pessoas`, description, priority, `requires: []`, permissões da seção 5.1, menu) e verificar que `php artisan module:register Pessoas` roda sem erro

## 2. Modelo de dados

- [x] 2.1 Migration da tabela `pessoas` (`tenant_id`, `cpf` cifrado + hash para unicidade, `nome`, `nome_social`, `data_nascimento`, `sexo`, `nome_mae` cifrado, `nome_pai`, `estado_civil`, `nacionalidade`, `naturalidade`, `nis` cifrado, `status`, `unique(tenant_id, cpf_hash)`) e model `Pessoa` com `TenantAware`; verificar com teste de feature que cadastrar CPF duplicado no mesmo tenant retorna erro de unicidade (spec: Requirement "Cadastro único de pessoa física por tenant")
- [x] 2.2 Migration da tabela `pessoas_vinculos` (`pessoa_id`, `tipo_vinculo` enum, `dados` json, `inicio`, `fim`) e model `PessoaVinculo`; verificar com teste que uma pessoa pode acumular dois vínculos sem duplicar o cadastro e que encerrar um vínculo grava `fim` sem excluir o registro (spec: Scenarios "Múltiplos vínculos" e "Vínculo com vigência")
- [x] 2.3 Migration da tabela `pessoas_documentos` (`pessoa_id`, `tipo` enum `rg|cnh|titulo_eleitor`, `numero`, `orgao_emissor`) e model `PessoaDocumento`; verificar com teste que uma pessoa admite múltiplos documentos
- [x] 2.4 Migration da tabela `pessoas_enderecos` (`pessoa_id`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `tipo_endereco`) e model `PessoaEndereco`; verificar com teste que uma pessoa admite múltiplos endereços sem sobrescrever o anterior
- [x] 2.5 Migration da tabela `pessoas_contatos` (`pessoa_id`, `tipo` enum `celular|email|telefone`, `valor`, `principal` boolean) e model `PessoaContato`; verificar com teste que marcar um novo contato como principal desmarca o principal anterior do mesmo tipo (spec: Scenario "Contato principal único por tipo")
- [x] 2.6 Migration da tabela `pessoas_usuarios` (`pessoa_id` único, `user_id` único, `promovido_em`, `promovido_por`) e model `PessoaUsuario`
- [x] 2.7 Teste de isolamento por tenant cobrindo as seis tabelas novas, no molde de `TenantIsolationTest` de outros módulos (glob de `Models/*.php` + `popular()`); verificar com `vendor/bin/phpunit --filter TenantIsolationTest` (spec: Requirement "Isolamento por tenant")

## 3. Serviços de domínio

- [x] 3.1 `PessoaService` (criar, atualizar, listar com busca por nome/CPF e filtros por vínculo/status); verificar com testes cobrindo os Scenarios "Busca por CPF" e "Filtro por tipo de vínculo"
- [x] 3.2 `VinculoService` (adicionar vínculo, encerrar vínculo); verificar com os testes já cobertos na tarefa 2.2
- [x] 3.3 `PromocaoUsuarioService` (localiza a pessoa por CPF, verifica se já existe `pessoas_usuarios` para ela, cria o `User` imediatamente com `password = null` — redefinida no primeiro acesso —, vincula tenant/papel, grava o vínculo `pessoas_usuarios` e audita via `AuditLogger`); verificado com testes de serviço cobrindo "Promoção a usuário" e "Pessoa já promovida" — "Promoção sem permissão" é um cenário de autorização HTTP, verificado na tarefa 5.3 junto do `PromocaoController`
- [x] 3.4 `ImportacaoPessoaService` (valida dígito verificador do CPF recebido, busca por CPF no tenant, atualiza se existir/cria se não existir, nunca cria `pessoas_usuarios`); verificar com testes cobrindo os Scenarios "Importação com deduplicação" e "Importação de pessoa nova"

## 4. Integração externa (importação assíncrona)

- [x] 4.1 Migration + model `PessoaIntegracao` (config por tenant: `driver` fixo `generic_rest`, `api_url`, `api_token`, `field_mappings`, `is_active`, `ultima_sincronizacao_em`), no molde de `Modules\Capd\Models\RhIntegracao`
- [x] 4.2 Migration + model `PessoaSyncLog` (`integracao_id`, `tipo`, `direcao`, `status`, contadores de processados/sucesso/falha, `detalhes`), no molde de `Modules\Capd\Models\RhSyncLog`
- [x] 4.3 `Contracts\PessoaImportAdapterInterface` + `Services\Adapters\GenericHttpPessoaImportAdapter` (HTTP configurável por `field_mappings`); verificar com teste usando `Http::fake()` simulando indisponibilidade, confirmando que a falha é registrada em `PessoaSyncLog` e que nenhuma outra rota do módulo é afetada (spec: Scenario "Sistema externo indisponível")
- [x] 4.4 Endpoint que dispara a importação via `OutboxPublisher` (nunca síncrono no ciclo da requisição) + listener registrado em `Event::listen(OutboxMessage::class, ...)` que consome o evento e chama `ImportacaoPessoaService`; verificar com teste ponta a ponta usando `php artisan outbox:process`

## 5. RBAC e API

- [x] 5.1 Adicionar ao `module.json` as permissões `cadastros.pessoas.view`, `cadastros.pessoas.create`, `cadastros.pessoas.update`, `cadastros.pessoas.delete`, `cadastros.pessoas.promote`, `cadastros.pessoas.import`; verificar que aparecem na listagem de permissões do módulo
- [x] 5.2 `PessoaController` (`index`, `store`, `show`, `update`, `destroy`) usando o trait de autorização já padrão do projeto (`AutorizaPermissao`); verificar com teste cobrindo o Scenario "Edição sem permissão"
- [x] 5.3 `PromocaoController`/`ImportacaoController` expondo as ações de `PromocaoUsuarioService`/`ImportacaoPessoaService`, cada um exigindo sua permissão dedicada (`promote`/`import`); verificar com os testes das tarefas 3.3/3.4 chamados via HTTP
- [x] 5.4 Registrar as rotas em `Routes/api.php` do módulo, sob o grupo padrão do projeto (`auth:sanctum` + `resolve.tenant` + `module-access:pessoas`), nunca em `web.php` global

## 6. Frontend (apps/web-client)

- [x] 6.1 Contrato em `packages/sdk/src/modules/pessoas` (`types.ts`, `client.ts`, `index.ts`), reexportado em `packages/sdk/src/index.ts`; verificar com `npm run typecheck` do pacote `@sysgov/sdk`
- [x] 6.2 Tela de listagem com busca por nome/CPF e filtros por tipo de vínculo e status, usando componentes de `@sysgov/ui` (`DataTable`, `Input`, `Select`)
- [x] 6.3 Formulário de cadastro/edição de pessoa (dados civis, documentos, endereços, contatos), com CPF/RG/NIS em `font-mono tabular-nums`
- [x] 6.4 Tela/painel de gestão de vínculos (adicionar papel, encerrar papel com data de término)
- [x] 6.5 Ação de promoção a usuário (visível apenas com a permissão `cadastros.pessoas.promote`) e ação de importar pessoa por CPF (visível apenas com `cadastros.pessoas.import`)
- [x] 6.6 Executar `npm run generate:registry` (módulo `pessoas` reconhecido automaticamente via descoberta de filesystem, sem edição manual do App Shell) e `npm run typecheck` do `apps/web-client` (limpo); verificação manual navegando no `npm run dev:client` **não realizada** nesta sessão — exigiria credenciais reais de login, fora do alcance de um agente sem acesso à sessão do usuário

## 7. Qualidade e fechamento

- [x] 7.1 `phpstan` limpo em `Modules/Pessoas` (0 erros) e suíte do módulo passando isolada (27/27) e dentro do boot completo da aplicação junto dos demais módulos (Admin, Capd, Cemiterios, Contracts, Finance, Licita, OrgChart, Procurement — sem regressão). A suíte **completa** do monorepo (`composer test`) tem falhas e travamentos por exaustão de memória pré-existentes em módulos não tocados por esta mudança (Cursos, Tests/Feature/Access) — confirmado via `git status` que nenhum arquivo desses módulos foi alterado nesta sessão; fora do escopo desta change corrigir.
- [x] 7.2 Executar `npm run typecheck` no workspace `apps/web-client` sem erros
- [x] 7.3 Revisar item a item o checklist de qualidade da seção 9 do `sysgov-module-scaffolding`: tenant_id + índice composto (ok, 8 tabelas), `TenantAware` (ok, 8 models), centavos inteiros (N/A — sem valores monetários no módulo), `AuditLogger` em toda mutação relevante (ok, incluindo `SincronizacaoPessoaService`), `OutboxPublisher` na importação (ok), autorização server-side em toda escrita via `AutorizaPermissao` (ok — mesmo padrão de `FinanceiroController`/`ConcessaoController` do Cemitérios, que também não usam `Policy` de classe para toda ação), rotas via `RouteServiceProvider` do módulo (ok), contrato isolado no SDK (ok), `font-mono tabular-nums` em dados técnicos (ok, CPF). Exportação de dados: ver 7.4.
- [x] 7.4 Exportação self-service do cadastro (seção 7 do padrão SYSGOV, "exportador construído desde o início"): `PessoaExportService::exportJson()` (com manifest versionado + checksum, no molde de `OrgExportService` do módulo OrgChart) e `exportCsv()`, expostos em `GET /api/pessoas/export?format=json|csv`, gated por `cadastros.pessoas.view`, auditados; testes cobrindo os dois formatos.
