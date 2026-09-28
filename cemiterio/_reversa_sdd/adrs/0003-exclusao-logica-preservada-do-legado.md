# ADR 0003 — Exclusão lógica (soft delete) preservada do legado

**Status:** Aceito (implementado) 🟢
**Contexto:** Retroativo — reconstruído a partir de código, sem histórico Git disponível.

## Decisão
Registros de negócio marcados como excluídos no legado (`FLAG_EXCL = '*'` em `DADOS`/`RESPONSA`) não são migrados fisicamente — são filtrados na etapa de importação (`import_csv_to_db.py`), não fisicamente removidos na etapa de extração.

## Evidência
- `export_all_dbfs.py` preserva todos os registros não fisicamente excluídos do DBF (byte `0x2A`) no CSV intermediário, incluindo os que têm `FLAG_EXCL='*'`.
- `import_csv_to_db.py` é quem efetivamente filtra `FLAG_EXCL == '*'`, pulando esses registros na carga para o banco relacional.

## Motivação inferida
🟡 Manter o CSV intermediário completo (sem filtrar exclusão lógica na extração) preserva a possibilidade de auditoria/reprocessamento sem precisar re-extrair do DBF original; a decisão de negócio sobre o que é "ativo" fica isolada na etapa de importação, mais fácil de ajustar sem tocar no parser binário.

## Consequência observada
O schema alvo (`falecido.excluido`) existe como coluna booleana mas **sempre recebe `false`** na importação atual — registros excluídos simplesmente não entram na base, em vez de entrarem com a flag marcada. Se o requisito para o sistema novo for manter histórico de exclusões (auditoria), a implementação atual perde essa informação: o dado é descartado, não preservado com flag.
