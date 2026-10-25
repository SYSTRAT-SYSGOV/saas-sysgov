# Notifications (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir notificações e comunicados no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.
> Transversais (auditoria, cache, barreira) conforme unit `SupportModules`.

---

## Fase 0 — Descoberta

- [ ] Inventariar em produção: volume de notificações por tipo (1–5), tempo de retenção, quantas organizações têm broadcast ativo (driver != null). 🔴
- [ ] Levantar uso real dos comunicados: quantos avisos com `show_confirmation`/`repeat_on_login` e o impacto da barreira na operação escolar. 🔴
- [ ] Confirmar se `announcement_users.read_at` é preenchido por algum fluxo não identificado (bancas de leitura). 🔴
- [ ] Verificar se `messages` (2025-07) já carrega a migração das "observações antigas" por completo em produção. 🟡

## Fase 1 — Modelo de dados

- [ ] Criar `core_notifications` (bastão, tabela 92): UUID, tenant, user, título/corpo, categoria, prioridade, canais, `read_at`, `action_url`, timestamps. 🟢
- [ ] Criar `core_announcements` + `core_announcement_reads` (tabelas 93–94) com auditoria de ciência (who/when/ip) substituindo a pivot `announcement_users`. 🟢
- [ ] Migrar os 5 tipos fixos (`NotificationType`) para categorias no alvo; mapear 1→transferência, 2→outros, 3/4→exportações, 5→busca ativa. 🟡
- [ ] Decidir destino de `messages` e `school_notices`: hub único (categoria/prioridade/canal) ou módulos próprios. 🟡

## Fase 2 — Serviço de notificação

- [ ] Portar `NotificationService` para o alvo com fan-out em **bulk insert** (elimina N+1 do legado) + fila assíncrona por canal. 🟡
- [ ] Broadcast: canais privados autenticados (`PrivateChannel` por usuário) em vez de canal público `md5(user_id)`. 🟡
- [ ] Implementar retentativas/transbordo por canal (in-app não bloqueia webhook/email), conforme bastão. 🟢
- [ ] Presign de links para exportações mantido (tipos 3/4) no alvo. 🟢

## Fase 3 — Comunicados

- [ ] Portar o CRUD de publicação (`Process::ANNOUNCEMENT`) com sanitização de HTML por allowlist no endpoint (não só no mutator). 🟡
- [ ] Recriar barreira de ciência: middleware alvo com bloqueio por ciência pendente e `repeat_on_login` (reset por login). 🟢
- [ ] Registro de audiência por **tipo de usuário** preservado; ciência individual por usuário em `core_announcement_reads`. 🟢
- [ ] Cache de comunicado vigente por tipo com invalidação em mutação (Observer explícito ou eventos da capa). 🟢

## Fase 4 — Migração de dados

- [ ] Migrar `public.notifications` (e estados de leitura) por tenant, preservando `type_id` mapeado. 🟡
- [ ] Migrar `announcements` + pivôs; decisões para ciências já resposta: importar `confirmed_at` como leitura histórica. 🟡
- [ ] Decidir destino dos comunicados escolares (`school_notices`) — unificar no hub ou manter módulo de escola. 🟡
- [ ] Não migrar notificações já lidas há mais do que a política de retenção definida em Fase 0. 🟡

## Fase 5 — Verificação

- [ ] Paridade de fan-out: para um processo de teste, o conjunto de usuários notificados no alvo deve igualar o legado (ativos + `visualiza=1`). 🟡
- [ ] Teste da barreira: GET bloqueado até ciência; reset por login com `repeat_on_login`; rotas isentas funcionam. 🟢
- [ ] Teste de degradação: sem driver de broadcast configurado, notificação persiste e fila de canais externos entra em retentativa. 🟡
- [ ] Teste de sanitização: tags fora do allowlist removidas na entrada e não renderizadas na saída. 🟢
- [ ] Contadores: centro de notificações (`não lidas`) idêntico ao legado para um usuário de referência. 🟡
