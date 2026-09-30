# Tasks

## 1. Backend: Validação e Form Requests

- [x] 1.1 Criar Form Requests para Pessoa (`StorePessoaRequest`, `UpdatePessoaRequest`) com validação algorítmica de CPF (`Documento::valido`), unicidade restrita ao tenant `(tenant_id, cpf_hash)` com exclusão do próprio registro em atualizações, e verificar com testes unitários de request.
- [x] 1.2 Criar Form Requests para Vínculos (`StoreVinculoRequest`, `EncerrarVinculoRequest`) com validação de tipos permitidos, campos opcionais e consistência cronológica (`inicio <= fim`), verificando rejeição de término anterior ao início via testes de validação.
- [x] 1.3 Criar Form Requests para Sub-Entidades (`StoreDocumentoRequest`, `UpdateDocumentoRequest`, `StoreEnderecoRequest`, `UpdateEnderecoRequest`, `StoreContatoRequest`, `UpdateContatoRequest`) com validação de tipos permitidos, formato de CEP, e-mail/telefone e campos obrigatórios, verificando rejeição de dados inválidos.
- [x] 1.4 Criar Form Requests para Ações Especiais (`PromoverPessoaRequest`, `ImportarPessoaRequest`) validando formato de e-mail, role existente e sanitização do documento informado, verificando cenários de entrada via testes.

## 2. Backend: Serialização e API Resources

- [x] 2.1 Criar `PessoaResource` garantindo que o retorno JSON contenha apenas `cpf_mascarado` e omita estritamente `cpf` e `cpf_hash`, verificando o payload gerado em teste de feature.
- [x] 2.2 Criar `PessoaVinculoResource`, `PessoaDocumentoResource`, `PessoaEnderecoResource` e `PessoaContatoResource` assegurando formatação padronizada de datas, atributos booleanos e relacionamentos, verificando respostas da API.

## 3. Backend: Autorização e PessoaPolicy

- [x] 3.1 Criar `PessoaPolicy` mapeando as permissões `cadastros.pessoas.view`, `cadastros.pessoas.create`, `cadastros.pessoas.update`, `cadastros.pessoas.delete`, `cadastros.pessoas.promote` e `cadastros.pessoas.import`, implementando a regra que proíbe exclusão física de pessoas com vínculos ativos vigentes.
- [x] 3.2 Registrar `PessoaPolicy` no `AuthServiceProvider` do módulo Pessoas e verificar a autorização em testes de integração de controller.

## 4. Backend: Serviços, Rotas e Controllers

- [x] 4.1 Atualizar `PessoaService` para normalizar a busca por CPF (calculando `cpf_hash` para 11 dígitos sanitizados com ou sem máscara) e implementar lógica transacional atômica para garantia de contato principal único por tipo (com promoção automática ao excluir).
- [x] 4.2 Adicionar rotas RESTful PUT e DELETE para documentos, endereços e contatos em `apps/api/Modules/Pessoas/Routes/api.php` (`/{pessoa}/documentos/{documento}`, `/{pessoa}/enderecos/{endereco}`, `/{pessoa}/contatos/{contato}`).
- [x] 4.3 Atualizar `PessoaController` para injetar os novos Form Requests e retornar API Resources, incluindo os novos métodos de update e destroy de sub-entidades com registro sistemático de auditoria via `AuditLogger`.
- [x] 4.4 Atualizar `PromocaoController` e `ImportacaoController` para utilizar os Form Requests dedicados, verificar autorização via Policy e registrar as mutações em `audit_logs`.
- [x] 4.5 Criar Factories e Seeders (`PessoaFactory`, `PessoaVinculoFactory`, `PessoaDocumentoFactory`, `PessoaEnderecoFactory`, `PessoaContatoFactory`, `PessoasDatabaseSeeder`) e verificar execução sem erros via `php artisan db:seed --class=PessoasDatabaseSeeder`.

## 5. Backend: Migrations e Integração MDM Satélite

- [x] 5.1 Criar migration em `Modules/Cemiterios` adicionando a coluna `pessoa_id` (nullable foreignId com índice composto `[tenant_id, pessoa_id]`) na tabela `operadores_cemiterios` e verificar migração via `php artisan migrate`.
- [x] 5.2 Atualizar o model `OperadorCemiterio` e o serviço `OperadorCemiterioService` para suportar `pessoa_id`, verificando criação e vínculo de operador com pessoa por teste de feature.
- [x] 5.3 Criar migrations preparatórias adicionando `pessoa_id` nullable nas tabelas satélites dos módulos RH, Finance e Protocolo, verificando integridade das constraints e índices.

## 6. SDK TypeScript (@sysgov/sdk)

- [x] 6.1 Atualizar `packages/sdk/src/modules/pessoas/types.ts` com interfaces para alteração/exclusão de documentos, endereços e contatos, e tipagens de consulta por documento.
- [x] 6.2 Atualizar `packages/sdk/src/modules/pessoas/client.ts` adicionando os métodos `updateDocumento`, `deleteDocumento`, `updateEndereco`, `deleteEndereco`, `updateContato`, `deleteContato` e `buscarPorDocumento`.
- [x] 6.3 Executar build e verificação de tipos no pacote `@sysgov/sdk` via `pnpm --filter @sysgov/sdk build` (ou `npm run build`), garantindo zero erros de tipagem.

## 7. Frontend: Decomposição e Telas (Web-Client)

- [x] 7.1 Criar custom hooks em `apps/web-client/src/modules/pessoas/hooks/` (`usePessoas.ts`, `useVinculos.ts`, `useSubEntidades.ts`) gerenciando estados e chamadas assíncronas.
- [x] 7.2 Atualizar `apps/web-client/src/modules/pessoas/api.ts` com as funções de atualização e exclusão de documentos, endereços e contatos.
- [x] 7.3 Decompor `PessoasModule.tsx` criando views especializadas em `apps/web-client/src/modules/pessoas/views/` (`PessoasListView.tsx`, `PessoaDetailView.tsx`, `SubEntidadesManager.tsx`) consumindo componentes de `@sysgov/ui` e `font-mono tabular-nums` para dados técnicos.
- [x] 7.4 Implementar formulários de edição e confirmação de exclusão para documentos, endereços e contatos com feedback visual e tratamento de contato principal.
- [x] 7.5 Executar verificação estática do frontend com `tsc --noEmit` em `apps/web-client`, garantindo ausência de erros de compilação.

## 8. Testes, Auditoria e Validação Geral

- [x] 8.1 Escrever testes automatizados de feature para unicidade de CPF por tenant, isolamento multi-tenant e busca normalizada com máscara via `Documento::hash`.
- [x] 8.2 Escrever testes automatizados para a trava de exclusão de pessoa com vínculos ativos via `PessoaPolicy` e soft delete.
- [x] 8.3 Escrever testes automatizados para a regra de contato principal único por tipo na criação, atualização e exclusão atômica.
- [x] 8.4 Escrever testes automatizados validando o enfileiramento assíncrono de importação (sem bloqueio no ciclo síncrono HTTP) e logs em `PessoaSyncLog`.
- [x] 8.5 Executar a suíte de testes do módulo Pessoas (`php artisan test --filter=Pessoas`) e análise estática PHPStan garantindo aprovação total.
