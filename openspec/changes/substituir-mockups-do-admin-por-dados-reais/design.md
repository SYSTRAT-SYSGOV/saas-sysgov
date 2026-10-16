# Design

## Contexto

Estado atual por tela do web-admin (leitura do código):

| Tela | Fonte dos dados hoje |
|---|---|
| Visão Geral & KPIs | `INITIAL_METRIC_CARDS`, `INITIAL_CHART_*`, `INITIAL_RECENT_ACTIVITIES` (mock); refresh = `setTimeout` |
| Desempenho & Métricas | `TRAFFIC_DISTRIBUTION` e `MONTHLY_GROWTH` fixos no componente |
| Registros & Tabelas | `INITIAL_GENERIC_RECORDS` (mock), CRUD em memória |
| APIs & Integrações | `INITIAL_API_CONNECTORS` (mock) + ping com `Math.random()` |
| Meu Perfil & Segurança | valores fixos ("Carlos Eduardo Silva", sessões falsas); ações só exibem aviso |
| Configurações | identidade visual no `localStorage`; segurança/notificações sem efeito |
| Logs & Auditoria | `GET /api/admin/audit-logs`, **com fallback para mock** |
| Faturamento & Invoices | `GET /api/admin/saas-billing/invoices`, **com fallback para mock**; baixa otimista |
| Tenants, Usuários & Permissões, Menus, Módulos, Config. de IA | API real |

Backend existente aproveitável: `GET /api/admin/monitoring` (contagens de tenants/usuários/módulos, outbox, filas, faturas vencidas), `GET /api/admin/tenants` (já com `meta.summary`: total, ativos, MRR, usuários), `GET /api/admin/audit-logs`, `GET/PATCH /api/admin/saas-billing/invoices`, tabela `personal_access_tokens` (Sanctum). **Não existem**: série histórica, troca da própria senha, atualização do próprio perfil, listagem de sessões, configurações do sistema.

## Decisões

### D1. Regra geral: nenhuma tela exibe dado fictício
Estados possíveis em toda tela do admin: carregando, vazio, erro (com "Tentar novamente") e pronto. **Proibido** cair em dado de exemplo. Um teste de arquitetura impede importar `adminMockData` em componentes de produção (ou o arquivo deixa de existir).

### D2. Visão Geral com endpoint agregado
`GET /api/admin/dashboard` devolve:
- `kpis`: `tenants_total`, `tenants_active`, `users_total`, `mrr_cents` (soma do MRR dos tenants, mesma regra de `Tenant::monthlyMrrCents`), `invoices_overdue`;
- `series.revenue`: receita **paga** por mês (`saas_invoices.paid_at`, `amount_cents`), últimos 12 meses;
- `series.growth`: novos tenants e novos usuários por mês (`created_at`);
- `recent_activity`: últimas N entradas de `audit_logs`.
Variação percentual ("vs. mês anterior") só é exibida quando há mês anterior com dado; senão, omitida (nunca inventada). Sem histórico suficiente, os gráficos mostram estado vazio explicativo. *Alternativa descartada:* compor tudo no front chamando vários endpoints — duplicaria regras de MRR e custaria N requisições.

### D3. Desempenho & Métricas
Série mensal de **contratos novos** e **encerrados** (`saas_contracts`) e **retenção** calculada (1 − encerrados/ativos no início do mês). O gráfico de distribuição de tráfego (acesso direto/API/mobile/exportações) **não tem fonte de dados** e é removido. *Validar na implementação* as colunas de `saas_contracts` (datas de início/encerramento).

### D4. APIs & Integrações vira Saúde da plataforma
Mostra o retorno de `GET /api/admin/monitoring` (banco, outbox pendente/processando/falho, fila, jobs com falha, faturas vencidas) e `generated_at`. A lista de conectores externos e o "ping" simulado saem; se no futuro houver conectores configuráveis de verdade, entram em outro change. O item de menu mantém a rota `/admin/apis`; o nome passa a "Saúde & Integrações".

