# Navigation (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir a navegação no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais (sanitização, auditoria, cache) conforme unit `SupportModules`.

---

## Fase 0 — Descoberta

- [ ] Inventariar a árvore de menus de produção: profundidade máxima real, nós sem process, duplicidades, nós inativos. 🔴
- [ ] Confirmar se algum tenant depende de `old`/`parent_old` (integrações ou telas por id legado). 🔴
- [ ] Verificar uso real da busca de menu (`findByUser`) em quaisquer caminhos não identificados. 🟡

## Fase 1 — Modelo de dados

- [ ] Criar `core_navigation_nodes` (DDL no bastão: tabelas 90) com `code` único, `parent_id` auto-FK com cascade, `required_permission`, `badge_expression`, `is_visible`, `is_active`. 🟢
- [ ] Criar `core_user_navigation_favorites` (tabela 91) unique (user, node). 🟢
- [ ] Migrar `public.menus`: `process` (int legado) → chave de permissão RBAC canônica via mapa de processos (unit `Usuario`/`Configuracao`); nós sem process → nós agrupadores com `route_name null`. 🟡
- [ ] Decidir destino das colunas `old`/`parent_old` (compatibilidade) — sugerido manter como metadado. 🟡

## Fase 2 — Serviço de consulta

- [ ] Portar `NavigationTreeService` (bastão): filtro por `required_permission` na árvore do usuário, cache Redis 1h por tenant/user, limpa ao alterar perfil. 🟢
- [ ] Substituir invalidação global por invalidação direcionada (árvore por alteração de código/nó; perfis quando muda permissão). 🟡
- [ ] Breadcrumb automático por rota; manter API manual da capa apenas para transições do legado. 🟡

## Fase 3 — Casos de uso

- [ ] Mapear `getProcessMenuData` (título/caminho por processo) para resolução por `code` do nó. 🟡
- [ ] Implementar Command Palette (`Ctrl+K`) sobre a árvore visível + favoritos (componente no bastão). 🟢
- [ ] Endpoint de menu do alvo com contrato tipado (`NavigationNodeDTO`) em vez de serialização Eloquent default. 🟡
- [ ] Registrar renomeio regulatório (Declaração/Atestado) como seed/data migration no alvo, não como método de runtime. 🟡

## Fase 4 — Migração de dados

- [ ] Migrar `menus` e a pivot `menu_tipo_usuario` (visualiza) por tenant, preservando hierarquia e order. 🟢
- [ ] Rever excluir nós legacy (`CONFIG`/`SETTINGS` exceto admin) no filtro de exibição ou como regra de permissão. 🟡
- [ ] Duplicar somente o que é ativo; mascarar nós `active = false`. 🟡

## Fase 5 — Verificação

- [ ] Teste de paridade de filtragem: para uma amostra de tipos de usuário, a árvore do alvo deve conter os mesmos nós que o legado. 🟡
- [ ] Teste de invalidação: alteração de nó/perfil reflete no cache em < 1 ciclo de request. 🟡
- [ ] Teste de Command Palette/favoritos (UX) e de fallback do breadcrumb. 🟢
- [ ] Teste de migração: contagem de nós por tenant igual ao legado. 🟡
