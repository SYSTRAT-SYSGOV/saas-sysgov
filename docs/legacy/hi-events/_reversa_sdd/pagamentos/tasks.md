# Tarefas de Implementação: Pagamentos e Stripe (`pagamentos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Pré-requisitos

- [ ] Tabela `stripe_payments`, `order_payment_platform_fees` e `order_refunds` criadas no banco de dados.
- [ ] Chaves de ambiente do Stripe configuradas (`STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- [ ] Unidade de Pedidos (`pedidos`) operacional com métodos `completeOrder` e `expireOrder` disponíveis.
- [ ] Redis operacional para despacho assíncrono de jobs de processamento de webhook.

---

## 2. Tarefas de Implementação

- [ ] **T-01: Configurar Driver e SDK do Stripe**
  - **Origem no legado**: `backend/config/services.php`
  - **Critério de pronto**: Cliente Stripe inicializado via injeção de dependência no Laravel container com tratamento de timeouts e retries.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-02: Definir DTOs e Enums de Pagamento**
  - **Origem no legado**: `backend/app/DomainObjects/Status/OrderPaymentStatus.php`
  - **Critério de pronto**: Enum `OrderPaymentStatus` (`PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`) e DTOs de criação de intenção implementados com Spatie Laravel Data.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-03: Implementar Criação de Payment Intent (`StripePaymentService::createPaymentIntent`)**
  - **Origem no legado**: `backend/app/Services/Domain/Payment/Stripe/StripePaymentService.php`
  - **Critério de pronto**: Calcular taxas da plataforma (`application_fee_amount`), gerar intent no Stripe e persistir registro inicial em `stripe_payments` com status `PENDING`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-04: Implementar Action Pública de Intenção (`CreatePaymentIntentActionPublic`)**
  - **Origem no legado**: `backend/app/Http/Actions/Orders/Payment/CreatePaymentIntentActionPublic.php`
  - **Critério de pronto**: Endpoint público que valida o `short_id` do pedido e devolve o `client_secret` seguro para inicialização do Stripe Elements no frontend.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-05: Implementar Endpoint de Webhook com Validação de Assinatura (`StripeWebhookAction`)**
  - **Origem no legado**: `backend/app/Http/Actions/Orders/Payment/StripeWebhookAction.php`
  - **Critério de pronto**: Verificar assinatura `Stripe-Signature` com o segredo do webhook. Rejeitar requisições inválidas com `HTTP 400` e enfileirar payloads válidos para processamento desacoplado.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-06: Implementar Job de Liquidação de Pagamento (`ProcessStripePaymentJob`)**
  - **Origem no legado**: `backend/app/Jobs/ProcessStripePaymentJob.php`
  - **Critério de pronto**: Processar evento `payment_intent.succeeded` de forma idempotente, atualizar status em `stripe_payments` para `SUCCEEDED` e invocar `OrderService::completeOrder`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-07: Implementar Serviço de Reembolsos e Estornos (`OrderRefundService`)**
  - **Origem no legado**: `backend/app/Services/Domain/Payment/OrderRefundService.php`
  - **Critério de pronto**: Processar estornos parciais ou totais no Stripe (`refunds.create`), persistir dados em `order_refunds` e decrementar os contadores de lote via `decrementEach()`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-08: Implementar Redator de Dados Financeiros (`FinancialStatsRedactor`)**
  - **Origem no legado**: `backend/app/Services/Access/FinancialStatsRedactor.php`
  - **Critério de pronto**: Interceptar e omitir atributos monetários e métricas financeiras caso o usuário autenticado não possua `Permission::VIEW_FINANCIALS`.
  - **Confiança**: 🟢 CONFIRMADO

---

## 3. Tarefas de Teste

- [ ] **TT-01: Teste de Validação de Assinatura de Webhook**
  - Enviar requisição com HMAC inválido e confirmar rejeição com `HTTP 400 Bad Request`.
- [ ] **TT-02: Teste de Idempotência em Webhooks Repetidos**
  - Disparar o mesmo evento `payment_intent.succeeded` duas vezes e verificar que a ordem é liquidada apenas uma vez sem efeitos colaterais duplicados.
- [ ] **TT-03: Teste de Autorização e Redação de Dados Financeiros**
  - Requisitar relatórios financeiros com usuário possuindo perfil `ORGANIZER` sem `VIEW_FINANCIALS`. Validar que campos financeiros retornam nulos.

---

## 4. Ordem Sugerida de Execução

1. **Fase 1 (SDK e Configuração)**: T-01 e T-02.
2. **Fase 2 (Checkout e Intenção)**: T-03 e T-04 (Geração de `client_secret` para o frontend).
3. **Fase 3 (Webhooks e Liquidação)**: T-05 e T-06 (Recepção segura e transição para `COMPLETED`).
4. **Fase 4 (Pós-Venda e Governança)**: T-07 e T-08 (Estornos e segregação de métricas).

---

## 5. Lacunas e Riscos (🔴 / 🟡)

- 🟢 **Split de Pagamentos (Stripe Connect)**: Confirmar se a taxa da plataforma é deduzida na conta destino do organizador ou retida na conta principal da plataforma.
- 🟡 **Suporte a Múltiplas Moedas**: Validar se moedas sem casas decimais (ex: JPY) exigem tratamento diferenciado na conversão de centavos.
