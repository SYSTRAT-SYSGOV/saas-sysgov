# Visão Geral da Arquitetura do Sistema (Architecture Overview)

**Projeto**: Hi.Events  
**Nível de Documentação**: Completo  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Data de Síntese**: 2026-10-24  

---

## 1. Sumário Executivo e Estilo Arquitetural

O **Hi.Events** é uma plataforma multi-inquilino de gestão de eventos, ingressos e assentos reservados, estruturada sob os princípios de **Domain-Driven Design (DDD)**, **Arquitetura em Camadas Desacopladas** e **Aplicações Isomórficas/SSR**.

O sistema é dividido primariamente entre:
- **Backend**: API REST stateless em **PHP 8.2+ / Laravel**, estruturada em camadas bem definidas (`Action` → `Handler` → `Domain Service` → `Repository`), com isolamento rigoroso de Eloquent em repositórios, DTOs tipados (Spatie Laravel Data) e controle de acesso granular baseado em permissões (RBAC).
- **Frontend**: Aplicação web com suporte a **Server-Side Rendering (SSR)** em **React 18 / TypeScript / Mantine UI**, utilizando **React Query** para gerenciamento de estado de servidor e **AsyncLocalStorage** para isolamento de requisições no contexto SSR do Node.js.
- **Camada de Dados & Infraestrutura**: Banco de dados relacional **PostgreSQL 15**, cache e filas em memória via **Redis**, armazenamento de assets via protocolo S3 (**MinIO / AWS S3**), terminação SSL e proxy reverso via **Nginx**, e integração financeira profunda com a **Stripe API**.

---

## 2. Visão Arquitetural C4

A arquitetura detalhada em diferentes níveis de abstração está decomposta nos artefatos específicos:

1. **Nível 1 — Contexto de Sistema**: [`c4-context.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/c4-context.md)
   - Mapeia as fronteiras da plataforma com compradores de ingressos, participantes, organizadores de eventos, operadores de bilheteria e superadministradores, além de sistemas externos (Stripe, Provedores SMTP/Mailpit, S3/MinIO e IdPs corporativos via OIDC/SAML).
2. **Nível 2 — Containers de Infraestrutura**: [`c4-containers.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/c4-containers.md)
   - Descreve a interação entre os containers Docker (`nginx`, `frontend`, `backend`, `queue_worker`, `pgsql`, `redis`, `minio`).
3. **Nível 3 — Componentes Internos**: [`c4-components.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/c4-components.md)
   - Detalha o fluxo interno do container backend: Single Action Controllers estendendo `BaseAction`, guardas de autorização `#[RequiresPermission]`, Handlers, Domain Services (`OrderService`, `StripePaymentService`, `SeatClaimService`, `EventSpamCheckDispatchService`), Redatores Financeiros e Repositórios.

---

## 3. Modelo de Dados e Entidades (ERD)

O diagrama completo entidade-relacionamento encontra-se em [`erd-complete.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/erd-complete.md).

### 3.1 Pilares do Modelo de Dados 🟢
- **Isolamento Multi-Tenant**: Cada conta (`Account`) gerencia múltiplos organizadores (`Organizer`), os quais possuem seus respectivos eventos (`Event`). Usuários vinculam-se a contas por meio de tabelas associativas (`AccountUser`) com papéis e concessões específicas de permissão.
- **Ocorrências Temporais Independentes**: A tabela `event_occurrences` desacopla a definição do evento de suas datas físicas de execução. As antigas colunas `events.start_date` e `events.end_date` são tratadas como congeladas para rollback v1 e nunca devem ser acessadas.
- **Gestão de Assentos e Lotes**: `EventSeatMap` instancia o mapa estrutural `SeatMap`, e reservas atômicas de assentos são gerenciadas na tabela `SeatClaim`, com status derivados em tempo de execução (`HELD`, `SOLD`, `BLOCKED`).

---

## 4. Integrações Externas e Comunicação 🟢

| Sistema Externo | Tipo / Protocolo | Direção | Propósito e Resiliência |
|---|---|---|---|
| **Stripe Payments** | HTTPS / REST | Saída | Criação de Payment Intents, gerenciamento de métodos de pagamento salvos e geração de sessões de checkout. |
| **Stripe Webhooks** | HTTPS / POST | Entrada | Notificação assíncrona de eventos de cobrança (`payment_intent.succeeded`, `charge.refunded`). Validado por assinatura criptográfica. |
| **Stripe Terminal** | WebSockets / REST | Saída | Comunicação com leitores físicos de cartão (POS) em bilheterias presenciais (`BoxOffice`). |
| **Provedores SMTP (SES / Mailpit)** | SMTP / TLS | Saída | Entrega transacional de ingressos (PDF com QR Code), recibos e notificações de acesso, sempre acoplados ao hook `afterCommit()`. |
| **Object Storage (S3 / MinIO)** | S3 Protocol (HTTPS) | Bidirecional | Bucket público para banners e avatares; bucket privado para relatórios fiscais e dados protegidos. |
| **Enterprise SSO (OIDC / SAML)** | HTTPS / OIDC | Entrada | Autenticação unificada de usuários corporativos (recurso sob licença Enterprise). |

---

## 5. Dívidas Técnicas e Oportunidades de Refatoração 🟡

1. **Colunas Legadas de Data no Evento (`events.start_date` / `events.end_date`)**:
   - *Impacto*: Permanecem na tabela de eventos exclusivamente para viabilizar rollback v1. Qualquer código desavisado que leia essas colunas causará inconsistências com eventos multi-data.
   - *Mitigação*: Manter regras rígidas de linting e validação estática impedindo o uso dessas colunas fora das migrações históricas.
2. **Consistência de Soft Deletes com Contadores Atômicos**:
   - *Impacto*: O método tradicional `increment()` / `decrement()` do Eloquent falha com exceção ao tentar alterar linhas com soft-delete ativo.
   - *Mitigação*: Utilizar obrigatoriamente os helpers `incrementEach()` e `decrementEach()` em toda a camada de repositórios.
3. **Validação de Duplicatas em Requisições**:
   - *Impacto*: O uso da regra nativa `distinct` do Laravel possui complexidade $O(n^2)$ e executa antes da etapa de autorização, abrindo brechas para degradação de performance / DoS.
   - *Mitigação*: Validação pós-autorização em ganchos `withValidator()` (ex: padrão adotado em `UpdateEventSeatMapBandProductsRequest`).
4. **Isolamento de Estado em SSR**:
   - *Impacto*: Em servidores Node.js compartilhados no SSR, colocar dados de usuário em variáveis globais ou defaults do axios pode vazar sessões entre requisições concorrentes.
   - *Mitigação*: Uso estrito de `AsyncLocalStorage` (`utilites/ssrRequestContext.ts`).

---

## 6. Rastreabilidade e Matriz de Impacto

Consulte a [`Spec Impact Matrix`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/traceability/spec-impact-matrix.md) para verificar como alterações nos módulos de Pedidos, Pagamentos, Assentos e Permissões afetam as garantias de negócio do sistema.
