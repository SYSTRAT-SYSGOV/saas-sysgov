# Especificação de Requisitos: Pagamentos e Stripe (`pagamentos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

A unidade **Pagamentos e Stripe** (`pagamentos`) é responsável pela orquestração de cobranças financeiras, liquidação de transações, integração com o gateway Stripe (Payment Intents, Webhooks e Stripe Connect), cálculo de taxas de aplicação da plataforma e salvaguarda estrita de visibilidade financeira com base no modelo RBAC do Hi.Events.

---

## 2. Responsabilidades

- **Criação e Gestão de Intenções de Pagamento**: Gerar e gerenciar Payment Intents no Stripe associadas a ordens com status `RESERVED`.
- **Tratamento de Webhooks Assíncronos**: Processar notificações seguras do gateway (`payment_intent.succeeded`, `payment_intent.payment_failed`) de forma idempotente.
- **Divisão de Receita e Taxas de Aplicação**: Computar taxas de serviço da plataforma (`OrderApplicationFee`) e split com organizadores (`OrganizerStripePlatform`).
- **Processamento de Reembolsos e Estornos**: Executar devoluções financeiras parciais ou totais no Stripe (`OrderRefund`) com efeito em cascata sobre ingressos e assentos.
- **Segregação Financeira**: Ocultar estritamente métricas, valores brutos e saldos (`FinancialStatsRedactor`) para usuários que não possuem a permissão explícita `VIEW_FINANCIALS`.

---

## 3. Regras de Negócio e Invariantes

1. **Guarda de Sigilo Financeiro** 🟢:
   - Nenhum valor monetário, taxa ou estatística agregada de faturamento pode ser serializada na API sem a validação prévia de `$this->isPermitted(Permission::VIEW_FINANCIALS)`.
2. **Idempotência de Webhooks** 🟢:
   - Notificações repetidas de eventos do Stripe com o mesmo `provider_intent_id` devem ser processadas de forma idempotente, sem duplicar comissões ou confirmações de pedidos.
3. **Consistência em Reembolsos** 🟢:
   - Todo reembolso aprovado aciona o decremento de contadores de produto via `decrementEach()`, marca participantes correspondentes como `CANCELLED` e libera assentos reservados.
4. **Assinatura e Segurança de Webhooks** 🟢:
   - Webhooks recebidos sem assinatura válida do Stripe (`stripe-signature`) são rejeitados imediatamente com `HTTP 400 Bad Request` antes de invocar qualquer handler de domínio.

---

## 4. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|:---:|---|
| **RF-01** | Geração de Payment Intent pública para checkout | **Must** | Criar sessão/intent no Stripe vinculada ao valor em centavos e moeda da ordem, retornando `client_secret` seguro para o frontend. |
| **RF-02** | Confirmação assíncrona de pagamento via Webhook | **Must** | Receber evento `payment_intent.succeeded`, transicionar `StripePayment` para `SUCCEEDED` e acionar `OrderService::completeOrder`. |
| **RF-03** | Emissão de reembolso total ou parcial | **Must** | Permitir que organizadores com `EDIT` + `VIEW_FINANCIALS` + `ISSUE_REFUNDS` emitam estornos que estornam a intent no Stripe e cancelam os ingressos selecionados. |
| **RF-04** | Dedução e repasse de taxa de aplicação | **Should** | Reter taxa percentual ou fixa da plataforma antes de creditar o saldo na conta Stripe Connect do organizador. |
| **RF-05** | Redação de métricas financeiras por perfil | **Must** | Ocultar receita bruta, faturamento médio e custos de taxas em relatórios para membros com permissão de visualização restrita. |

---

## 5. Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|---|---|---|:---:|
| **Segurança** | Verificação criptográfica de payloads de webhooks do Stripe | `backend/app/Http/Actions/Orders/Payment/StripeWebhookAction.php` | 🟢 CONFIRMADO |
| **Autorização** | Permissões granulares de acesso a dados e reembolsos | `Permission::VIEW_FINANCIALS`, `Permission::ISSUE_REFUNDS` | 🟢 CONFIRMADO |
| **Transacionalidade** | Efeitos colaterais disparados apenas após o commit do banco | `BaseMail::afterCommit()` | 🟢 CONFIRMADO |
| **Idempotência** | Bloqueio de duplicidade via `provider_intent_id` único no banco | `backend/app/Models/StripePayment.php` | 🟢 CONFIRMADO |

---

## 6. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Webhook de pagamento com sucesso é processado de forma confiável
  Dado que o pedido "ord_8f93a1c8b2" está com status RESERVED
  E existe uma intenção de pagamento "pi_12345" com status PENDING no banco
  Quando o webhook "payment_intent.succeeded" com assinatura válida é recebido do Stripe
  Então o status do registro de pagamento muda para SUCCEEDED
  E o status do pedido é transicionado para COMPLETED
  E os contadores de afiliados e produtos são incrementados

Cenário: Membro sem permissão VIEW_FINANCIALS consulta detalhes de pedidos
  Dado que o usuário autenticado possui a permissão EDIT mas NÃO possui VIEW_FINANCIALS
  Quando requisita o endpoint de detalhes de vendas de um evento
  Então a resposta HTTP retorna 200 OK
  E os campos "total_amount", "tax_amount" e "platform_fee" são redatados (retornados como null)
```

---

## 7. Priorização MoSCoW

| Requisito | MoSCoW | Justificativa |
|---|:---:|---|
| Criação de Payment Intent e processamento de webhook de liquidação | **Must** | Caminho crítico de monetização; sem isso não há confirmação de vendas. |
| Redação financeira segura (`FinancialStatsRedactor`) | **Must** | Requisito obrigatório de segurança e conformidade multi-inquilino. |
| Processamento de estornos totais ou parciais | **Must** | Necessidade legal e operacional de atendimento ao consumidor. |
| Suporte a Stripe Terminal para bilheterias físicas | **Could** | Recurso enterprise voltado a eventos presenciais de grande porte. |

---

## 8. Rastreabilidade de Código 🟢

| Arquivo do Legado | Classe / Função | Cobertura |
|---|---|:---:|
| `backend/app/Http/Actions/Orders/Payment/CreatePaymentIntentActionPublic.php` | `CreatePaymentIntentActionPublic` | 🟢 CONFIRMADO |
| `backend/app/Services/Domain/Payment/Stripe/StripePaymentService.php` | `StripePaymentService::createPaymentIntent` | 🟢 CONFIRMADO |
| `backend/app/DomainObjects/Status/OrderPaymentStatus.php` | `OrderPaymentStatus` (Enum) | 🟢 CONFIRMADO |
| `backend/app/Services/Access/FinancialStatsRedactor.php` | `FinancialStatsRedactor` | 🟢 CONFIRMADO |
| `backend/app/Models/StripePayment.php` | `StripePayment` (Model Eloquent) | 🟢 CONFIRMADO |
