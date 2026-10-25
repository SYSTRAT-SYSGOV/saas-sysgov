# Tarefas de Implementação: Assentos e Capacidade (`assentos-e-capacidade`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Pré-requisitos

- [ ] Tabelas `seat_maps`, `event_seat_maps`, `seat_claims` e `event_occurrences` criadas e indexadas.
- [ ] Módulo de Pedidos (`pedidos`) integrado com hooks de checkout (`createOrder`, `completeOrder`, `expireOrder`).
- [ ] Isolamento de código corporativo configurado sob o diretório `backend/ee/` (Enterprise Edition).

---

## 2. Tarefas de Implementação

- [ ] **T-01: Estruturar Modelos e Tabelas de Assentos**
  - **Origem no legado**: `backend/app/Models/SeatMap.php`, `backend/app/Models/EventSeatMap.php`, `backend/app/Models/SeatClaim.php`
  - **Critério de pronto**: Models Eloquent com integridade referencial estrita e índices únicos compostos em `(event_seat_map_id, seat_id)`.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-02: Implementar Bloqueio Atômico de Assentos (`SeatClaimService::claimSeats`)**
  - **Origem no legado**: `backend/app/Services/Domain/Seating/SeatClaimService.php`
  - **Critério de pronto**: Operação atômica em transação que verifica se o assento já possui claim ativo ou ingresso emitido. Em caso positivo, lança `SeatClaimConflictException` (`HTTP 409`).
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-03: Implementar Liberação de Assentos (`SeatClaimService::releaseClaim`)**
  - **Origem no legado**: `backend/app/Services/Domain/Seating/SeatClaimService.php`
  - **Critério de pronto**: Remoção idempotente de tuplas em `seat_claims` vinculadas ao `order_id` fornecido, acionada em caso de expiração ou estorno.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-04: Implementar Validador Otimizado contra Duplicatas**
  - **Origem no legado**: `backend/app/Http/Requests/UpdateEventSeatMapBandProductsRequest.php`
  - **Critério de pronto**: Substituir a regra nativa `distinct` do Laravel por validação pós-autorização em `withValidator()`, prevenindo degradação $O(n^2)$.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-05: Implementar Algoritmo de Capacidade e SOLD_OUT em Tempo Real**
  - **Origem no legado**: `backend/app/Services/Domain/Event/EventOccurrenceCapacityService.php`
  - **Critério de pronto**: Calcular em runtime se a soma de ordens `RESERVED` e `COMPLETED` atinge o teto de `capacity` da ocorrência, sem persistência de flags fixas em banco.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-06: Implementar Guarda Obrigatória de Produtos Sentados**
  - **Origem no legado**: `backend/app/Services/Domain/Order/OrderService.php`
  - **Critério de pronto**: Rejeitar a criação de qualquer pedido que contenha produto do tipo sentado caso o array `seat_ids` correspondente esteja vazio ou incompleto.
  - **Confiança**: 🟢 CONFIRMADO

- [ ] **T-07: Implementar Verificação de Licença Corporativa (EE Gating)**
  - **Origem no legado**: `backend/ee/`, `backend/app/Http/Middleware/EnterpriseLicenseMiddleware.php`
  - **Critério de pronto**: Rotas de configuração de mapas e bandas protegidas por middleware `ee.licensed:seating`, mantendo a leitura pública de checkout desimpedida.
  - **Confiança**: 🟢 CONFIRMADO

---

## 3. Tarefas de Teste

- [ ] **TT-01: Teste de Concorrência de Assentos (`SeatClaimConcurrencyTest`)**
  - Executar múltiplos workers simultâneos tentando reservar o mesmo assento físico. Garantir que apenas um obtenha sucesso e os demais recebam `HTTP 409`.
- [ ] **TT-02: Teste de Liberação Imediata pós-Timeout**
  - Verificar que, ao rodar a rotina de limpeza de ordens abandonadas, os assentos retornam instantaneamente ao status disponível no mapa interativo.
- [ ] **TT-03: Teste de Invariante de Datas em Ocorrências**
  - Assegurar que nenhum componente tente ler ou gravar em `events.start_date` / `events.end_date`.

---

## 4. Ordem Sugerida de Execução

1. **Fase 1 (Estrutura e Models)**: T-01 e T-07 (Tabelas e gating de licença).
2. **Fase 2 (Lock Atômico e Liberação)**: T-02, T-03 e T-06 (Conexão com pipeline de checkout).
3. **Fase 3 (Algoritmos e Otimização)**: T-04 e T-05 (Validação otimizada e capacidade dinâmica).

---

## 5. Lacunas e Riscos (🔴 / 🟡)

- 🟢 **Tempo de Retenção de Assento**: O TTL do claim segue rigidamente a expiração configurada no pedido (padrão: 15 minutos).
- 🟡 **Layout SVG em Eventos de Grande Porte**: Validar performance de renderização em mapas com mais de 5.000 assentos no frontend.
