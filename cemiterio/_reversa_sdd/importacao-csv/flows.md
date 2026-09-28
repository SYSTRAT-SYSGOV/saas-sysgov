# Importação CSV, Fluxos Detalhados

> Gerado pelo Redator em 2026-09-24. Complementa `design.md` com os fluxos que não cabem no "Fluxo Principal" resumido.

## Fluxo A — Importação completa (happy path)

```mermaid
flowchart TD
    A[main] --> B{--schema-only?}
    B -- sim --> C[Valida conexão/schema, encerra]
    B -- não --> D[run_full_import: abre transação]
    D --> E[Fase 1: tabelas de referência]
    E --> F[Fase 2: cem_id=1 Central]
    F --> G[Fase 2: cem_id=2 Independência]
    G --> H[Fase 3: OBA/TTT, só Independência]
    H --> I[commit único]
```

## Fluxo B — Importação de lotes (batch + cache)

```mermaid
flowchart TD
    A[import_lotes] --> B[Lê CSV em blocos de 1000]
    B --> C[_insert_lote_batch: execute linha a linha]
    C --> D["id retornado é descartado (pass)"]
    D --> E[_refresh_lote_cache: SELECT ... WHERE chave NOT IN cache]
    E --> F{Mais blocos?}
    F -- sim --> B
    F -- não --> G[Fim import_lotes]
```
🟡 Este padrão é O(n²) porque `_refresh_lote_cache` compara contra o cache completo a cada bloco — não crítico no volume atual, mas cresce com o dataset.

## Fluxo C — Erro em qualquer fase (rollback total)

```mermaid
flowchart TD
    A[run_full_import] --> B[Fase N executando]
    B -- exceção --> C[rollback total]
    C --> D["Nenhuma linha de nenhuma fase é persistida (mesmo fases 1..N-1 já 'executadas' na transação)"]
    B -- sucesso --> E[Próxima fase]
```

## Fluxo D — Tradução de campos com fallback silencioso

```mermaid
flowchart TD
    A[Linha do CSV] --> B[get_csv_field tenta variações de nome de coluna]
    B -- encontrou --> C[Retorna valor]
    B -- não encontrou --> D["Retorna '' silenciosamente, sem log"]
    A --> E[parse_int em campos numéricos]
    E -- valor não numérico --> F["Retorna None silenciosamente (perde dado original)"]
```
🔴 Ambos os fallbacks (`get_csv_field`, `parse_int`) perdem dado sem registrar nada — risco de auditoria se um CSV futuro tiver variações de formato não previstas.
