# ADR-010: Andamento atual único garantido pelo banco e histórico de tramitação imutável

- **Status**: Proposta
- **Data**: 2026-10-13
- **Mudança relacionada**: `openspec/changes/criar-modulo-protocolo`

## Contexto

A localização do processo, o tempo de permanência e os prazos derivam do andamento atual (`and_atual=true`).
Dois andamentos atuais simultâneos corromperiam essas métricas. O histórico precisa ser confiável para
responsabilização (Lei 14.129/2021).

## Decisão

- Coluna gerada `and_atual_chave = IF(and_atual, processo_id, NULL)` (STORED) com UNIQUE
  `(tenant_id, and_atual_chave)` — emula índice parcial no MySQL 8.4.
- Tramitação sob `lockForUpdate()` na linha do processo; conflito resulta em HTTP 409.
- Ponteiro denormalizado `ultimo_andamento_id` e coluna `status` no processo, escritos somente pelo serviço
  de tramitação.
- Andamentos imutáveis: sem rotas de edição/exclusão; o model só permite preencher `data_recebimento` e
  `data_envio` uma única vez (e desligar `and_atual` junto com `data_envio`).

## Alternativas consideradas

- **Unicidade apenas na aplicação**: falha sob concorrência.
- **Derivar "atual" sempre do maior `sequencia`**: dispensa a flag, mas encarece consultas de localização,
  prazos e dashboard, e a flag foi requisito explícito do negócio.
- **Tabela de eventos com projeção (event sourcing)**: complexidade desproporcional ao v1.

## Consequências

- (+) Invariante "um andamento atual por processo" garantida pelo banco.
- (+) Métricas de permanência calculáveis a partir de dados brutos imutáveis.
- (−) Denormalização (`status`, `ultimo_andamento_id`) exige disciplina de escrita única, coberta por testes
  de invariantes.
