# ErrorTracking (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir o módulo no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Levantar consumo real do HoneyBadger em produção (api_key ativo? eventos acontecendo? quota do plano?). 🔴
- [ ] Decidir provença do rastreamento no alvo: mantém SaaS, adota self-hosted (Sentry open source?) ou telemetria própria. 🔴
- [ ] Confirmar se os eventos automáticos do pacote estiveram ativos historicamente (data de telemetria). 🔴

## Fase 1 — Modelo e arquitetura

- [ ] Definir `ErrorTracker` com fila dedicada (jobs persistentes, como o legado não tem). 🔴
- [ ] Definir seleção de canal por configuração (SaaS vs e-mail) sem bind manual frágil. 🟡
- [ ] Persistir histórico local de erros (tabela) para pós-falha do envio e rate-limit próprio. 🔴

## Fase 2 — Regras

- [ ] Implementar lista única de exceções excluídas (sem duplicata das duas listas do legado). 🟢 🟡
- [ ] Anexar ao contexto: tenant/escola, usuário autenticado (id), rota, request ID — substituindo o print cru do request. 🔴
- [ ] Sanitizar payload: lista de campos sensíveis (senhas, CPF, dados de aluno) + whitelist de contexto. 🔴 (capa SupportModules)
- [ ] Para rastejo de console: incluir argv/comandos filtrados no contexto. 🟡

## Fase 3 — Canais

- [ ] HoneyBadger (ou sucessor): singleton por processo, timeout configurável, retransmissão com backoff. 🔴 🟡
- [ ] Canal e-mail: ativação via config real, renderização moderna do HTML de erro, não silenciar falhas (log). 🔴
- [ ] Fila de envio separada da fila principal para não reproduzir erros cadeia de bugs do Horizon. 🔴 🟡

## Fase 4 — Integrações

- [ ] Conectar handler de exceções do alvo ao tracker (single point). 🟢
- [ ] Logar falha do próprio tracker sem recursão infinita. 🟡
- [ ] Corrigir rota sem controller: Handler tolerante (trata closure/console). 🟡

## Fase 5 — Verificação

- [ ] Testes: toggle off, exceção excluída, payload sanitizado (CPF/senha ausentes), console sem contexto, falha de rede não impacta o usuário. 🔴 🟡
- [ ] Observabilidade do próprio tracker (métricas de envio/falha). 🔴
