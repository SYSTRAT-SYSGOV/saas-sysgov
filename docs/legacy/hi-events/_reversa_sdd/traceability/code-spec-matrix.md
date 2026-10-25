# Matriz de Rastreabilidade Código × Especificações (Code-Spec Matrix)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral de Cobertura

Esta matriz estabelece a correspondência exata entre os artefatos de código-fonte legados do projeto **Hi.Events** (backend em Laravel e frontend em React) e as unidades de especificação executáveis geradas pelo framework Reversa em `_reversa_sdd/`.

---

## 2. Matriz de Mapeamento

| Arquivo do Legado | Classe / Símbolo Principal | Unit Correspondente | Cobertura |
|---|---|---|:---:|
| `backend/app/Http/Actions/Orders/CreateOrderActionPublic.php` | `CreateOrderActionPublic` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Http/Actions/Orders/CompleteOrderActionPublic.php` | `CompleteOrderActionPublic` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Services/Domain/Order/OrderService.php` | `OrderService` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/DomainObjects/Status/OrderStatus.php` | `OrderStatus` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Repositories/OrderRepository.php` | `OrderRepository` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Models/Order.php` | `Order` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Models/OrderItem.php` | `OrderItem` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Models/Attendee.php` | `Attendee` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Models/AttendeeCheckIn.php` | `AttendeeCheckIn` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Mail/OrderConfirmationMail.php` | `OrderConfirmationMail` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Jobs/ExpireAbandonedOrdersJob.php` | `ExpireAbandonedOrdersJob` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/app/Http/Actions/Orders/Payment/CreatePaymentIntentActionPublic.php` | `CreatePaymentIntentActionPublic` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Http/Actions/Orders/Payment/StripeWebhookAction.php` | `StripeWebhookAction` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Services/Domain/Payment/Stripe/StripePaymentService.php` | `StripePaymentService` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/DomainObjects/Status/OrderPaymentStatus.php` | `OrderPaymentStatus` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Models/StripePayment.php` | `StripePayment` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Models/OrderRefund.php` | `OrderRefund` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Models/OrderPaymentPlatformFee.php` | `OrderPaymentPlatformFee` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Services/Access/FinancialStatsRedactor.php` | `FinancialStatsRedactor` | `pagamentos/` | 🟢 CONFIRMADO |
| `backend/app/Services/Domain/Seating/SeatClaimService.php` | `SeatClaimService` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/Models/SeatMap.php` | `SeatMap` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/Models/EventSeatMap.php` | `EventSeatMap` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/Models/SeatClaim.php` | `SeatClaim` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/Models/EventOccurrence.php` | `EventOccurrence` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/Http/Requests/UpdateEventSeatMapBandProductsRequest.php` | `UpdateEventSeatMapBandProductsRequest` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/ee/app/Services/Seating/EnterpriseSeatMapService.php` | `EnterpriseSeatMapService` | `assentos-e-capacidade/` | 🟢 CONFIRMADO |
| `backend/app/DomainObjects/Enums/Permission.php` | `Permission` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Models/User.php` | `User` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Models/AccountUser.php` | `AccountUser` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Models/AccountUserPermission.php` | `AccountUserPermission` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Services/Access/AccountUserAccessService.php` | `AccountUserAccessService` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Http/Middleware/EnsureUserHasEditPermission.php` | `EnsureUserHasEditPermission` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Rules/PersonNameRule.php` | `PersonNameRule` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Services/Security/HtmlPurifierService.php` | `HtmlPurifierService` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Services/Security/EventSpamCheckDispatchService.php` | `EventSpamCheckDispatchService` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `frontend/src/hooks/useAccess.ts` | `useAccess()` | `autenticacao-e-permissoes/` | 🟢 CONFIRMADO |
| `backend/app/Http/Actions/BaseAction.php` | `BaseAction` | Transversal (`architecture.md`) | 🟢 CONFIRMADO |
| `backend/app/Data/BaseDataObject.php` | `BaseDataObject` | Transversal (`architecture.md`) | 🟢 CONFIRMADO |
| `frontend/src/router.tsx` | App Router & Layouts | Transversal (`architecture.md`) | 🟢 CONFIRMADO |
| `frontend/src/utilites/ssrRequestContext.ts` | `ssrRequestContext` | Transversal (`architecture.md`) | 🟢 CONFIRMADO |
| `docker/development/docker-compose.dev.yml` | Stack de Desenvolvimento | Transversal (`c4-containers.md`) | 🟢 CONFIRMADO |

---

## 3. Resumo de Cobertura das Especificações

- **Total de Arquivos Críticos Mapeados**: 41 arquivos
- **Cobertura Funcional do Núcleo de Domínio**: **100%** (todas as rotas e regras de negócio de pedidos, pagamentos, assentos e permissões mapeadas a uma unidade SDD formal).
- **Arquivos sem unit direta (Transversais)**: Mapeados na arquitetura global (`architecture.md`, `c4-containers.md`, `c4-components.md`, `erd-complete.md`).
