# Proposal

## Why

A listagem do Cadastro de Pessoas (`PessoasListView.tsx`) usa o `DataTable` do design system apenas como grade estática: nenhum dos recursos de busca/ordenação/exportação já embutidos no componente está habilitado, e a filtragem fica restrita a três campos simples (busca textual, tipo de vínculo, status), com o filtro de "falecido" já suportado por `PessoaService::listar()` mas nunca exposto pelo `PessoaController::index()`. Não existe nenhum caminho para cadastrar pessoas em lote — a única importação disponível (`ImportacaoController`) é uma busca assíncrona por CPF único em sistema externo da prefeitura, inútil quando o operador tem uma planilha própria com dezenas de servidores ou munícipes para cadastrar de uma vez, como já existe para o inventário de jazigos (`ModalImportadorJazigos`). Além disso, os modais mais longos do módulo (`NovaPessoaWizard`, `PessoaDetailView`) envolvem o próprio conteúdo em um `overflow-y-auto` interno que fica aninhado dentro do corpo do `Dialog` do `@sysgov/ui` — que já é `overflow-y-auto` por padrão —, produzindo barra de rolagem dupla/aninhada em vez de uma única rolagem previsível.

## What Changes

- **Filtros avançados na listagem de pessoas**: expande os filtros de `PessoasListView.tsx`/`usePessoas.ts` para incluir situação vital (falecido/vivo — já suportado pelo `PessoaService` mas ausente do `PessoaController::index()`), faixa de data de nascimento e sexo, mantendo os filtros atuais (busca, tipo de vínculo, status) combináveis entre si; a barra de filtros usa componentes `@sysgov/ui` (`Select`, popover de data) em vez de `<input>` nativo.
- **Data table completa**: habilita na grade de pessoas os recursos que o `DataTable` já oferece e hoje não são usados nessa tela — ordenação por coluna (nome, CPF, status), exportação (CSV/XLSX/PDF) das linhas filtradas, e `fixedLayout` com contenção de largura para não introduzir rolagem horizontal ao adicionar a nova barra de filtros.
- **Importação manual em massa de pessoas**: novo assistente de importação via planilha (CSV), no padrão já estabelecido pelo `ModalImportadorJazigos` do módulo de Cemitérios — upload de arquivo, modelo de planilha para download, pré-visualização linha a linha com validação local (CPF, nome obrigatórios) antes do envio, e execução com barra de progresso reaproveitando o endpoint de criação já existente (`POST /api/pessoas`), sem endpoint novo de importação em lote no backend.
- **Modais sem rolagem duplicada**: remove o wrapper `max-h-[75vh] overflow-y-auto` redundante hoje presente em `NovaPessoaWizard.tsx` e `PessoaDetailView.tsx`, que aninha uma segunda área de rolagem dentro do corpo já rolável do `Dialog`/`Modal` do `@sysgov/ui`, deixando cada modal com uma única área de rolagem.

## Capabilities

### New Capabilities
- `pessoas/importacao-manual`: assistente de importação manual em massa de pessoas a partir de planilha (CSV), com modelo de arquivo, pré-visualização e validação local linha a linha, e execução com relatório de sucesso/falha por registro.

### Modified Capabilities
- `pessoas`: expande o requisito de localização/filtragem da listagem (hoje restrito a nome/CPF, tipo de vínculo e status) para incluir filtro por situação vital, faixa de data de nascimento e sexo, e para exigir ordenação por coluna e exportação (CSV/XLSX/PDF) das linhas filtradas na grade; adiciona requisito de que os modais do módulo apresentem uma única área de rolagem por diálogo, sem áreas de rolagem aninhadas.

## Impact

- **Backend (`apps/api/Modules/Pessoas`)**:
  - `PessoaController::index()`: passa a repassar `falecido`, `data_nascimento_de`, `data_nascimento_ate` e `sexo` para `PessoaService::listar()`.
  - `PessoaService::listar()`: adiciona filtros de faixa de data de nascimento e sexo (o filtro de `falecido` já existe).
- **Frontend (`apps/web-client/src/modules/pessoas`)**:
  - `hooks/usePessoas.ts`: novos estados/parâmetros de filtro (falecido, faixa de data de nascimento, sexo).
  - `views/PessoasListView.tsx`: nova barra de filtros avançados, `DataTable` com `searchable`/`sortable`/`exportable`/`fixedLayout` habilitados, botão de importação em massa.
  - Novo `views/ModalImportadorPessoas.tsx`: assistente de importação em massa (modelo no padrão de `ModalImportadorJazigos.tsx` do módulo de Cemitérios).
  - `NovaPessoaWizard.tsx` e `views/PessoaDetailView.tsx`: remoção do wrapper de rolagem interna redundante.
- **SDK (`packages/sdk/src/modules/pessoas`)**: tipos de filtro de listagem atualizados para refletir os novos parâmetros aceitos pela API.
