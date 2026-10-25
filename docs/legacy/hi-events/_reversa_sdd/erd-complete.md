# Diagrama Entidade-Relacionamento Completo (ERD)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Fonte Técnica**: `backend/app/Models/`, `database/migrations/`, `_reversa_sdd/data-dictionary.md`

---

## 1. Visão Geral do Modelo de Dados

O modelo relacional do **Hi.Events** é projetado com isolamento multi-inquilino através de `Account` e `Organizer`. Ele suporta eventos recorrentes ou multi-data através de `EventOccurrence`, ingressos e precificação por camadas em `Product` e `ProductPrice`, reservas de pedidos em `Order` e `OrderItem`, participantes individualizados em `Attendee` e controle de assentos reservados em `SeatMap` e `SeatClaim`.

```mermaid
erDiagram
    ACCOUNT ||--o{ ORGANIZER : "possui"
    ACCOUNT ||--o{ ACCOUNT_USER : "associa"
    USER ||--o{ ACCOUNT_USER : "pertence_a"
    ORGANIZER ||--o{ EVENT : "organiza"
    
    EVENT ||--|{ EVENT_OCCURRENCE : "possui_datas"
    EVENT ||--o{ PRODUCT : "disponibiliza"
    EVENT ||--o{ ORDER : "recebe"
    EVENT ||--o{ EVENT_SEAT_MAP : "configura_assentos"
    EVENT ||--o{ QUESTION : "solicita"

    PRODUCT ||--o{ PRODUCT_PRICE : "possui_precos"
    PRODUCT ||--o{ ORDER_ITEM : "composto_em"
    PRODUCT_CATEGORY ||--o{ PRODUCT : "categoriza"

    ORDER ||--|{ ORDER_ITEM : "contem"
    ORDER ||--o{ STRIPE_PAYMENT : "pago_por"
    ORDER ||--o{ INVOICE : "gera"
    ORDER ||--o{ ORDER_REFUND : "sofre"
    ORDER_ITEM ||--o{ ATTENDEE : "emite"

    ATTENDEE ||--o{ ATTENDEE_CHECK_IN : "registra_presenca"
    ATTENDEE ||--o{ QUESTION_ANSWER : "responde"
    CHECK_IN_LIST ||--o{ ATTENDEE_CHECK_IN : "valida_em"

    SEAT_MAP ||--o{ EVENT_SEAT_MAP : "instanciado_em"
    EVENT_SEAT_MAP ||--o{ SEAT_CLAIM : "aloca"
    ORDER ||--o{ SEAT_CLAIM : "reserva"

    PROMO_CODE ||--o{ ORDER : "aplica_desconto"
    AFFILIATE ||--o{ ORDER : "rastreia_venda"

    ACCOUNT {
        bigint id PK
        string name
        string currency
        string status
        timestamp created_at
    }

    USER {
        bigint id PK
        string email UK
        string password
        string status
        timestamp two_factor_confirmed_at
    }

    ACCOUNT_USER {
        bigint id PK
        bigint account_id FK
        bigint user_id FK
        string role
    }

    ORGANIZER {
        bigint id PK
        bigint account_id FK
        string name
        string email
        string timezone
    }

    EVENT {
        bigint id PK
        bigint organizer_id FK
        string title
        string status
        string currency
        text description
    }

    EVENT_OCCURRENCE {
        bigint id PK
        bigint event_id FK
        timestamp start_date
        timestamp end_date
        string status
        integer capacity
    }

    PRODUCT {
        bigint id PK
        bigint event_id FK
        bigint category_id FK
        string title
        string type
        integer sales_volume
        boolean is_hidden
    }

    PRODUCT_PRICE {
        bigint id PK
        bigint product_id FK
        integer price
        timestamp sales_start_date
        timestamp sales_end_date
    }

    ORDER {
        bigint id PK
        string short_id UK
        bigint event_id FK
        bigint affiliate_id FK
        bigint promo_code_id FK
        string status
        integer total_amount
        integer tax_amount
        string first_name
        string last_name
        string email
    }

    ORDER_ITEM {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        bigint product_price_id FK
        integer price
        integer quantity
    }

    ATTENDEE {
        bigint id PK
        bigint order_item_id FK
        bigint event_id FK
        string public_id UK
        string first_name
        string last_name
        string email
        string status
    }

    ATTENDEE_CHECK_IN {
        bigint id PK
        bigint attendee_id FK
        bigint check_in_list_id FK
        timestamp checked_in_at
    }

    CHECK_IN_LIST {
        bigint id PK
        bigint event_id FK
        string name
        timestamp expires_at
    }

    STRIPE_PAYMENT {
        bigint id PK
        bigint order_id FK
        string provider_intent_id UK
        string status
        integer amount
        string currency
    }

    SEAT_MAP {
        bigint id PK
        bigint organizer_id FK
        string name
        json schema_data
    }

    EVENT_SEAT_MAP {
        bigint id PK
        bigint event_id FK
        bigint seat_map_id FK
        json config
    }

    SEAT_CLAIM {
        bigint id PK
        bigint event_seat_map_id FK
        bigint order_id FK
        bigint seat_id
        timestamp expires_at
    }

    PROMO_CODE {
        bigint id PK
        bigint event_id FK
        string code
        integer discount_amount
        integer usage_count
        integer max_usages
    }

    AFFILIATE {
        bigint id PK
        bigint event_id FK
        string code UK
        string name
        integer total_sales
    }

    QUESTION {
        bigint id PK
        bigint event_id FK
        string title
        string type
        boolean is_required
    }

    QUESTION_ANSWER {
        bigint id PK
        bigint question_id FK
        bigint attendee_id FK
        text answer
    }
```

---

## 2. Destaques de Integridade e Modelagem Relacional 🟢

1. **Gestão de Datas Multi-Ocorrência (`event_occurrences`)**:
   - As datas reais de realização do evento são exclusivamente armazenadas em `event_occurrences`.
   - As colunas legadas `events.start_date` e `events.end_date` são mantidas estritamente para compatibilidade de rollback v1 e nunca devem ser lidas ou modificadas.
2. **Status Dinâmicos e Derivados (Non-stored Enums)**:
   - A tabela `event_occurrences` armazena apenas `ACTIVE` ou `CANCELLED`. O status de exibição `SOLD_OUT` é calculado dinamicamente em runtime através da comparação entre a capacidade atribuída (`capacity`) e a soma de ingressos emitidos/reservados.
   - Os estados de assentos `HELD`, `SOLD` e `BLOCKED` são avaliados atômica e temporariamente com base no timer de checkout e conclusão da ordem em `SeatClaim`.
3. **Segurança de Acesso e Isolamento Multi-Inquilino**:
   - Todas as entidades filhas de um evento (`products`, `orders`, `seat_maps`, `questions`) possuem chave estrangeira explícita referenciando o `event_id`, garantindo que queries de repositório nunca consultem dados órfãos ou cruzem organizadores distintos.
