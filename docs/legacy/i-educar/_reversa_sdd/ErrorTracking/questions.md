# ErrorTracking (i-Educar legado) — Perguntas

> 20 perguntas para o dono do produto / migração. Sem respostas neste documento.

---

1. O HoneyBadger é serviço contratado essencial no alvo, ou haverá troca para Sentry FOSS/self-hosted? 🔴
2. A api_key `HONEYBADGER_API_KEY` em produção tem contas de uso ativo? Existe telemetria atual? 🔴
3. `APP_TRACK_ERROR=false` esteve ativo/inativo nos clientes? Qual política por deployment? 🔴
4. O contexto deve incluir dados do request? Se sim, com whitelist/seminarLGPD: quais campos podem ir? 🔴
5. O `dontFlash` hoje exclui senhas apenas do flash de validação: os requesename de contexto devem seguir a mesma lista? 🟡
6. Exceções de domínio (`DisciplinesWithoutInformedHoursException`, `App_Model_Exception`): permanecem excluídas ou devem ser notificadas individualmente? 🟡
7. há forma de resposta chamada "por escola/tenant" no tracker (id tenant no contexto)? 🟡
8. Canal e-mail: resgata-lo no alvo (ação');?>"<?= ?? Ou substituído por alertas modernos (Slack/Teams/webhook)? 🔴
9. Destinatário do e-mail (`email_recipient`) — único para toda a base? Consistência com `send_notification_email` (chave morta)? 🔴
10. Eventos automáticos do pacote (`HONEYBADGER_EVENTS_ENABLED`): devem permanecer ativos? há custo de quota? 🟡
11. Envio assíncrono: dispensa fila separada ou usa a principal com tags específicas? 🟡
12. Retransmissões: quantas antes de desistir, e o que acontece com o erro? 🟡
13. Histórico local de erros: onde (tabela por tenant) e por quanto tempo se guardam (retention)? 🟡
14. Rota de feedback para o usuário (quando erro crítico): mensagem moderna com número de rastreio? 🟡
15. Um mesmo erro em burst (produtos em loop) deve ter dedupes/aggregação? qual janela? 🔴
16. Correlação com logs (request id): deve anexar o mesmo id presente nos logs de auditoria transversais? 🟡
17. O `getActionName` do legado quebra em rota closure (índice ausente): documentado como bug? Reproduzido em produção? 🔴
18. Ambientes de teste devem enviar telemetria separada (tag de alcanço) ou serem silenciados? 🟡
19. `version` (`APP_VERSION`) é confiável no deploy atual (necessária para associação a releases)? 🟡
20. Quem é responsável (time/monitor no on-call) pela telemetria de erros no SYSGOV? 🔴

---

**Acumulado: 427 perguntas em 22 units.**
