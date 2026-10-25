# Especificação de Requisitos: Pedidos e Ingressos (`pedidos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

A unidade **Pedidos e Ingressos** (`pedidos`) é o núcleo transacional de e-commerce da plataforma Hi.Events. É responsável por orquestrar a seleção de produtos/lotes, reter ingressos e assentos temporariamente com contagem regressiva de checkout, transicionar o status da ordem mediante liquidação de pagamento ou seleção de pagamento offline, e emitir os bilhetes finais individualizados por participante com QR Code criptografado.

---

## 2. Responsabilidades

- **Criação de Reserva Temporária**: Iniciar pedidos com status `RESERVED`, garantindo bloqueio atômico de ingressos e assentos para evitar overbooking.
- **Transição de Ciclo de Vida**: Concluir pedidos (`COMPLETED`), cancelar ordens (`CANCELLED`) ou expirar pedidos abandonados (`ABANDONED`).
- **Emissão de Ingressos de Participantes**: Gerar registros de `Attendee` e tokens públicos para visualização e download de bilhetes.
- **Rastreamento de Descontos e Afiliados**: Aplicar e validar códigos promocionais e atribuir comissões/vendas a afiliados parceiros.
- **Notificação Pós-Venda**: Enfileirar e-mails com comprovante e ingressos PDF anexados garantindo execução após o commit (`afterCommit`).

---

## 3. Regras de Negócio e Invariantes

1. **Movimentação Condicional de Contadores** 🟢:
   - Os contadores de uso de códigos promocionais (`promo_codes.usage_count`), acúmulo de vendas de produtos (`products.sales_volume`) e estatísticas de afiliados só são atualizados quando o pedido atinge status `COMPLETED` (`isOrderCompleted()`).
2. **Liberação Imediata de Inventário** 🟢:
   - Pedidos que atingem o tempo limite de checkout sem confirmação mudam para `ABANDONED` e liberam imediatamente ingressos e assentos alocados.
3. **Escopo Estrito de Entidades Filhas** 🟢:
   - O pedido e seus itens (`order_items`) devem estar estritamente vinculados ao `event_id` autorizado na rota. Qualquer divergência resulta em `HTTP 404/422` antes de qualquer mutação.
4. **Isolamento de Dados Sensíveis** 🟢:
   - Endpoints públicos de pedido e checkout nunca expõem identificadores internos confidenciais (ex: `location_id`, taxas internas ou chaves privadas).

---

## 4. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|:---:|---|
| **RF-01** | Criação pública de pedido de ingressos com reserva temporária | **Must** | Gerar registro de `Order` com status `RESERVED`, `short_id` único e bloqueio temporário de ingressos com expiração configurada no evento. |
| **RF-02** | Confirmação de pedido com emissão de participantes | **Must** | Ao receber confirmação de pagamento online ou aprovação manual offline, transicionar pedido para `COMPLETED` e criar instâncias de `Attendee` para cada ingresso. |
| **RF-03** | Expiração automática de checkouts abandonados | **Must** | Worker assíncrono identifica ordens expiradas em `RESERVED`, atualiza para `ABANDONED` e libera assentos/lotes. |
| **RF-04** | Aplicação e validação de códigos promocionais | **Should** | Validar código promocional contra limite de uso, data de vigência e produto selecionado antes de aplicar o desconto no total. |
| **RF-05** | Suporte a pagamento offline (faturamento/dinheiro) | **Should** | Permitir status `AWAITING_OFFLINE_PAYMENT` com aprovação posterior exclusiva por organizador com permissão `EDIT`. |

---

## 5. Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|---|---|---|:---:|
| **Concorrência** | Bloqueio pessimista/atômico na alocação de ingressos e assentos | `backend/app/Services/Domain/Order/OrderService.php` | 🟢 CONFIRMADO |
| **Segurança** | Autorização de ações não-GET e sanitização anti-spam de nomes | `PersonNameRule`, `#[RequiresPermission(Permission::EDIT)]` | 🟢 CONFIRMADO |
| **Transacionalidade** | Envio de e-mails de confirmação amarrado a transações comitadas | `BaseMail::afterCommit()` | 🟢 CONFIRMADO |
| **Performance** | Otimização de consultas de capacidade e inventário | `OrderRepository::runQuery()` | 🟢 CONFIRMADO |

---

## 6. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Comprador conclui com sucesso a compra de ingressos
  Dado que o evento "Tech Conference 2026" possui 10 ingressos disponíveis do lote "Geral"
  E o comprador seleciona 2 ingressos e preenche seus dados cadastrais
  Quando a requisição pública de criação de pedido é submetida
  Então o sistema cria um pedido com status RESERVED e short_id exclusivo
  E os 2 ingressos ficam bloqueados temporariamente
  Quando a notificação de confirmação do pagamento é recebida com sucesso
  Então o status do pedido muda para COMPLETED
  E são gerados 2 registros de Attendee com identificadores públicos
  E o volume de vendas do lote é incrementado em 2
  E o e-mail de confirmação é enfileirado para envio

Cenário: Comprador abandona o checkout e tempo limite expira
  Dado que um pedido foi criado com status RESERVED às 10:00:00 com expiração de 15 minutos
  Quando o relógio atinge 10:15:01 sem que o pagamento tenha sido efetuado
  Então o job de expiração marca a ordem como ABANDONED
  E a capacidade reservada é restituída imediatamente ao lote
  E quaisquer assentos associados retornam ao estado disponível
```

---

## 7. Priorização MoSCoW

| Requisito | MoSCoW | Justificativa |
|---|:---:|---|
| Criação de pedido e bloqueio atômico de ingressos | **Must** | Caminho crítico de venda; falha causa overbooking ou perda de receita. |
| Conclusão da ordem e emissão de ingressos com QR Code | **Must** | Entrega do produto digital adquirido pelo participante. |
| Cancelamento com devolução de inventário | **Must** | Integridade do inventário em caso de estorno ou desistência. |
| Aplicação de códigos promocionais e rastreio de afiliados | **Should** | Importante para campanhas de marketing dos organizadores. |
| Fluxo de pagamento offline | **Could** | Funcionalidade opcional ativada apenas por determinados organizadores. |

---

## 8. Rastreabilidade de Código 🟢

| Arquivo do Legado | Classe / Função | Cobertura |
|---|---|:---:|
| `backend/app/Http/Actions/Orders/CreateOrderActionPublic.php` | `CreateOrderActionPublic` | 🟢 CONFIRMADO |
| `backend/app/Services/Domain/Order/OrderService.php` | `OrderService::createOrder`, `completeOrder` | 🟢 CONFIRMADO |
| `backend/app/DomainObjects/Status/OrderStatus.php` | `OrderStatus` (Enum) | 🟢 CONFIRMADO |
| `backend/app/Repositories/OrderRepository.php` | `OrderRepository::findFirstWhere` | 🟢 CONFIRMADO |
| `backend/app/Models/Order.php` | `Order` (Model Eloquent) | 🟢 CONFIRMADO |
