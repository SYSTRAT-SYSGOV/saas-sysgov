## ADDED Requirements

### Requirement: Listagem de tenants é paginada, ordenável e traz totais do conjunto filtrado
<!-- id: TenantController.index -->
<!-- entities: Tenant, TenantAnalyst -->
<!-- enforced: TenantController.index() -->

`GET /api/admin/tenants` SHALL aceitar `page`, `per_page` (padrão 25, máximo 100), `sort` e `direction`,
ordenando somente por campos da lista branca (`name`, `slug`, `status`, `type`, `plan`, `created_at`,
`monthly_fee_cents`); valores fora da lista SHALL ser ignorados. Cada item SHALL incluir `mrr_cents` e
`user_count`, e a resposta SHALL incluir `meta.summary` com `total`, `active`, `mrr_cents` e `user_count`
calculados sobre todo o conjunto filtrado, respeitando o escopo do analista de suporte.

#### Scenario: paginação com tamanho de página
- **WHEN** `GET /api/admin/tenants?page=2&per_page=10` roda com 25 tenants
- **THEN** responde HTTP 200 com 10 itens da segunda página e `meta.total` igual a 25

#### Scenario: limite máximo de itens por página
- **WHEN** `per_page` é maior que 100
- **THEN** a resposta usa no máximo 100 itens por página

#### Scenario: ordenação por campo permitido
- **WHEN** `sort=name&direction=asc` é informado
- **THEN** os itens vêm em ordem alfabética crescente de nome

#### Scenario: campo de ordenação fora da lista
- **WHEN** `sort` contém um campo que não está na lista branca
- **THEN** o campo é ignorado, a ordenação padrão é usada e a resposta é HTTP 200

#### Scenario: totais refletem os filtros inteiros
- **WHEN** `status=active` é informado e existem tenants ativos em várias páginas
- **THEN** `meta.summary.total` e `meta.summary.mrr_cents` consideram todos os tenants ativos, não só a página atual

#### Scenario: analista de suporte
- **WHEN** um analista de suporte lista os tenants
- **THEN** itens, `meta.total` e `meta.summary` consideram apenas os tenants da sua carteira


### Requirement: Web-admin exibe tenants em cards ou em tabela paginada
<!-- id: AdminTenantManagement.viewMode -->
<!-- entities: Tenant -->
<!-- enforced: AdminTenantManagement -->

A tela de tenants do web-admin SHALL oferecer a alternância entre **Cards** e **Tabela**, lembrando a
preferência do usuário e usando Cards como padrão. As duas visualizações SHALL compartilhar filtros,
página, tamanho de página e seleção, com paginação no servidor. A seleção para ações em lote SHALL
persistir ao trocar de página e SHALL ser limpa ao alterar filtros ou busca.

#### Scenario: alternar para a tabela
- **WHEN** o usuário escolhe a visualização em Tabela
- **THEN** os tenants aparecem em colunas com paginação e a preferência é lembrada no próximo acesso

#### Scenario: navegar entre páginas
- **WHEN** o usuário troca de página ou de tamanho de página
- **THEN** a tela carrega o recorte correspondente do servidor e mantém a seleção por id

#### Scenario: filtrar volta para a primeira página
- **WHEN** o usuário altera a busca ou o filtro de status
- **THEN** a listagem volta para a página 1 e a seleção é limpa

#### Scenario: indicadores do topo
- **WHEN** a lista está paginada
- **THEN** os indicadores (ativos, MRR total, usuários) mostram os valores de `meta.summary`, não apenas da página atual
