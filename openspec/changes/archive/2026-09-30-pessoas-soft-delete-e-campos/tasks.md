# Tasks

## 1. Exclusão lógica de pessoa

- [x] 1.1 Migration adicionando `$table->softDeletes()` a `pessoas`; `use SoftDeletes` no model `Pessoa`; verificar com teste que `DELETE /api/pessoas/{pessoa}` preenche `deleted_at`, some da listagem/busca padrão e retorna 404 em `GET`/`PUT` subsequentes, mas a linha e todo o histórico relacionado (vínculos, documentos, endereços, contatos, `pessoas_usuarios`) continuam presentes via `DB::table(...)->find(...)` (spec: Requirement "Exclusão lógica de pessoa", Scenario "Exclusão preserva o histórico")
- [x] 1.2 Verificar com teste que uma nova pessoa não pode ser cadastrada com o mesmo CPF de uma pessoa já excluída logicamente no mesmo tenant (spec: Scenario "CPF de pessoa excluída continua bloqueado para reuso")

## 2. Campos complementares

- [x] 2.1 Migration adicionando `matricula` (string nullable) a `pessoas_vinculos`; permitir o campo em `PessoaController::storeVinculo`; verificar com teste que um vínculo cadastrado com matrícula a armazena corretamente (spec: Scenario "Matrícula funcional registrada no vínculo")
- [x] 2.2 Migration adicionando `uf_emissao` (string(2) nullable) e `data_emissao` (date nullable) a `pessoas_documentos`; permitir os campos em `PessoaController::storeDocumento`; verificar com teste (spec: Scenario "UF e data de emissão do documento")
- [x] 2.3 Migration adicionando `autoriza_notificacoes` (boolean, default `true`) a `pessoas_contatos`; permitir o campo em `PessoaController::storeContato`; verificar com teste que o valor padrão é `true` quando omitido (spec: Scenario "Consentimento de notificação por contato")

## 3. Qualidade do backend

- [x] 3.1 `phpstan analyse Modules/Pessoas` limpo (0 erros)
- [x] 3.2 Suíte do módulo passando isolada (`vendor/bin/phpunit Modules/Pessoas`) e dentro do boot completo da aplicação junto dos demais módulos, sem regressão nos testes já existentes (em especial os de exclusão, cadastro único de CPF e isolamento por tenant)

## 4. Contrato no SDK

- [x] 4.1 Adicionar `matricula`, `uf_emissao`, `data_emissao` e `autoriza_notificacoes` aos tipos `PessoaVinculo`/`PessoaDocumento`/`PessoaContato` e seus inputs de criação em `packages/sdk/src/modules/pessoas/types.ts`; verificar sem erros de tipo (`CreateDocumentoInput`/`CreateContatoInput` não existem no SDK — `client.ts` nunca expôs `addDocumento`/`addContato` — então só `CreateVinculoInput` e as interfaces de leitura foram atualizadas)

## 5. Frontend

- [x] 5.1 Adicionar os campos `matricula` (vínculo), `uf_emissao`/`data_emissao` (documento) e `autoriza_notificacoes` (contato, switch) aos formulários correspondentes em `apps/web-client/src/modules/pessoas/PessoasModule.tsx` e ao tipo `Pessoa`/`PessoaVinculo`/`PessoaDocumento`/`PessoaContato` locais em `api.ts`
- [x] 5.2 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 6. Verificação final

- [x] 6.1 Confirmar manualmente (ou via teste) que nenhum registro real de `pessoas` seria afetado de forma inesperada pela migração `softDeletes()` (coluna nova nullable, sem exigir backfill) — checagem análoga à já feita para `pessoas_integracoes` na mudança anterior — confirmado 0 registros no banco de desenvolvimento real (`docker compose exec mysql`)
- [x] 6.2 Revisar se algum outro ponto do módulo consulta `Pessoa` via `DB::table('pessoas')` (fora do Eloquent) e portanto precisaria filtrar `deleted_at IS NULL` manualmente — se existir, ajustar; se não, registrar que não existe — nenhum ponto de código de produção faz isso (confirmado via grep); o único uso é o teste novo desta mudança, que consulta deliberadamente sem escopo para provar que o histórico sobrevive
