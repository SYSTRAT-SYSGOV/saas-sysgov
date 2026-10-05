# Design

## Context

Ver `proposal.md` para a motivação completa. Pontos de partida técnicos relevantes para as decisões abaixo:

- `PessoaService::listar()` já aceita e aplica o filtro `falecido`, mas `PessoaController::index()` só repassa `['q', 'tipo_vinculo', 'status', 'per_page']` — o filtro existe e nunca é alcançável pela API.
- `PessoasListView.tsx` monta a barra de filtros com `<input>` nativo e dois `Select` do `@sysgov/ui`, e renderiza a grade com `<DataTable columns={colunas} data={...} loading={...} emptyText={...} />` sem nenhuma das props `searchable`, `exportable` ou `fixedLayout` que o `DataTable` (`apps/web-client/src/components/ui/DataTable.tsx`) já implementa e usa em outras telas do monorepo. A ordenação por coluna já é nativa do componente (`getCanSort()`), mas depende de cada `ColumnDef` ter `accessorKey`/`meta.sortValue`, ausente nas colunas custom de nome/CPF/status.
- O módulo de Cemitérios já resolve exatamente o mesmo par de problemas (filtros avançados e importação em massa) nos componentes `FiltrosAvancadosOperacoes.tsx` (grid de filtros com contador de "filtros ativos" e botão "Limpar filtros", usando `@/components/ui` `Input`/`Select` nativos — sem lib de date-range) e `ModalImportadorJazigos.tsx` (upload de CSV, modelo para download, pré-visualização linha a linha com validação local, execução sequencial reaproveitando o endpoint de criação já existente, barra de progresso). Ambos os padrões serão replicados para Pessoas em vez de reinventados.
- `pessoasApi.listar(filtros: Record<string, unknown>)` e `pessoasApi.criar(dados: Record<string, unknown>)` (`apps/web-client/src/modules/pessoas/api.ts`) já aceitam parâmetros livres — novos filtros e a importação em massa não exigem novo endpoint nem novo método de API no frontend, só novas chaves. O SDK (`packages/sdk/src/modules/pessoas/types.ts`) tem um `ListPessoasParams` tipado hoje restrito a `q`, `tipo_vinculo`, `status`, `per_page`, `page`, `compact`.
- `@sysgov/ui`'s `Dialog`/`Modal` (`packages/ui/src/components/Dialog.tsx`) já envolve o conteúdo do modal em `<div className="flex-1 overflow-y-auto custom-scrollbar p-6">` dentro de um `DialogContent` com `max-h-[90vh]`. `NovaPessoaWizard.tsx:356` e `PessoaDetailView.tsx:216` envolvem o próprio conteúdo, de novo, em `<div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">` — uma segunda área rolável dentro da primeira.

## Goals / Non-Goals

**Goals:**
- Tornar os filtros e os recursos de data table (ordenação, exportação) acessíveis na tela de listagem de pessoas, sem introduzir rolagem horizontal.
- Permitir cadastro em lote de pessoas a partir de planilha própria do operador, reaproveitando as mesmas regras de validação e autorização do cadastro individual.
- Eliminar a rolagem aninhada hoje presente no wizard de cadastro e no modal de detalhe.

**Non-Goals:**
- Não cria endpoint de importação em lote no backend — a importação em massa reaproveita `POST /api/pessoas` linha a linha, no mesmo padrão já usado por `ModalImportadorJazigos`.
- Não introduz suporte a formatos de planilha além de CSV (sem XLSX na entrada) — a análise de arquivo client-side segue o padrão já usado pelo módulo de Cemitérios.
- Não revisita o fluxo de importação assíncrona por integração externa já existente (`ImportacaoController`) nem seus requisitos de spec — os dois fluxos de importação continuam distintos e coexistentes.
- Não adiciona biblioteca de seletor de intervalo de datas — a faixa de data de nascimento usa dois `<input type="date">` nativos, como o restante do monorepo já faz.

## Decisions

