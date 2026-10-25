# Navigation (i-Educar legado) — Perguntas abertas

> Perguntas para o usuário/alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Negócio

1. Quantos nós tem a árvore de menus de produção por tenant (profundidade máxima)? 🔴
2. Existe customização local de menus por prefeitura (renomeios, nós extras fora das migrations)? 🔴
3. O renomeio regulatório Declaração/Atestado continua necessário no alvo (variável por tenant)? 🟡

## Modelo

4. Como mapear `process` (id de permissão legado) para as chaves RBAC canônicas do alvo — existe tabela de tradução ou deve-se inferir dos seeds? 🔴
5. Nós agrupadores sem `process` ficam visíveis a qualquer usuário; no alvo isso vira `required_permission` null? 🟡
6. `old`/`parent_old` devem ser migrados como metadados ou abandonados? 🟡
7. `type` (default 1) tem qualquer outra semântica além de exibição (ex.: separador)? 🔴

## Cache e consistência

8. A invalidação global (`flushAll`) em qualquer mutação é aceitável no alvo ou deve ser direcionada? 🟡
9. TTL de 1 dia (menu do usuário) e 7 dias (processo) deve ser paridade ou padrão unificado? 🟡
10. Cache por tipo de usuário (não por usuário) continua correto quando favoritos forem por usuário? 🟡

## Experiência (alvo)

11. A busca de menu (`findByUser`, código morto no legado) deve ser implementada de vez (Command Palette)? 🟡
12. Favoritos (`core_user_navigation_favorites`) substituem o menu ou complementam? 🟡
13. Breadcrumbs automáticos por rota: como renderizar trilhas para telas não mapeadas (processos sem nó)? 🟡
14. Badge dinâmico (`badge_expression`, ex. pendências de matrícula): quais providers são prioritários? 🔴

## Compatibilidade e dados

15. Nós duplicados por `process` (mesmo processo em ramos diferentes) são válidos na árvore do legado? Como normalizar? 🔴
16. `active = false` hidden nodes devem virar `is_active` 0 ou serem descartados? 🟡
17. Ordens fora do padrão (ordens manuais, gaps) precisam reindexar no alvo? 🟡
18. Ícones do legado mapeiam para Lucide (`icon_name`)? Existe tabela de conversão? 🔴

## Transversal

19. Menu e permissão: no alvo, mudanças de perfil/disponibilidade de menu devem disparar limpeza de cache específica — qual evento da capa `SupportModules` será usado? 🟡
20. Auditoria de edições de menu (quem alterou qual nó): registrar em `core_audit_logs` (ação update em entidade NavigationNode)? 🟡

---

*Cumulativo: 507 perguntas em 26 units.*
