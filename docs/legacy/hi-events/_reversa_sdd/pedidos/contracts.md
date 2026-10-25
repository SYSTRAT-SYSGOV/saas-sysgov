# Contratos de API e Integração: Pedidos (`pedidos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

Este documento formaliza os contratos operacionais de entrada e saída (HTTP REST e Webhooks) para a unidade **Pedidos e Ingressos** (`pedidos`). Por ser parte da API pública consumida por widgets embutidos e integrações externas via API Keys (`auth:api,sanctum`), estes schemas constituem um contrato público imutável.

---

## 2. Contratos de Endpoints Públicos

### 2.1 Criar Pedido de Ingressos (Reserva Temporária)

- **Método**: `POST`
- **Caminho**: `/api/public/events/{event_id}/orders`
- **Autenticação**: Pública (Throttle: `60,1,public-order`)
- **Headers**: `Content-Type: application/json`, `Accept: application/json`

#### Schema do Payload de Entrada (`CreateOrderRequest`) 🟢

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["items", "first_name", "last_name", "email"],
  "properties": {
    "first_name": {
      "type": "string",
      "description": "Primeiro nome do comprador (validado por PersonNameRule)",
      "maxLength": 100
    },
    "last_name": {
      "type": "string",
      "description": "Sobrenome do comprador (validado por PersonNameRule)",
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "E-mail de destino para envio dos ingressos"
    },
    "promo_code": {
      "type": "string",
      "description": "Código promocional de desconto opcional"
    },
    "affiliate_code": {
      "type": "string",
      "description": "Código de parceiro/afiliado para rastreio"
    },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["product_id", "product_price_id", "quantity"],
        "properties": {
          "product_id": { "type": "integer" },
          "product_price_id": { "type": "integer" },
          "quantity": { "type": "integer", "minimum": 1, "maximum": 50 },
          "seat_ids": {
            "type": "array",
            "items": { "type": "integer" },
            "description": "IDs dos assentos no mapa caso o produto seja marcado como sentado"
          }
        }
      }
    }
  }
}
```

#### Schema da Resposta de Sucesso (`HTTP 201 Created` — `OrderPublicResource`) 🟢

```json
{
  "data": {
    "short_id": "ord_8f93a1c8b2",
    "event_id": 42,
    "status": "RESERVED",
    "currency": "BRL",
    "total_amount": 25000,
    "tax_amount": 2500,
    "fee_amount": 0,
    "discount_amount": 0,
    "first_name": "Carlos",
    "last_name": "Silva",
    "email": "carlos.silva@exemplo.com",
    "expires_at": "2026-10-24T21:05:00Z",
    "items": [
      {
        "product_id": 101,
        "product_title": "Ingresso VIP - Lote 1",
        "quantity": 1,
        "price": 25000,
        "seat_ids": [404]
      }
    ],
    "created_at": "2026-10-24T20:50:00Z"
  }
}
```

---

### 2.2 Consultar Pedido por ID Amigável

- **Método**: `GET`
- **Caminho**: `/api/public/events/{event_id}/orders/{short_id}`
- **Autenticação**: Pública
- **Códigos de Resposta**:
  - `HTTP 200 OK`: Retorna `OrderPublicResource`.
  - `HTTP 404 Not Found`: Pedido inexistente ou pertencente a outro evento.

---

### 2.3 Concluir Pedido

- **Método**: `POST`
- **Caminho**: `/api/public/events/{event_id}/orders/{short_id}/complete`
- **Payload**: Opcional (dados de pagamento offline ou confirmação de intent)
- **Resposta (`HTTP 200 OK`)**: Retorna status `COMPLETED` com lista de `attendees` emitidos:

```json
{
  "data": {
    "short_id": "ord_8f93a1c8b2",
    "status": "COMPLETED",
    "attendees": [
      {
        "public_id": "att_c92b8104",
        "first_name": "Carlos",
        "last_name": "Silva",
        "status": "ACTIVE",
        "ticket_url": "https://meuevento.com/tickets/att_c92b8104"
      }
    ]
  }
}
```

---

## 3. Contratos de Erro Padronizados

Todas as respostas de erro da API seguem a estrutura uniforme de `BaseAction::errorResponse`:

```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "The selected tickets are no longer available.",
    "status": 409
  }
}
```

### Códigos Canônicos de Erro 🟢:
- `VALIDATION_ERROR` (`HTTP 422`): Campos ausentes, quantidade inválida ou regras de sanitização violadas (`PersonNameRule`).
- `RESOURCE_CONFLICT` (`HTTP 409`): Falha de concorrência ou tentativa de reservar assento já reivindicado (`SeatClaimConflict`).
- `READ_ONLY_ROLE` (`HTTP 403`): Usuário autenticado sem permissão `EDIT` tentando alterar recursos sem o atributo `#[AllowedForReadOnlyUsers]`.
- `NOT_FOUND` (`HTTP 404`): ID inexistente ou tentativa de acesso a entidade fora do escopo do pai autorizado.

---

## 4. Webhooks Disparados pelo Domínio de Pedidos 🟢

Quando um pedido sofre mutação de estado relevante, o sistema dispara webhooks aos endpoints configurados pelos organizadores:

| Evento | Gatilho | Payload |
|---|---|---|
| `order.completed` | Pedido transiciona para `COMPLETED` | Dados completos da ordem, comprador e participantes emitidos. |
| `order.cancelled` | Pedido cancelado manualmente ou estornado | Dados da ordem, motivo do cancelamento e assentos liberados. |
| `order.refunded` | Reembolso total ou parcial emitido | IDs dos participantes revogados e valor devolvido. |
