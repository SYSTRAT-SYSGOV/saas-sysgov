# Tasks

## 1. Backend: Filtros Avançados na Listagem

- [x] 1.1 Em `PessoaController::index()` (`apps/api/Modules/Pessoas/Http/Controllers/PessoaController.php`), incluir `falecido`, `data_nascimento_de`, `data_nascimento_ate` e `sexo` em `$request->only([...])` repassado a `PessoaService::listar()`
- [x] 1.2 Em `PessoaService::listar()` (`apps/api/Modules/Pessoas/Services/PessoaService.php`), adicionar `->when($filtros['data_nascimento_de'] ?? null, ...)`, `->when($filtros['data_nascimento_ate'] ?? null, ...)` (faixa inclusiva sobre `data_nascimento`) e `->when($filtros['sexo'] ?? null, fn ($q, $sexo) => $q->where('sexo', $sexo))`; atualizar a docblock `@param array{...}` do método com as novas chaves
- [x] 1.3 Adicionar/estender teste de feature em `PessoaControllerTest.php` (`apps/api/Modules/Pessoas/Tests/Feature/PessoaControllerTest.php`) cobrindo: filtro por `falecido=1`, filtro por faixa de `data_nascimento`, filtro por `sexo`, e os três combinados simultaneamente — e verificar com `vendor/bin/phpunit --filter PessoaControllerTest`

## 2. Frontend: Barra de Filtros Avançados

- [x] 2.1 Criar `views/FiltrosAvancadosPessoas.tsx` em `apps/web-client/src/modules/pessoas/`, no mesmo formato de `apps/web-client/src/modules/cemiterios/views/operacoes/FiltrosAvancadosOperacoes.tsx` (grid responsivo, contador de "filtros ativos", botão "Limpar filtros"), com campos: busca textual, tipo de vínculo, status, situação vital (falecido/vivo/todos), sexo, e faixa de data de nascimento (dois `<input type="date">`)
- [x] 2.2 Em `hooks/usePessoas.ts`, adicionar estados `falecido`, `sexo`, `dataNascimentoDe`, `dataNascimentoAte` e incluí-los nos parâmetros passados para `pessoasApi.listar()`
- [x] 2.3 Em `views/PessoasListView.tsx`, substituir a barra de filtros inline atual (linhas 144-164) pelo novo `FiltrosAvancadosPessoas`, conectado aos novos estados de `usePessoas`
- [x] 2.4 Atualizar/criar teste de componente cobrindo a aplicação de pelo menos dois filtros avançados combinados e a limpeza de filtros, e verificar com `npm run test --workspace=apps/web-client`

## 3. Frontend: Recursos do DataTable na Listagem

- [x] 3.1 Em `views/PessoasListView.tsx`, habilitar `searchable`, `exportable` (com `exportFileName="pessoas"`) e `fixedLayout` no `<DataTable>` existente, definindo `size` para cada `ColumnDef` já declarado em `colunas` (nome, cpf, vinculos, status, acoes) para não gerar rolagem horizontal
- [x] 3.2 Adicionar `meta.exportValue` (e `meta.sortValue` quando o valor de ordenação divergir do valor exportado) às colunas `nome`, `cpf` e `status` em `colunas` (`views/PessoasListView.tsx`), habilitando ordenação por cabeçalho e exportação CSV/XLSX/PDF dessas colunas
- [x] 3.3 Verificar manualmente (ou via teste de componente) que clicar nos cabeçalhos de Nome, CPF e Status ordena a grade, e que o menu "Exportar" gera CSV/XLSX/PDF apenas com as linhas filtradas

## 4. Frontend: Importação Manual em Massa

- [x] 4.1 Criar `views/ModalImportadorPessoas.tsx` em `apps/web-client/src/modules/pessoas/`, no mesmo formato de `apps/web-client/src/modules/cemiterios/views/ModalImportadorJazigos.tsx`: botão de download de modelo CSV (colunas `nome,cpf,nome_social,data_nascimento,sexo,nis`), upload de arquivo, parsing e validação local (nome e CPF obrigatórios, CPF duplicado dentro do próprio arquivo), tabela de pré-visualização com status por linha
- [x] 4.2 Implementar a execução da importação chamando `pessoasApi.criar()` sequencialmente para cada linha válida, com barra de progresso e contadores de sucesso/falha, continuando o lote quando uma linha for rejeitada pelo backend (ex.: CPF já cadastrado) em vez de interromper
- [x] 4.3 Em `views/PessoasListView.tsx`, adicionar botão "Importar planilha" (visível apenas quando `podeGerenciar && podeImportar`) que abre o `ModalImportadorPessoas`, e recarregar a listagem (`recarregar()`) ao concluir a importação
- [x] 4.4 Criar teste de componente em `__tests__/` cobrindo: linha sem CPF é marcada inválida, CPF duplicado no arquivo é marcado inválido, e o relatório final mostra as contagens de sucesso/falha — verificar com `npm run test --workspace=apps/web-client`

## 5. Frontend: Modais com Rolagem Única

- [x] 5.1 Remover o wrapper `<div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">` em `NovaPessoaWizard.tsx:356`, mantendo apenas o `space-y-6` (sem `max-h`/`overflow-y-auto`) para que o conteúdo flua dentro da área rolável já fornecida pelo `Dialog`
- [x] 5.2 Aplicar a mesma remoção em `views/PessoaDetailView.tsx:216`
- [x] 5.3 Verificar visualmente, para cada um dos passos do `NovaPessoaWizard` e para a `PessoaDetailView` (abrindo o app com `npm run dev:client` e navegando até o Cadastro de Pessoas), que existe apenas uma barra de rolagem vertical por modal mesmo com o conteúdo mais longo visível (ex.: pessoa com múltiplos vínculos, documentos, endereços e contatos)

## 6. SDK: Tipos de Filtro

- [x] 6.1 Em `packages/sdk/src/modules/pessoas/types.ts`, adicionar a `ListPessoasParams` os campos opcionais `falecido?: boolean`, `sexo?: string`, `data_nascimento_de?: string` e `data_nascimento_ate?: string`
- [x] 6.2 Verificar com `npm run typecheck --workspace=@sysgov/sdk` (ou `npm run typecheck` na raiz) que não há regressão de tipos

## 7. Verificação Final

- [x] 7.1 Executar `composer test` em `apps/api` e confirmar que toda a suíte do módulo Pessoas permanece verde, incluindo os testes novos/estendidos da tarefa 1.3
- [x] 7.2 Executar `npm run typecheck` e `npm test` na raiz do monorepo e confirmar que `apps/web-client` e `packages/sdk` passam sem erros
- [x] 7.3 Executar `composer static` (phpstan/larastan) em `apps/api` e confirmar ausência de novos erros introduzidos pelas alterações em `PessoaController`/`PessoaService`
