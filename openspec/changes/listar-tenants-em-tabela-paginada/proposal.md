# Proposal

## Why

A tela de Organizações & Tenants do web-admin só exibe os tenants em **cards**. À medida que a base cresce, os cards ficam ruins para localizar, comparar e agir sobre muitos tenants. Além disso, o levantamento do código revelou defeitos na listagem atual que esta melhoria precisa corrigir para a tabela paginada fazer sentido:

1. `GET /api/admin/tenants` pagina fixamente em 25 itens, mas o front **nunca envia `page`** — tenants além do 25º não aparecem na tela.
2. O `index` devolve o paginador "cru": `mrr_cents` e `user_count` só existem em `show`/`update`. Os indicadores do topo (MRR total, usuários) e o valor mensal do card usam `?? 0` e tendem a mostrar zero.
3. Os indicadores do topo (`totalMRR`, `totalUsers`, `activeCount`) são calculados apenas sobre os itens carregados, o que ficará incorreto com paginação.

## What Changes

- Alternância **Cards | Tabela** no topo da lista, com a preferência lembrada por usuário (localStorage, com fallback para Cards).
- Nova visualização em **tabela** (componente `DataTable` já existente em `apps/web/src/components/ui/DataTable.tsx`) com colunas: seleção, Organização (nome + slug), CNPJ, Tipo, Status, Plano, MRR, Usuários, Criado em e Ações (editar, administradores, diagnóstico, excluir).
- **Paginação no servidor** para as duas visualizações: o front envia `page` e `per_page`; seletor de tamanho de página (10, 25, 50, 100); mudar filtro/busca volta para a página 1.
- **Ordenação no servidor** por coluna (lista branca de campos) via `sort` e `direction`.
- Backend: `GET /api/admin/tenants` passa a aceitar `page`, `per_page` (padrão 25, máximo 100), `sort`, `direction`; cada item inclui `mrr_cents` e `user_count`; a resposta inclui `meta.summary` com os totais do conjunto filtrado (total de tenants, ativos, MRR total e usuários).
- Indicadores do topo passam a usar `meta.summary` (valores do conjunto filtrado inteiro, não da página).
- Seleção para ações em lote mantida **por id entre páginas**; "selecionar todos" atua sobre a página atual; o contador mostra o total selecionado.
- Mantém o escopo do analista de suporte (somente tenants da carteira) em listagem, totais e contagem.

## Capabilities

### New Capabilities
- (Nenhuma)

### Modified Capabilities
- `admin`: novo requisito de listagem paginada, ordenável e com totais de tenants; novo requisito da visualização em tabela/cards no web-admin.

## Impact

- Backend (`apps/api`): `Modules/Admin/Http/Controllers/TenantController::index` (parâmetros, ordenação, `mrr_cents`/`user_count`, `meta.summary`); testes de feature novos (paginação, ordenação, escopo do analista, totais).
- Frontend web-admin (`apps/web`): `AdminTenantManagement.tsx` (alternância, tabela, paginação, seleção entre páginas, indicadores), `modules/admin/api.ts` (`getTenants` com `page`, `per_page`, `sort`, `direction`), `modules/admin/types.ts` (`Paginated.meta.summary`).
- SDK (`packages/sdk`): ajustar `tenants()` se existir listagem equivalente.
- Banco de dados: nenhuma migration obrigatória; avaliar índices em `tenants(status)`, `tenants(created_at)` conforme volume (tarefa de verificação).
- Compatibilidade: `page`/`per_page` são opcionais; clientes atuais continuam recebendo 25 itens por página.
- Documentação: não há módulo próprio; registrar em `docs/` apenas se houver doc de web-admin existente.
