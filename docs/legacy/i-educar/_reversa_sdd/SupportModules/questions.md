# SupportModules (i-Educar legado) — Questions (capa transversal)

> Perguntas abertas da unit acumuladas para o Revisor. Evidência entre colchetes. Detalhes por pilar somam perguntas nas units `ErrorTracking`, `Navigation` e `Notifications`.

---

## Bloco A: Observabilidade de erros (07 itens)

1. Sanitização de PII (CPF, certidões, senhas) no tracker: lista de chaves do bastão contém `cpf` e `certidao_nascimento` — quais outros campos e como penetrar payloads aninhados e obfuscados? 🔴
2. Tabela local de erros (`core_system_errors`): retenção e política de purge e de agregação por fingerprint? 🔴
3. A visão de administração: nível de acesso a incidentes (quem pode marcar `resolved_at`)? 🔴
4. Dados de erro duplicados (mesma exceção em várias cópias): agrupar por fingerprint no ingest e manter contagem? 🟡
5. Tracking de falhas do front: expor beacon pro `core_system_errors` também com `trace_id` do server? 🔴
6. O `preventivamente` tracker deve ser fila com fallback: fila do próprio Laravel (queues) ou APM externo com buffer? 🟡
7. Retenção LGPD de payloads: armazenar apenas metadados sanitizados e dispensar payload completo? 🟡

## Bloco B: Navegação e RBAC (07 itens)

8. Do inventário menu-processo → permissão RBAC: cobertura de códigos canônicos (`educa.students` etc.) uma-para-um com os processos atuais (250+)? 🔴 `Menu.php:24`
9. Processos legados sem menu (como exportações filtradas por usuário): têm permissão própria ou herdam do menu? 🟡
10. Favoritos: escopo por tenant ou compartilhado por usuário entre perfis? 🔴
11. Command Palette: os favoritos, os bookmarks e as ações rápidas (navegar cada tela) deve ficar visível para usuário desabilitado (oculto/is_visible = 0)? 🟡 [bastão `:127`]
12. Cache de menus entre tenants: nomeação da chave com `tenant_id` do cliente no cache e invalidação por perfil — chaves atuais não tem tenant explicito (conn string como proxy) — alvo deve usar UUID do tenant? 🟡 [MenuCacheService: getClient() usa conn]
13. Breadcrumbs gerados automaticamente a partir da rota: manter o breadcrumb manual (como "Configurações") como fallback? 🟡 [Breadcrumb manual]
14. Renomeação regional (Declarações/Atestados): tornar o rótulo configurável por tenant no alvo? 🟡 [Menu::changeMenusToAttestation]

## Bloco C: Notificações e comunicados (06 itens)

15. Tipos de notificação: manter enumeração aberta (nova tela de admin) ou enumeração fixa de tipos? 🔴 [types 1..5 fixos]
16. Painel de notificação: manter URL presignada de arquivos (types 3/4) no payload ou gravar URI de storage direto? 🟢 [NotificationUrlPresigner]
17. Broadcast: canal privado autenticado + pusher/soketi/ably — qual protocolo do alvo e política de autenticação? 🔴 [canal público hoje]
18. Multi-canal: e-mail/WhatsApp/Push SMS — ofors levels de prioridade e canais são partidos em filas sequentes para atualização? 🔴
19. Comunicados: vigência com starts/ends + público (papel/escola) — as vagas exibidas (show_vacancy) permanecem como módulo webinar? 🟡 [AnnouncementUserController::getUserSchools]
20. Barreira de bloqueio: prevenir scrap publicado em tela cheia modal no alvo — o comportamento do middleware web (só GET HTML) permanece? 🟡 [AnnouncementMiddleware:14-20]

---

## Registro de perguntas da unit

| Bloco | Itens |
|-------|-------|
| A: Observabilidade de erros | 7 |
| B: Navegação e RBAC | 7 |
| C: Notificações e comunicados | 6 |
| **Total da unit** | **20** |

> Acumulado do projeto: **367 perguntas em 19 units** (347 anteriores + 20 desta unit).
