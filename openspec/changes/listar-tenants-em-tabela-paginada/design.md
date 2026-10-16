# Design

## Contexto

- `AdminTenantManagement.tsx` carrega `adminApi.getTenants({ q, status })` e renderiza `tenants.map` em cards (`TenantCard`), com seleção por checkbox para ações em lote (`selectedTenantIds`) e ações por tenant (editar, administradores, diagnóstico, excluir).
- `TenantController::index` retorna `Tenant::paginate(25)` com `modules` carregado; não calcula `mrr_cents` nem `user_count` por item.
- O repositório já tem `DataTable` (TanStack Table) com **paginação remota** (`paginationState`), seletor de tamanho de página e busca; é usado em `ModuleCatalogPage`.

## Decisões

### D1. Paginação e ordenação no servidor
Com a base crescendo, filtrar/ordenar no cliente exigiria carregar tudo. O backend aceita:
- `page` (padrão 1), `per_page` (padrão 25, máximo 100, valores inválidos caem no padrão);
- `sort` em lista branca: `name`, `slug`, `status`, `type`, `plan`, `created_at`, `monthly_fee_cents` (padrão `created_at`); `direction` `asc|desc` (padrão `desc`).
Campos fora da lista branca são ignorados (nunca interpolados na query — evita ordenação arbitrária/SQL injection).
*Alternativa descartada:* ordenar por `mrr_cents` — é derivado (módulos + domínio próprio) e exigiria agregação; fica fora do escopo (a coluna MRR não é ordenável).

### D2. Itens enriquecidos e totais
- Cada item do `index` inclui `user_count` (via `withCount('users')`) e `mrr_cents` (`monthlyMrrCents()`), evitando N+1: `modules` já vem carregado; `withCount` evita consulta por item.
- `meta.summary` = `{ total, active, mrr_cents, user_count }` calculado sobre **todo o conjunto filtrado** (mesmos filtros/escopo do analista), não só a página. O MRR total soma `monthly_fee_cents` + módulos habilitados + domínio próprio; implementado em consulta agregada única para não carregar todos os tenants em memória.

### D3. Alternância Cards | Tabela
- Estado `viewMode` (`cards|table`) persistido em `localStorage` com `try/catch` (o acesso pode falhar); padrão `cards` para não alterar o comportamento atual.
- As duas visualizações compartilham os mesmos dados, filtros, página e seleção; só muda a apresentação. Os cards ganham a mesma barra de paginação abaixo da grade.

### D4. Seleção entre páginas
`selectedTenantIds` já guarda ids; permanece ao trocar de página/ordenar. "Selecionar todos" marca a **página atual**. O contador da barra de lote exibe o total selecionado, com ação "Limpar seleção". Mudar filtros/busca **limpa a seleção** para evitar aplicar ação em lote em itens que o usuário não vê.

### D5. Colunas da tabela
Seleção | Organização (nome + slug) | CNPJ | Tipo | Status (StatusChip) | Plano | MRR | Usuários (`user_count`/`max_users`) | Criado em | Ações. Responsividade: em telas estreitas, a tabela rola horizontalmente dentro do contêiner e a alternância padrão sugere Cards.

### D6. Escopo do analista de suporte
O filtro por carteira (`tenant_analyst`) continua aplicado na listagem, nos totais e na contagem de páginas; testes garantem que o analista nunca vê nem totaliza tenants fora da carteira.

## Riscos e Trade-offs

- **Mudar o formato de `meta` no `index`**: a resposta continua sendo o paginador do Laravel, com `summary` acrescentado em `meta`; clientes que ignoram campos desconhecidos não quebram.
- **Custo do total de MRR**: consulta agregada adicional por requisição; mitigado por usar `SUM` no banco e índices; pode ser cacheado por alguns segundos se necessário.
- **Seleção persistente entre páginas** pode surpreender: mitigado pelo contador visível e por limpar a seleção ao filtrar.

## Plano de migração
Sem migration obrigatória. Deploy do backend antes do front (o front novo depende de `meta.summary`; o front antigo continua funcionando com o backend novo).
