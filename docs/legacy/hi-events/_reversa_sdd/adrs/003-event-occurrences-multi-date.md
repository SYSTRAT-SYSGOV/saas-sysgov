# ADR 003: Separação de Ocorrências Temporais via Event Occurrences

- **Status**: Aceito 🟢
- **Data**: 2026-10-24
- **Decisores**: Arquitetura Hi.Events

## Contexto
Na versão v1 do Hi.Events, eventos eram modelados com datas de início e fim fixas na tabela `events` (`start_date`, `end_date`). Isso impedia eventos recorrentes, festivais com múltiplos dias ou horários distintos para um mesmo evento.

## Decisão
1. Todas as datas reais de eventos residem exclusivamente na tabela `event_occurrences`.
2. As colunas `events.start_date` e `events.end_date` são mantidas apenas para salvaguarda de rollback da v1, sendo terminantemente proibida sua leitura ou escrita por código novo.
3. Pedidos, ingressos e relatórios de comparecimento associam-se à ocorrência específica (`event_occurrence_id`).

## Alternativas Consideradas
- **Duplicação de Eventos**: Criar um evento diferente para cada dia polui o catálogo do organizador e impede métricas unificadas.

## Consequências
- **Positivas**: Suporte nativo a eventos multi-data, turnês e programações recorrentes.
- **Negativas**: Joins obrigatórios com `event_occurrences` em listagens públicas.
