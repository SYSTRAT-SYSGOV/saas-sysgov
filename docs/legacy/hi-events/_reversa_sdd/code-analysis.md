# Análise Técnica do Código (Code Analysis)

**Projeto**: Hi.Events  
**Nível de Documentação**: Completo  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  

---

## 1. Módulo: `backend` (Arquitetura Core Laravel)

- **Linguagem Principal**: PHP 8.2+ 🟢
- **Framework**: Laravel 10/11 com Domain-Driven Design (DDD) 🟢
- **Padrão de Arquitetura**: Action → Handler → Domain Service → Repository 🟢
- **Localização**: `backend/`

### 1.1 Fluxo de Controle e Componentes Chave
- **Actions**: Estendem `BaseAction` e respondem exclusivamente através de helpers padrão (`resourceResponse()`, `jsonResponse()`, `errorResponse()`, `deletedResponse()`). Nunca utilizam `response()->json()` direto.
- **DTOs**: Utilizam Spatie Laravel Data e estendem `BaseDataObject`.
- **Exceções**: Exceções de domínio personalizadas (ex: `ResourceConflictException`, `UnauthorizedException`), convertidas automaticamente em `ValidationException` ou respostas formatadas de erro.
- **Camada de Dados**: Eloquent ORM restrito a Repositórios (`runQuery()`). Reuso de métodos genéricos e `incrementEach()` / `decrementEach()` em soft-deletes.

### 1.2 Segurança e Validação
- **Autenticação**: Laravel Sanctum / Sessões com cookies configuráveis (`AuthCookieSameSite`).
- **Autorização**: Permissões baseadas em `Permission` (ex: `Permission::VIEW_FINANCIALS`, `Permission::EDIT`), verificação via `#[RequiresPermission]` ou `isActionAuthorized`.
- **Proteção contra Abuso e Spam**: `EventSpamCheckDispatchService`, validação de nomes de pessoas (`PersonNameRule`) e sanitização de HTML com `HtmlPurifierService` e `EmailContextHtmlEscaper`.

---

## 2. Módulo: `frontend` (SSR React & Mantine)

- **Linguagem Principal**: TypeScript / React 🟢
- **Framework**: React 18, Mantine UI, Vite SSR 🟢
- **Roteamento e Estado**: React Query para dados remotos, SSR com suporte a `AsyncLocalStorage` (`utilites/ssrRequestContext.ts`).
- **Localização**: `frontend/`

### 2.1 Fluxo de Controle e Componentes Chave
- **Layouts e Estilos**: Componentes Mantine para UI, módulos SCSS para layouts responsivos. Tokens visuais centralizados no tema Mantine.
- **Internacionalização**: Lingui com extração e compilação de mensagens (`locales.ts`).
- **Notificações**: Utilização de `showSuccess` / `showError` (`utilites/notifications.tsx`), evitando a chamada crua do Mantine.
- **Controle de Acesso**: Hook `useAccess()` para verificar permissões de forma declarativa (`WriteAccess`, `CreateButton`, itens de `ActionMenu`).

---

## 3. Módulo: `orders` (Gestão de Pedidos e Ingressos)

- **Responsabilidade**: Ciclo de vida de pedidos, reserva de ingressos, expiração de reservas e emissão de bilhetes. 🟢
- **Localização**: `backend/app/Http/Actions/Orders`, `backend/app/Services/Domain/Order`

### 3.1 Fluxo de Controle
1. **Iniciação de Reserva**: Criação de pedido com status `RESERVED`. Ingressos retidos temporariamente.
2. **Confirmação**: Mudança de status para `COMPLETED` ou `AWAITING_OFFLINE_PAYMENT`.
3. **Expiração/Cancelamento**: Liberação de assentos e ingressos se o tempo de checkout expirar (`ABANDONED`) ou cancelamento explícito (`CANCELLED`).

### 3.2 Regras de Negócio e Algoritmos
- **Reserva de Assentos**: Atribuição e bloqueio de assento no mapa (`SeatClaimService`).
- **Contadores de Venda**: Promo codes, volume de vendas de produtos (`products.sales_volume`) e afiliados movem-se apenas quando o pedido é concluído (`isOrderCompleted()`).

---

## 4. Módulo: `payments` (Processamento de Pagamentos e Stripe)

- **Responsabilidade**: Orquestração de transações financeiras, integração Stripe, webhooks e taxas da plataforma. 🟢
- **Localização**: `backend/app/Http/Actions/Orders/Payment`, `backend/app/Services/Domain/Payment/Stripe`

### 4.1 Fluxo de Controle
1. **Criação de Payment Intent**: `CreatePaymentIntentActionPublic` gera a sessão/intent do Stripe.
2. **Processamento e Webhooks**: Confirmação assíncrona via webhooks Stripe (`DispatchEventWebhookJob`).
3. **Reembolsos e Estornos**: Estorno total ou parcial, com liberação proporcional de ingressos e assentos.

### 4.2 Segurança Financeira
- Redação automática de métricas financeiras para usuários sem `Permission::VIEW_FINANCIALS` (`FinancialStatsRedactor`).