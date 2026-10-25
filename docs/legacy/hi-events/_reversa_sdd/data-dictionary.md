# Dicionário de Dados do Sistema

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  

---

## 1. Entidades de Pedidos e Ingressos (`orders`)

### 1.1 `Order`
Representa um pedido de ingressos realizado por um comprador. 🟢

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BigInteger | Sim | Auto-increment | Identificador único do pedido |
| `short_id` | String | Sim | - | Identificador público amigável para URLs |
| `event_id` | BigInteger | Sim | - | Chave estrangeira para o evento |
| `status` | Enum (`OrderStatus`) | Sim | `RESERVED` | `RESERVED`, `CANCELLED`, `COMPLETED`, `AWAITING_OFFLINE_PAYMENT`, `ABANDONED` |
| `currency` | String (3) | Sim | - | Código da moeda (ex: `USD`, `EUR`, `BRL`) |
| `total_amount` | Integer | Sim | 0 | Valor total do pedido em centavos |
| `tax_amount` | Integer | Sim | 0 | Total de impostos em centavos |
| `fee_amount` | Integer | Sim | 0 | Taxa da plataforma / organizador |
| `first_name` | String | Sim | - | Primeiro nome do comprador |
| `last_name` | String | Sim | - | Sobrenome do comprador |
| `email` | String | Sim | - | E-mail do comprador |
| `created_at` | Timestamp | Sim | NOW() | Data/hora de criação |
| `updated_at` | Timestamp | Sim | NOW() | Data/hora de atualização |

---

## 2. Entidades de Pagamento (`payments`)

### 2.1 `PaymentIntent`
Sessão ou intenção de pagamento intermediada por gateway (Stripe). 🟢

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BigInteger | Sim | Auto-increment | Identificador único da transação |
| `order_id` | BigInteger | Sim | - | Vínculo com a ordem |
| `provider` | String | Sim | `stripe` | Provedor de pagamento |
| `provider_intent_id` | String | Sim | - | ID da intent no Stripe (ex: `pi_...`) |
| `status` | Enum (`OrderPaymentStatus`) | Sim | `PENDING` | `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED` |
| `amount` | Integer | Sim | - | Valor a ser cobrado em centavos |
| `client_secret` | String | Não | null | Chave pública temporária para o frontend |

---

## 3. Entidades de Assentos e Capacidade (`seating`)

### 3.1 `SeatClaim`
Alocação temporária ou definitiva de um assento reservado. 🟢

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BigInteger | Sim | Auto-increment | Identificador único |
| `event_id` | BigInteger | Sim | - | Evento associado |
| `seat_id` | BigInteger | Sim | - | Identificador físico do assento |
| `order_id` | BigInteger | Não | null | Pedido associado |
| `status` | Enum (`SeatClaimStatus`) | Sim | `HELD` | `HELD`, `SOLD`, `BLOCKED` (derivado runtime) |
| `expires_at` | Timestamp | Não | null | Expiração do bloqueio temporário |

---

## 4. Entidades de Usuário e Acesso (`auth` / `team`)

### 4.1 `User`
Usuário com acesso ao painel administrativo ou compras. 🟢

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `id` | BigInteger | Sim | Auto-increment | Identificador único |
| `email` | String | Sim | - | E-mail único |
| `password` | String | Sim | - | Hash de senha |
| `status` | Enum (`UserStatus`) | Sim | `ACTIVE` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `two_factor_confirmed_at` | Timestamp | Não | null | Ativação de 2FA |
