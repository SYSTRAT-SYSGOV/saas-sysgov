# SupportModules (i-Educar legado) — Tasks (capa transversal)

> Tarefas transversais às units `ErrorTracking`, `Navigation` e `Notifications`. O detalhamento por pilar fica nas units próprias.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tarefas

| ID | Tarefa | Entregável | Dependências | Evidência | Confiança |
|----|--------|-----------|--------------|-----------|-----------|
| T-01 | Criar serviço central de captura de erros com sanitização LGPD do payload (chaves sensíveis mascaradas) antes de qualquer export. | Serviço | — | Bastão `:242-306`; legado envia request cru 🟢 `Handler.php:61-68` | 🔴 |
| T-02 | Introduzir `trace_id` por requisição e propagar para logs, erros e auditoria. | Middleware/APM | T-01 | Bastão `:65`; sem paridade | 🔴 |
| T-03 | Criar `core_system_errors` com resolução auditável (`resolved_at`, `resolved_by_user_id`) e persistir incidentes localmente antes/independente de APM. | Migração + modelo | T-01, T-02 | Bastão `:60-88`; legado só envia para fora 🟢 | 🔴 |
| T-04 | Colocar o tracker em fila e com fallback (APM fora não deve travar a requisição). | Fila + política | T-01 | Legado síncrono 🟢 `Handler.php:43-53` | 🟡 |
| T-05 | Separar permissão (RBAC) de navegação: inventário de `public.menus.process` → chaves RBAC, com pivô `menu_tipo_usuario` como origem. | Inventário + migração | — | 🟢 `Menu.php:296-307`; pivô `pmieducar.menu_tipo_usuario` | 🔴 |
| T-06 | Criar `core_navigation_nodes` e mapear cada nó legado (com `old`/`parent_old` como códigos de corte de migração). | Migração + seeder | T-05 | 🟢 `menus` com `old`, `parent_old`; dezenas de migrações incrementais de menu | 🔴 |
| T-07 | Portar cache de navegação com invalidação por perfil e por mudança de nó. | Serviço de cache | T-06 | 🟢 `MenuCacheService.php:16-52`, `flushAll` em troca de títulos | 🟢 |
| T-08 | Implementar Command Palette (Ctrl+K) aproveitando a semântica de busca `findByUser` (limite 15, ilike) como base inicial. | Frontend + API | T-06 | 🟢 `Menu.php:341-353`; paleta nova 🔴 | 🔴 |
| T-09 | Implementar favoritos de navegação por usuário. | Migração + API | T-06 | 🔴 inexistente (bastão `:39`) | 🔴 |
| T-10 | Migration de `public.notifications` + `public.notification_type` para `core_notifications` preservando histórico e mapeando os 5 tipos. | Migração | T-02 | 🟢 `2020_01_01_110000_create_notifications_table.php`, tipos 1..5 | 🔴 |
| T-11 | Roteirizar broadcast por canal privado autenticado (substituir canal público composto). | Infra de broadcast | T-10 | 🟢 `NotificationEvent.php:41-43` (canal público) | 🟡 |
| T-12 | Criar adaptador multi-canal (in-app, push, e-mail, WhatsApp) com fila de retentativas; falha de canal externo não bloqueia in-app. | Serviço + fila | T-10 | Bastão `:27-28`, `:530`; legado só WebSocket 🟢 | 🔴 |
| T-13 | Portar comunicados com ciência: régua de bloqueio (GET HTML), trilha de aceite com IP/UA e painel de desativação de emergência. | Migração + middleware + tela | T-12 | 🟢 `AnnouncementMiddleware.php`, `announcement_users.confirmed_at` | 🟢/🔴 |
| T-14 | Centralizar mensagem de domínio polimórfica (`messages`) no centro de notificações unificado. | Migração | T-10 | 🟢 `Message.php` (`messageable`) | 🟡 |
| T-15 | Portar avisos escolares (`school_notices`, process 1027: data/hora/local por escola). | Migração + tela | T-10 | 🟢 migração `school_notices` | 🟢 |
| T-16 | Consolidar listeners de domínio (transferência, busca ativa, senha) no novo pipeline de notificação. | Refactor | T-12 | 🟢 `app/Listeners/*` | 🟡 |

---

## Ordem sugerida

1. **Observabilidade (T-01..T-04):** fila, sanitização, trace, tabela local.
2. **Navegação (T-05..T-09):** inventário menu→RBAC, nós, cache, paleta, favoritos.
3. **Mensagens (T-10..T-12):** migração, canal autenticado, multi-canal.
4. **Comunicados e domínio (T-13..T-16):** barreira auditada, avisos e listeners.

---

## Riscos de execução

- T-05 é o passo crítico: sem inventário fiel de `process` → RBAC, telas ficam sem autorização. Exige auditoria com contagem de telas por processo. 🔴
- T-06: mais de 40 migrações incrementais de menu (exemplos confirmados no banco: renomeações, exclusões de itens, novos menus) — o histórico corrige títulos ao longo do tempo; migraria o estado final apenas. 🟡
- T-11/T-12 dependem de infraestrutura nova (WebSocket gerenciado, push, WhatsApp) — prova de conceito antes do backlog. 🔴
- T-13: comunicação de bloqueio no grupo web só pega HTML GET; endpoints JSON e PJAX escapam — o alvo deve definir política explícita. 🟡
