# Tarefas de Implementação: Pedidos e Ingressos (`pedidos`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Pré-requisitos

- [ ] Migrations das tabelas `orders`, `order_items`, `attendees`, `products` e `seat_claims` executadas no PostgreSQL.
- [ ] Redis operacional para gestão de locks distribuídos e filas assíncronas do Laravel Horizon.
- [ ] Módulo de Eventos e Ocorrências disponível com endpoints de consulta de capacidade.
- [ ] Configuração de ambiente: `APP_URL`, `FRONTEND_URL` e provedor de e-mail (Mailpit/SMTP) validados.

---

## 2. Tarefas de Implementação

- [ ] **T-01: Estruturar DTOs e Enums de Domínio da Ordem**
  - **Origem no legado**: `backend/app/DomainObjects/Status/OrderStatus.php`, `backend/app/Data/CreateOrderDTO.php`
  - **Critério de pronto**: Enums `OrderStatus` (`RESERVED`, `COMPLETED`, `AWAITING_OFFLINE_PAYMENT`, `ABANDONED`, `CANCELLED`) definidos e DTOs estendendo `BaseDataObject` com validação de tipagem estrita.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-02: Implementar Repositório de Pedidos (`OrderRepository`)**
  - **Origem no legado**: `backend/app/Repositories/OrderRepository.php`
  - **Critério de pronto**: Queries encapsuladas dentro de `runQuery()`. Implementar métodos seguros com suporte a soft-deletes (`incrementEach()`, `decrementEach()`) para atualização de volume de vendas e participantes.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-03: Implementar Serviço de Domínio de Pedidos (`OrderService::createOrder`)**
  - **Origem no legado**: `backend/app/Services/Domain/Order/OrderService.php`
  - **Critério de pronto**: Validar capacidade remanescente em transação isolada, reter assentos no mapa via `SeatClaimService` com status `HELD` e gravar ordem como `RESERVED` com timeout de 15 minutos.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-04: Implementar Action Pública de Criação de Pedido (`CreateOrderActionPublic`)**
  - **Origem no legado**: `backend/app/Http/Actions/Orders/CreateOrderActionPublic.php`
  - **Critério de pronto**: Estender `BaseAction`, validar payload com sanitização de nomes via `PersonNameRule`, retornar resposta padronizada via `resourceResponse(OrderPublicResource, 201)`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-05: Implementar Conclusão de Venda e Emissão de Ingressos (`OrderService::completeOrder`)**
  - **Origem no legado**: `backend/app/Services/Domain/Order/OrderService.php`, `backend/app/Services/Domain/Attendee/AttendeeService.php`
  - **Critério de pronto**: Transicionar ordem para `COMPLETED`, gerar instâncias de `Attendee` com tokens públicos únicos e QR Code, e incrementar contadores de afiliados e volume de produtos.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-06: Implementar Job de Expiração de Checkouts Abandonados**
  - **Origem no legado**: `backend/app/Jobs/ExpireAbandonedOrdersJob.php`
  - **Critério de pronto**: Worker agendado identifica pedidos com status `RESERVED` cujo `expires_at < NOW()`, transiciona para `ABANDONED` e dispara liberação de assentos e inventário.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-07: Configurar Disparo de E-mails Transacionais com Ingressos**
  - **Origem no legado**: `backend/app/Mail/OrderConfirmationMail.php`
  - **Critério de pronto**: E-mail herda de `BaseMail` e utiliza obrigatoriamente a flag `afterCommit()` para impedir envio em transações revertidas. Renderização segura de HTML via template Liquid purificado.
  - **Confiança**: 🟢 CONFIRMADO

---

## 3. Tarefas de Teste

- [ ] **TT-01: Teste Unitário de Concorrência e Overbooking**
  - Executar simulação de requisições concorrentes disputando os últimos ingressos de um lote. Validar retorno de `HTTP 409 (ResourceConflictException)`.
- [ ] **TT-02: Teste de Invariante de Contadores de Afiliados e Promoções**
  - Verificar que compras incompletas ou abandonadas mantêm os contadores de afiliados e promoções inalterados (`isOrderCompleted()`).
- [ ] **TT-03: Teste de Integração E2E do Fluxo de Checkout**
  - Cobrir o fluxo completo desde a seleção de lote público, retenção temporária, pagamento simulado até a confirmação e geração de ingressos.

---

## 4. Ordem Sugerida de Execução

1. **Fase 1 (Estrutura e Dados)**: T-01 e T-02 (DTOs, Enums e Repositório).
2. **Fase 2 (Regra de Negócio e Concorrência)**: T-03 e T-04 (Criação de pedido e retenção temporária).
3. **Fase 3 (Liquidação e Emissão)**: T-05 e T-07 (Conclusão de venda, emissão de ingressos e e-mails pós-commit).
4. **Fase 4 (Resiliência e Expiração)**: T-06 (Rotina de limpeza de abandonados).

---

## 5. Lacunas e Riscos (🔴 / 🟡)

- 🟡 **Expiração do Lock**: Confirmar se o timeout padrão de 15 minutos de reserva pode ser sobrescrito nas configurações individuais de cada evento (`event_settings`).
- 🟢 **Auditoria Financeira**: Garantir que as taxas da plataforma (`OrderApplicationFee`) sejam computadas na mesma transação de banco.
