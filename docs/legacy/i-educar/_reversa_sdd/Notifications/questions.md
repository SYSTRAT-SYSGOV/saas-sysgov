# Notifications (i-Educar legado) — Perguntas abertas

> Perguntas para o usuário/alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Negócio

1. Qual a política de retenção de notificações no alvo (as do legado são mantidas para sempre)? 🔴
2. Comunicados da Secretaria de Educação (externos ao tenant) entram como comunicado compulsório por igual no alvo? 🟡
3. A barreira de ciência continua bloqueando toda a navegação ou passa a ser bloqueio parcial (por módulo)? 🟡
4. Comunicados escolares (`school_notices`) devem migrar para o hub unificado ou permanecer por escola/data? 🔴

## Modelo

5. As 5 categorias fixas do legado viram `category enum` no alvo ou categorias configuráveis (dinâmicas)? 🟡
6. `notification_type` não tem FK declarada para `notifications.type_id` — no alvo vira FK ou referência lógica? 🟡
7. `announcement_users.read_at` existe no DDL sem fluxo de escrita identificado: remover, preencher retroativamente ou implementar de vez? 🔴
8. `messages` (morph) e `school_notices` competem com o hub: unificar categoria/prioridade no `core_notifications` ou manter entidades separadas? 🟡

## Entrega e canais

9. Quais canais do omnichannel (In-App, Push, Email, WhatsApp) são prioritários para o alvo e qual provedor de cada um? 🔴
10. O canal de broadcast passa a ser privado autenticado (PrivateChannel por usuário) — exige mudança no frontend e no driver? 🟡
11. Sem driver PUSHER configurado o legado degrada a "só banco": essa degradação é aceitável no alvo ou o driver passa a ser obrigatório? 🟡
12. Retentativas de canais externos (biblioteca/imersão): quantas tentativas, intervalo e canal de destino em caso de falha definitiva (DLQ)? 🔴
13. Fan-out em bulk: volumes esperados por evento (ex. exportação com milhares de usuários) definem tamanho de batch e worker dedicado? 🟡

## Experiência

14. O badge de não lidas atualiza por polling (`/notificacoes/quantidade-nao-lidas`) ou passa a tempo real obrigatório no alvo? 🟡
15. `show_vacancy` (exibição de vagas no comunicado) continua como flag ou vira template de comunicado? 🔴
16. Command Palette/badges da unidade `Navigation` devem consumir as notificações (badge_expression)? 🟡

## Segurança e auditoria

17. Auditoria de ciência: registrar IP/user-agent em `core_announcement_reads` (como no bastão) ou só `acked_at`? 🟡
18. O canal md5(user_id) do legado é inseguro para enumerar; confirma-se o abandono em favor de canais privados? 🟡
19. A ciência compulsória comprovada juridicamente exige hash/imutabilidade do registro de leitura? 🔴

## Transversal

20. Invalidação de cache de comunicados segue eventos da capa `SupportModules` ou Observer explícito por entidade? 🟡

---

*Cumulativo: 527 perguntas em 27 units.*
