# Tasks

## 1. Banco de Dados e Model de Pessoas

- [x] 1.1 Criar migration para adicionar colunas de óbito na tabela `pessoas` (`falecido`, `data_falecimento`, `certidao_obito_numero`, `cartorio_obito`, `observacao_obito`) e verificar execução sem erros no MySQL
- [x] 1.2 Atualizar model `Pessoa.php` adicionando atributos no phpdoc, `$casts`, escopos e lógica de consistência vital
- [x] 1.3 Atualizar `PessoaRequest.php` e `PessoaResource.php` para validar e expor os atributos de situação vital
- [x] 1.4 Atualizar `PessoaService.php` para persistir dados de óbito e incluir `falecido` e `data_falecimento` nos resultados compactos (`buscarCompacto`)

## 2. Sincronização no Módulo de Cemitérios

- [x] 2.1 Atualizar `ConcessaoController.php` para propagar automaticamente o óbito (`falecido = true`, `data_falecimento`) para o registro de `Pessoa` vinculado ao salvar titular concessionário
- [x] 2.2 Atualizar serviços/models de falecimento de cemitério (`Falecido.php` e endpoints relacionados) para refletir óbito no MDM caso haja `pessoa_id`
- [x] 2.3 Implementar testes de feature no PHPUnit cobrindo a sincronização de falecimento de titular para a model `Pessoa`

## 3. Interfaces de Usuário do MDM (Pessoas) e Componentes Compartilhados

- [x] 3.1 Atualizar tipagens TypeScript em `apps/web-client/src/modules/pessoas/api.ts` e contratos do `@sysgov/ui` para incluir campos de óbito
- [x] 3.2 Atualizar `packages/ui/src/components/PessoaPicker.tsx` para exibir badge de óbito no dropdown e repassar dados vitais na seleção
- [x] 3.3 Atualizar `packages/ui/src/components/PessoaCard.tsx` e `apps/web-client/src/modules/pessoas/views/PessoasListView.tsx` com badges de falecimento
- [x] 3.4 Atualizar `packages/ui/src/components/PessoaFormModal.tsx`, `NovaPessoaWizard.tsx` e `PessoaDetailView.tsx` com a seção "Situação Vital / Óbito"

## 4. Integração no Módulo Cemitério (Inventário & Concessões)

- [x] 4.1 Atualizar `ModalDetalheJazigo.tsx` para pré-marcar `titular_falecido: true` e preencher a data de falecimento ao selecionar pessoa já falecida no `PessoaPicker`
- [x] 4.2 Executar testes unitários e de integração (`phpunit`, `vitest`), checagem de tipos (`tsc`) e validação de consistência via `openspec validate`
