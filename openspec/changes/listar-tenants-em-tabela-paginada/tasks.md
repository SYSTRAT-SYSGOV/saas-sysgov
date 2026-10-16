# Tasks

## 1. Backend - Listagem de tenants

- [x] 1.1 `TenantController::index`: aceitar `page`, `per_page` (padrão 25, máximo 100) com validação e fallback seguro
- [x] 1.2 Aceitar `sort` (lista branca: `name`, `slug`, `status`, `type`, `plan`, `created_at`, `monthly_fee_cents`) e `direction` (`asc|desc`); ignorar valores fora da lista
- [x] 1.3 Incluir `user_count` (via `withCount('users')`) e `mrr_cents` em cada item, sem N+1
- [x] 1.4 Incluir `meta.summary` (`total`, `active`, `mrr_cents`, `user_count`) calculado em consulta agregada sobre o conjunto filtrado, respeitando o escopo do analista de suporte
- [x] 1.5 Executar `php -l` e `composer static` (PHPStan) nos arquivos alterados

## 2. Backend - Testes

- [x] 2.1 Teste: `per_page` e `page` retornam o recorte correto e `meta.total`/`last_page` coerentes; `per_page` acima do máximo é limitado a 100
- [x] 2.2 Teste: ordenação por `name` asc/desc; campo inválido em `sort` é ignorado (sem erro 500)
- [x] 2.3 Teste: itens trazem `mrr_cents` e `user_count` corretos
- [x] 2.4 Teste: `meta.summary` reflete filtros (`status`, `q`, `type`) sobre o conjunto inteiro, não só a página
- [x] 2.5 Teste: analista de suporte só enxerga e totaliza tenants da carteira
- [x] 2.6 Rodar a suíte do módulo Admin

## 3. Frontend web-admin

- [x] 3.1 `modules/admin/api.ts` e `types.ts`: `getTenants` com `page`, `per_page`, `sort`, `direction`; tipar `meta.summary`
- [x] 3.2 `AdminTenantManagement.tsx`: estado de página, tamanho de página, ordenação e `viewMode` (persistido em localStorage com `try/catch`)
- [x] 3.3 Alternância Cards | Tabela no topo da lista
- [x] 3.4 Visualização em tabela com `DataTable` (paginação remota; o `DataTable` ganhou `sorting` remoto e `manualPagination` quando recebe `paginationState`), colunas definidas em D5 e ações por linha
- [x] 3.5 Paginação também nos cards (mesma barra e mesmo estado)
- [x] 3.6 Seleção por id mantida entre páginas; "selecionar todos" da página atual; limpar seleção ao mudar filtros/busca
- [x] 3.7 Indicadores do topo usando `meta.summary`
- [x] 3.8 Seguir o DESIGN_SYSTEM.md (componentes `@sysgov/ui`, tokens, responsividade) e estados de carregamento/vazio
- [x] 3.9 Testes Vitest: alternância, troca de página, tamanho de página, ordenação, seleção entre páginas, indicadores
- [x] 3.10 Rodar `tsc --noEmit` e a suíte do painel

## 4. Validação e documentação

- [ ] 4.1 Verificar índices em `tenants(status)` e `tenants(created_at)` conforme volume e registrar a conclusão (a tabela `tenants` não tem índices além da chave/únicos; sem necessidade para o volume atual, reavaliar acima de alguns milhares de tenants)
- [x] 4.2 Executar `openspec validate listar-tenants-em-tabela-paginada --strict`
- [ ] 4.3 Validar no ambiente: criar mais de 25 tenants, navegar pelas páginas nas duas visualizações, ordenar, filtrar e usar a ação em lote com seleção entre páginas
