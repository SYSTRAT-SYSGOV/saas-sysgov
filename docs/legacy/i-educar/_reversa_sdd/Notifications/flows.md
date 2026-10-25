# Notifications (i-Educar legado) — Fluxos

> Fluxos observados no código. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais por referência: unit `SupportModules`.

---

## Fluxo 1 — Notificação por permissão de processo

1. Serviço de domínio chama `NotificationService.createByPermission(processId, texto, link, tipo)`. 🟢
2. Localiza o menu com `menus.process = processId`; lê `pmieducar.menu_tipo_usuario` com `visualiza = 1`. 🟢
3. Para cada tipo, busca usuários ativos (`ativo = 1`) e faz fan-out: 1 registro em `public.notifications` por usuário (loops, sem bulk). 🟡
4. Por notificação: link presignado (se export) e `NotificationEvent` (ShouldBroadcast) no canal `{tenant}-notification-{md5(user_id)}`. 🟢
5. Frontend assina o canal e faz polling de não lidas; leitura via `POST marca-como-lida`. 🟢

## Fluxo 2 — Notificação por usuário/nível

1. `createByUser` cria direto o registro + evento. 🟢
2. `createByUserLevel` replica o fan-out para usuários do nível informado. 🟢
3. Sem driver de broadcast (default `null`): registro persiste, sem tempo real. 🟢

## Fluxo 3 — Barreira de comunicado (ciência compulsória)

1. `LoginController` (após autenticação) busca o comunicado mais recente do tipo de usuário; se `repeat_on_login`, reinicia confirmação e redireciona para `/avisos`. 🟢
2. Cada requisição GET (não-JSON, não-PJAX) passa por `AnnouncementMiddleware`: comunicado vigente do tipo (cache 7 dias); se `show_confirmation` e sem `confirmed_at` → flash "Confirme a ciência do aviso antes de prosseguir!" + redirect `/avisos`. 🟢
3. `AnnouncementUserController@confirm` grava `confirmed_at` em `announcement_users`; as rotas de aviso/polling estão fora do middleware (sem recursão). 🟢
4. Mutação de comunicado (`AnnouncementObserver` saved/deleted/restored) limpa o cache por tipo. 🟢

## Fluxo 4 — Publicação de comunicado

1. Gestor com `can:view|create|modify:{Process::ANNOUNCEMENT}` acessa `/avisos/publicacao`. 🟢
2. Conteúdo aceito com sanitização por allowlist no mutator do modelo; público salvo em `announcement_user_types`. 🟢
3. Exibição na tela `/avisos` com `show_confirmation` e `show_vacancy`. 🟢

## Fluxo 5 — Mensagens morfáveis

1. `MessageService.create` em transaction; update/delete exigem autoria (`AuthorizationException` para outro autor). 🟢
2. `messageable` (morph) vincula a mensagem a registros de domínio; migração 2025-07 moveu "observações antigas" para `messages`. 🟢

## Fluxo 6 — Comunicados escolares

1. Telas legacy `educar_comunicados_escolares_{lst,det,cad}.php` com `clsPermissoes->permissao_cadastra(SchoolNotice::PROCESS, ..., 7)`. 🟢
2. CRUD de avisos por instituição/escola com título, descrição, data, hora e local — sem integração com o centro de notificações nem com a barreira. 🟡

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Sem driver de broadcast | persiste no banco; badge desatualizado até polling | 🟢 |
| Processo sem menu (`createByPermission`) | `Menu::where(process)->first()` null → erro de runtime (sem mensagem amigável) | 🟢 🟡 |
| Falha no broadcast | notificação existe, tempo real falha silencioso | 🟢 🟡 |
| Falha de canal externo | legado não tem canal externo (alvo define retentativas) | 🟢 (bastão) |
| Vários comunicados | só o `latest()` por tipo vale por vez | 🟢 |
| Broadcast para usuário excluído | canal derivado de md5(user_id) sem validação de existência no broadcast | 🟡 |

## Pontos de Fail-silente (coleta para o Revisor)

- Canal de broadcast público: `Channel` (não `PrivateChannel`) com md5(user_id) — sem autenticação de assinatura (qualquer sessão logada pode escutar). 🟡
- Fan-out N+1: por usuário, 1 insert + 1 evento (sem bulk, sem fila dedicada). 🟡
- `announcement_users.read_at` citado no DDL sem fluxo de escrita identificado (apenas `confirmed_at` tem controller). 🔴
- Comunicados escolares isolados: sem evento, sem notificação, sem barreira. 🟡
- Sem retentativas/transbordo: broadcast perde-se se o driver estiver fora. 🟡
