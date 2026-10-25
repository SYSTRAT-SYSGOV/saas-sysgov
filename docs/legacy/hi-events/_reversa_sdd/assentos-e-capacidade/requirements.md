# Especificação de Requisitos: Assentos e Capacidade (`assentos-e-capacidade`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

A unidade **Assentos e Capacidade** (`assentos-e-capacidade`) gerencia o mapa físico e virtual de assentos reservados (`SeatMap`, `EventSeatMap`, `SeatClaim`), o controle atômico de capacidade de público por ocorrência de evento (`EventOccurrence`) e a computação em tempo de execução de estados derivados (`SOLD_OUT`, `HELD`, `SOLD`, `BLOCKED`), impedindo colisões de reserva e overbooking.

---

## 2. Responsabilidades

- **Configuração de Mapas de Assentos**: Vincular mapas de layout (`SeatMap`) a eventos e ocorrências específicas (`EventSeatMap`).
- **Bloqueio e Reivindicação Atômica (`claimSeat`)**: Garantir que assentos selecionados no checkout fiquem retidos (`HELD`) com expiração amarrada ao timer da ordem.
- **Liberação Automática de Assentos (`releaseClaim`)**: Devolver assentos ao inventário disponível imediatamente quando o pedido expirar (`ABANDONED`) ou for cancelado (`CANCELLED`).
- **Cálculo Dinâmico de Capacidade e Lotes**: Determinar o estado de esgotamento (`SOLD_OUT`) e travas de lotes (`markLockedTiers`) em runtime através da comparação de capacidades nominais e reservas ativas.
- **Associação Obrigatória de Produtos Sentados**: Impedir a comercialização de produtos categorizados como sentados sem assentos físicos vinculados.

---

## 3. Regras de Negócio e Invariantes

1. **Vínculo Obrigatório de Assento** 🟢:
   - Qualquer fluxo de checkout que venda um ingresso associado a produto sentado deve reivindicar o assento correspondente no mapa (`claimSeat`) ou recusar sumariamente a operação.
2. **Status Derivados em Tempo Real (Non-stored Enums)** 🟢:
   - Os estados de assento (`HELD`, `SOLD`, `BLOCKED`) e a condição `SOLD_OUT` de uma ocorrência são exclusivamente computados em tempo de execução. Não existem colunas estáticas, jobs reconciliadores ou cronjobs gravando esses estados no banco de dados.
3. **Escopo Temporário em `event_occurrences`** 🟢:
   - Os limites de capacidade e disponibilidade temporal residem estritamente na tabela `event_occurrences`. As colunas legadas `events.start_date` e `events.end_date` nunca devem ser acessadas ou modificadas.
4. **Prevenção de Ataques $O(n^2)$ em Validações** 🟢:
   - Validações de assentos duplicados em requisições de atualização de mapa nunca devem usar a regra `distinct` nativa do Laravel (executa antes da autorização e possui custo quadrático). Em vez disso, a verificação deve ser feita no hook pós-autorização `withValidator()`.

---

## 4. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|:---:|---|
| **RF-01** | Visualização do mapa interativo de assentos | **Must** | Retornar layout SVG/JSON do mapa indicando assentos livres, reservados (`HELD`) e vendidos (`SOLD`). |
| **RF-02** | Reserva atômica de assento durante o checkout | **Must** | Bloquear assento para o pedido comprador com lock atômico, rejeitando requisições simultâneas com `HTTP 409 Conflict`. |
| **RF-03** | Liberação imediata de assento por cancelamento/expiração | **Must** | Ao expirar ou cancelar uma ordem, liberar a tupla em `seat_claims` sem deixar travas residuais. |
| **RF-04** | Computação de status SOLD_OUT em tempo real | **Must** | Se a soma de ordens `RESERVED` + `COMPLETED` atingir o teto de capacidade da ocorrência, sinalizar lote como esgotado na API pública. |
| **RF-05** | Travamento de faixas de assentos por organizador | **Should** | Permitir que o organizador marque assentos específicos como `BLOCKED` (ex: área técnica ou imprensa). |

---

## 5. Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|---|---|---|:---:|
| **Concorrência** | Locks atômicos no PostgreSQL para evitar dupla alocação de assento | `backend/app/Services/Domain/Seating/SeatClaimService.php` | 🟢 CONFIRMADO |
| **Performance** | Validação de duplicatas otimizada sem regra `distinct` $O(n^2)$ | `backend/app/Http/Requests/UpdateEventSeatMapBandProductsRequest.php` | 🟢 CONFIRMADO |
| **Integridade** | Chave estrangeira composta impedindo assentos órfãos | `database/migrations/*_create_seat_claims_table.php` | 🟢 CONFIRMADO |
| **Licenciamento** | Código de assentos reservados isolado sob licença corporativa | `backend/ee/`, `frontend/src/ee/` | 🟢 CONFIRMADO |

---

## 6. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Dois compradores tentam reservar o mesmo assento simultaneamente
  Dado que o assento "B-12" no mapa do evento está livre
  Quando o Comprador 1 submete a reserva do assento "B-12"
  E simultaneamente o Comprador 2 submete a reserva do mesmo assento "B-12"
  Então uma das requisições obtém sucesso HTTP 201 Created e aloca o assento
  E a outra requisição falha imediatamente com HTTP 409 Conflict (SeatClaimConflict)
  E nenhum assento fica em estado inconsistente

Cenário: Venda atinge o limite total da ocorrência do evento
  Dado que a ocorrência do evento possui capacidade total configurada de 100 lugares
  E 99 ingressos já foram emitidos como COMPLETED
  E 1 ingresso está retido em checkout como RESERVED
  Quando um novo comprador consulta a página pública de ingressos
  Então a ocorrência é reportada dinamicamente como SOLD_OUT
  E a criação de novos pedidos é sumariamente bloqueada
```

---

## 7. Priorização MoSCoW

| Requisito | MoSCoW | Justificativa |
|---|:---:|---|
| Bloqueio atômico de assentos e prevenção de dupla reserva | **Must** | Integridade física do evento; duas pessoas não podem ocupar o mesmo assento. |
| Liberação automática de assentos abandonados | **Must** | Não reter inventário de vendas não concretizadas. |
| Cálculo dinâmico de SOLD_OUT por ocorrência | **Must** | Impede emissão de ingressos além do alvará de capacidade do local. |
| Bloqueio administrativo de assentos (`BLOCKED`) | **Should** | Gestão de cortesias e áreas restritas. |

---

## 8. Rastreabilidade de Código 🟢

| Arquivo do Legado | Classe / Função | Cobertura |
|---|---|:---:|
| `backend/app/Services/Domain/Seating/SeatClaimService.php` | `SeatClaimService::claimSeats`, `releaseClaim` | 🟢 CONFIRMADO |
| `backend/app/Models/EventSeatMap.php` | `EventSeatMap` (Model Eloquent) | 🟢 CONFIRMADO |
| `backend/app/Models/SeatClaim.php` | `SeatClaim` (Model Eloquent) | 🟢 CONFIRMADO |
| `backend/app/Http/Requests/UpdateEventSeatMapBandProductsRequest.php` | `UpdateEventSeatMapBandProductsRequest` | 🟢 CONFIRMADO |
| `backend/app/Models/EventOccurrence.php` | `EventOccurrence` (Model Eloquent) | 🟢 CONFIRMADO |
