# Máquinas de Estado do Sistema (State Machines)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  

---

## 1. Ciclo de Vida do Pedido (`OrderStatus`) 🟢

```mermaid
stateDiagram-v2
    [*] --> RESERVED: Inicia checkout (bloqueia ingressos)
    RESERVED --> COMPLETED: Pagamento online aprovado
    RESERVED --> AWAITING_OFFLINE_PAYMENT: Seleciona pagamento offline (dinheiro/transferência)
    RESERVED --> ABANDONED: Tempo de checkout expirou
    AWAITING_OFFLINE_PAYMENT --> COMPLETED: Organizador confirma recebimento manual
    AWAITING_OFFLINE_PAYMENT --> CANCELLED: Organizador ou comprador cancela
    COMPLETED --> CANCELLED: Estorno total / cancelamento
    ABANDONED --> [*]
    CANCELLED --> [*]
```

### Gatilhos e Ações Associadas:
- **`RESERVED`**: Ingressos e assentos ficam bloqueados com timer de expiração.
- **`COMPLETED`**: Emite e envia ingressos por e-mail, aloca assentos como `SOLD`, contabiliza métricas de produtos e afiliados.
- **`ABANDONED` / `CANCELLED`**: Libera assentos e ingressos de volta para o inventário imediatamente.

---

## 2. Ciclo de Vida do Participante (`AttendeeStatus`) 🟢

```mermaid
stateDiagram-v2
    [*] --> AWAITING_PAYMENT: Pedido gerado
    AWAITING_PAYMENT --> ACTIVE: Pagamento confirmado
    ACTIVE --> CANCELLED: Cancelamento individual ou cancelamento da ordem
    AWAITING_PAYMENT --> CANCELLED: Pedido expirou ou foi cancelado
    CANCELLED --> [*]
```

---

## 3. Ciclo de Vida do Pagamento (`OrderPaymentStatus`) 🟢

```mermaid
stateDiagram-v2
    [*] --> PENDING: Intent de pagamento criada no Stripe
    PENDING --> SUCCEEDED: Webhook de confirmação (payment_intent.succeeded)
    PENDING --> FAILED: Erro no cartão / saldo insuficiente
    PENDING --> CANCELLED: Checkout abortado ou cancelado
    FAILED --> PENDING: Nova tentativa de pagamento
    SUCCEEDED --> [*]
    CANCELLED --> [*]
```

---

## 4. Ciclo de Vida do Evento (`EventStatus`) 🟢

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Criação inicial do evento
    DRAFT --> LIVE: Publicação pelo organizador
    DRAFT --> PENDING_MANUAL_REVIEW: Flagged por checagem automática anti-spam
    PENDING_MANUAL_REVIEW --> LIVE: Aprovado pelo superadmin
    PENDING_MANUAL_REVIEW --> ARCHIVED: Reprovado por spam/violação
    LIVE --> ARCHIVED: Evento encerrado ou arquivado manualmente
    ARCHIVED --> [*]
```
