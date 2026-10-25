# Contratos de API e Integração: Pagamentos (`pagamentos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

Este documento detalha os contratos de API REST e os schemas de dados para a unidade **Pagamentos e Stripe** (`pagamentos`). Ele cobre a geração de sessões de checkout/intents, recebimento seguro de webhooks assinados pelo gateway Stripe, emissão de reembolsos e relatórios financeiros protegidos por permissão.

---

## 2. Contratos de Endpoints Públicos

### 2.1 Criar Payment Intent no Stripe

- **Método**: `POST`
- **Caminho**: `/api/public/events/{event_id}/orders/{short_id}/payment-intent`
- **Autenticação**: Pública (Throttle: `30,1,public-payment-intent`)
- **Headers**: `Content-Type: application/json`

#### Schema da Resposta de Sucesso (`HTTP 200 OK` — `PaymentIntentResource`) 🟢

```json
{
  "data": {
    "provider": "stripe",
    "provider_intent_id": "pi_3NskL2K1234567890",
    "client_secret": "pi_3NskL2K1234567890_secret_abc123xyz",
    "amount": 25000,
    "currency": "BRL",
    "status": "PENDING",
    "stripe_account_id": "acct_organizer123",
    "created_at": "2026-10-24T20:55:00Z"
  }
}
```

---

### 2.2 Webhook do Stripe (Ingestão de Notificações)

- **Método**: `POST`
- **Caminho**: `/api/public/webhooks/stripe`
- **Autenticação**: Assinatura Criptográfica via Header `Stripe-Signature`
- **Processamento**: Assíncrono com resposta imediata `HTTP 200 OK`

#### Formato do Payload Recebido (`Stripe Webhook Event`) 🟢

```json
{
  "id": "evt_1NskL3K1234567890",
  "object": "event",
  "api_version": "2023-10-16",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3NskL2K1234567890",
      "object": "payment_intent",
      "amount": 25000,
      "amount_received": 25000,
      "currency": "brl",
      "status": "succeeded",
      "metadata": {
        "order_id": "142",
        "order_short_id": "ord_8f93a1c8b2",
        "event_id": "42"
      }
    }
  }
}
```

---

## 3. Contratos Administrativos (Gestão de Vendas)

### 3.1 Emitir Reembolso / Estorno de Pedido

- **Método**: `POST`
- **Caminho**: `/api/manage/events/{event_id}/orders/{order_id}/refund`
- **Permissões Exigidas**: `EDIT` + `VIEW_FINANCIALS` + `ISSUE_REFUNDS`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`

#### Schema do Payload de Entrada (`RefundOrderRequest`) 🟢

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["refund_amount", "reason"],
  "properties": {
    "refund_amount": {
      "type": "integer",
      "minimum": 1,
      "description": "Valor total a ser estornado em centavos"
    },
    "reason": {
      "type": "string",
      "enum": ["duplicate", "fraudulent", "requested_by_customer"],
      "description": "Motivo padrão do estorno perante o Stripe"
    },
    "cancel_order": {
      "type": "boolean",
      "default": true,
      "description": "Se verdadeiro, transiciona o status do pedido para CANCELLED e revoga todos os ingressos"
    },
    "attendee_ids_to_cancel": {
      "type": "array",
      "items": { "type": "integer" },
      "description": "Lista de participantes cujos ingressos devem ser cancelados em reembolso parcial"
    }
  }
}
```

#### Schema da Resposta de Sucesso (`HTTP 200 OK` — `OrderRefundResource`) 🟢

```json
{
  "data": {
    "id": 18,
    "order_id": 142,
    "amount": 25000,
    "currency": "BRL",
    "status": "SUCCEEDED",
    "provider_refund_id": "re_3NskL2K987654321",
    "created_at": "2026-10-24T21:10:00Z"
  }
}
```

---

### 3.2 Relatório Financeiro e Métricas com Redação

- **Método**: `GET`
- **Caminho**: `/api/manage/events/{event_id}/financials`
- **Guarda de Acesso**: Se o usuário não possuir `VIEW_FINANCIALS`, os campos financeiros monetários retornam `null` (`FinancialStatsRedactor`).

#### Resposta para Usuário COM `VIEW_FINANCIALS` 🟢

```json
{
  "data": {
    "currency": "BRL",
    "gross_sales_amount": 1250000,
    "net_sales_amount": 1187500,
    "platform_fees_amount": 62500,
    "tax_amount": 125000,
    "total_orders_completed": 50,
    "total_attendees": 75
  }
}
```

#### Resposta para Usuário SEM `VIEW_FINANCIALS` (Redigida) 🟢

```json
{
  "data": {
    "currency": "BRL",
    "gross_sales_amount": null,
    "net_sales_amount": null,
    "platform_fees_amount": null,
    "tax_amount": null,
    "total_orders_completed": 50,
    "total_attendees": 75
  }
}
```

---

## 4. Códigos de Erro de Pagamento Padronizados 🟢

| Código de Erro | Status HTTP | Causa |
|---|:---:|---|
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Header `Stripe-Signature` não confere com o HMAC computado. |
| `PAYMENT_INTENT_CREATION_FAILED` | 422 | Erro retornado pela API Stripe ao registrar a cobrança. |
| `UNAUTHORIZED_REFUND_ATTEMPT` | 403 | Usuário autenticado sem permissão `ISSUE_REFUNDS`. |
| `REFUND_AMOUNT_EXCEEDED` | 422 | Tentativa de estorno de valor superior ao total pago na ordem. |