1. **Filtros adicionais tramitam como `Record<string, unknown>` solto, sem exigir mudança de assinatura.** `PessoaController::index()` passa a repassar também `falecido`, `data_nascimento_de`, `data_nascimento_ate` e `sexo` para `PessoaService::listar()`; o service recebe esses quatro novos filtros opcionais (os três primeiros exigem apenas `->when(...)` adicionais no query builder existente; `sexo` é um `where` direto). Alternativa descartada: criar um Form Request dedicado só para os filtros do `index` — rejeitada porque o `index` é uma consulta (GET) sem corpo validável por regras de negócio, e o padrão do próprio service (`@param array{...}` com `when()` em cada chave) já é o usado pelos outros módulos do monorepo para filtros de listagem.
2. **Nova barra de filtros como componente próprio `FiltrosAvancadosPessoas.tsx`**, no mesmo formato de `FiltrosAvancadosOperacoes.tsx` (grid responsivo `sm:grid-cols-2 lg:grid-cols-*`, contador de "filtros ativos", botão "Limpar filtros"), em vez de inflar `PessoasListView.tsx` com mais estado de filtro inline. Isso também resolve "evitar barras de rolagem": a grid responsiva nunca força rolagem horizontal, diferente de uma única linha de controles com `flex-wrap` apertada.
3. **`DataTable` ganha `searchable`, `exportable` e `fixedLayout` habilitados diretamente em `PessoasListView.tsx`**, sem props novas no componente — todas já existem em `apps/web-client/src/components/ui/DataTable.tsx`. A tarefa de ordenação é adicionar `accessorKey`/`meta.sortValue` às colunas custom de nome/CPF/status, não construir ordenação do zero. `fixedLayout` com `size` por coluna evita que a largura ocupada pela coluna de ações cause overflow horizontal.
4. **Importação em massa processa linha a linha no cliente, reaproveitando `pessoasApi.criar()`**, igual a `ModalImportadorJazigos` → `cemiteriosApi.criarJazigo()`. Alternativa descartada: endpoint de bulk-insert no backend (`POST /api/pessoas/importacoes-massa`) — rejeitada por este momento: a validação de CPF (dígito verificador, unicidade por tenant) e a autorização já vivem inteiramente em `StorePessoaRequest`/`PessoaPolicy` por registro individual; duplicá-las num caminho de bulk-insert dobraria a superfície de validação sem necessidade real de performance (lotes de planilha são dezenas/centenas de linhas, não milhares). Fica como extensão futura caso o volume justifique.
5. **Correção do double-scroll remove o wrapper interno, não o scroll do `Dialog`.** `max-h-[75vh] overflow-y-auto` é apagado de `NovaPessoaWizard.tsx` e `PessoaDetailView.tsx`; o conteúdo volta a fluir dentro do `<div className="flex-1 overflow-y-auto ...">` que o próprio `Dialog` do `@sysgov/ui` já fornece. Como o `Dialog` já limita a `max-h-[90vh]` pelo `DialogContent`, nenhum novo limite de altura é necessário.

## Risks / Trade-offs

- **[Risco] Importação linha a linha é sequencial e pode ser lenta para planilhas grandes (uma requisição HTTP por pessoa).** → Mitigação: mesmo trade-off aceito e em produção para jazigos; a barra de progresso dá feedback imediato por linha, e o relatório final lista claramente o que falhou para reenvio pontual, sem exigir reprocessar o lote inteiro.
- **[Risco] Expor filtro de `sexo` e faixa de data de nascimento na listagem aumenta a superfície de dados pessoais filtráveis.** → Mitigação: nenhum dado novo é exposto — `sexo` e `data_nascimento` já retornam na `PessoaResource` hoje; a mudança é apenas permitir filtrar por campos já visíveis, mantendo as mesmas permissões (`cadastros.pessoas.view`) do restante do `index`.
- **[Risco] Remover o `max-h-[75vh]` interno pode revelar que algum passo do wizard dependia dele para não ultrapassar `max-h-[90vh]` do `Dialog`.** → Mitigação: cada passo do wizard já é parcial (um subconjunto de campos por vez), então o conteúdo por passo deve caber nos `90vh` do próprio `Dialog`; validar visualmente cada um dos passos e a ficha de detalhe após a remoção faz parte das tarefas de implementação.

## Migration Plan

Mudança aditiva, sem dado migrado e sem *breaking change* de contrato de API (novos parâmetros de filtro são opcionais; `ListPessoasParams` do SDK ganha campos opcionais). Não há passo de rollback especial: revogar o commit restaura o comportamento anterior (filtros antigos continuam funcionando, wizard volta a ter rolagem aninhada, importação em massa deixa de existir).