### D5. Perfil, senha e sessões do administrador
Novos endpoints sob `auth:sanctum`, escopo do usuário autenticado:
- `PUT /api/admin/me/profile` — atualiza `name` (e-mail não editável aqui). Audita `admin.profile_updated`.
- `POST /api/admin/me/password` — exige `current_password`, `password` com a política vigente (mín. 8, maiúscula, minúscula, número, símbolo) e confirmação; `throttle:auth-sensivel`; **revoga todos os outros tokens** do usuário; audita `admin.password_changed`. Senha atual incorreta → 422 sem pistas.
- `GET /api/admin/me/sessions` — tokens Sanctum do usuário: `id`, `name`, `created_at`, `last_used_at`, `is_current`. Não armazenamos IP/dispositivo hoje; a tela mostra só o que existe (nome do token, criado em, último uso).
- `DELETE /api/admin/me/sessions/{id}` — revoga um token do próprio usuário (404 se for de outro usuário; não permite encerrar a sessão atual por esta rota — usa logout).
O campo "departamento" (sem coluna) é removido do formulário.

### D6. Faturamento sem fallback e sem otimismo
- Lista vazia → estado vazio; erro → erro com "Tentar novamente".
- "Marcar como pago" só atualiza a linha **depois** do 2xx; em falha, mostra o erro e não altera nada.
- "Baixar PDF" é removido até existir geração real no backend (fora do escopo).
- `plan` fixo "Enterprise Gov" e ticket médio de reserva `3546.42` saem; o ticket médio é 0 quando não há faturas.

### D7. Logs & Auditoria
Sem fallback. O backend ganha filtros opcionais (`module`, `action`, `user_id`, `from`, `to`) e `per_page`, e a tela usa a paginação do servidor (hoje lê apenas a primeira página de 50).

### D8. Configurações
Identidade visual continua no `localStorage` (por navegador) com texto explícito disso. As abas de **segurança** (2FA obrigatório, timeout, tentativas) e **notificações** são removidas: o backend já impõe essas regras e os controles da tela não surtem efeito. Configurações realmente globais ficam para um change próprio.

### D9. Registros & Tabelas
A tela é um CRUD genérico sobre registros fictícios, sem entidade correspondente. **Decisão recomendada:** remover do menu e apagar o componente. *Alternativa:* transformá-la em visão real de uma entidade existente (ex.: contratos SaaS) — fica como decisão em aberto.

### D10. Limpeza
- Apagar `services/adminMockData.ts` e tipos usados só por ele.
- Remover o código morto: `DashboardPage`, `SaaSAdminPanel`, `AdminUserManagement`, `MenuUsersAdminPage` e os componentes fiscais exclusivos do `DashboardPage` (confirmar por análise de importação antes de apagar).
- Remover o resíduo de modo demonstração: `universal-admin-session-token` em `modules/admin/api.ts` e `AuthContext.tsx`; sem token, o usuário é considerado deslogado.

## Riscos e Trade-offs

- **Remover telas/abas** muda a navegação; mitigado por listar as remoções na descrição do PR e manter rotas antigas redirecionando para a Visão Geral.
- **Séries históricas pobres** no início (poucos meses de dado): a tela mostra estado vazio claro, não dado inventado.
- **Troca de senha revoga outras sessões**: efeito desejado, mas pode surpreender; a mensagem de sucesso avisa.
- **Apagar código morto** pode quebrar importações ocultas: a remoção só ocorre com `tsc` e a suíte do painel verdes.

## Decisões em aberto (precisam de resposta do negócio)
1. **Registros & Tabelas**: remover (recomendado) ou transformar em visão real?
2. **Configurações de segurança/notificações**: remover (recomendado) ou implementar como configuração global de plataforma?
3. **PDF de fatura**: remover o botão (recomendado) ou implementar geração no backend?

## Plano de migração
Backend primeiro (novos endpoints são aditivos); depois o front. Sem migration obrigatória.
