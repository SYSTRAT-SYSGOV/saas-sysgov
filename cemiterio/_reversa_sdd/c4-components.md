# C4 — Diagrama de Componentes (Nível 3)

> Gerado pelo Arquiteto em 2026-09-24. Cobre os dois containers com lógica não-trivial: Script de Extração e Script de Importação.

## Componentes — Script de Extração (`export_all_dbfs.py`)

```mermaid
C4Component
    title Componentes — export_all_dbfs.py

    Container_Boundary(extracao, "export_all_dbfs.py") {
        Component(readDbf, "read_dbf_full()", "função", "Parser binário DBF: header, descritores de campo, registros")
        Component(writeCsv, "write_csv()", "função", "Grava CSV UTF-8 a partir dos registros parseados")
        Component(writeParquet, "write_parquet()", "função (opcional)", "Grava Parquet via pyarrow — falha graciosamente se ausente")
        Component(processDir, "process_directory()", "função", "Itera todos os .DBF de um diretório, chama parser + writers")
        Component(main, "main()", "função", "Orquestra as duas pastas de cemitério, grava EXTRACTION_SUMMARY.txt")
    }

    Rel(main, processDir, "chama, 1x por cemitério")
    Rel(processDir, readDbf, "chama, 1x por tabela .DBF")
    Rel(processDir, writeCsv, "chama")
    Rel(processDir, writeParquet, "chama (best-effort)")
```

## Componentes — Script de Importação (`import_csv_to_db.py`, 979 linhas)

```mermaid
C4Component
    title Componentes — import_csv_to_db.py

    Container_Boundary(importacao, "import_csv_to_db.py") {
        Component(dbConn, "DatabaseConnection", "classe", "Wrapper fino sobre psycopg2/pymysql — execute, executemany, fetchone/all, cursor(), commit/rollback")
        Component(importer, "CemiterioImporter", "classe", "Orquestra o pipeline completo de importação")
        Component(refTables, "import_cemiterios / tipos_lote / funcionarios / pedreiros / grupos_usuarios / usuarios / permissoes", "métodos", "Tabelas de referência, executadas uma vez")
        Component(perCemeteryTables, "import_quadras / lotes / falecidos / responsaveis / erros", "métodos", "Executadas por cemitério (1=Central, 2=Independência)")
        Component(indepOnly, "import_oba / import_historico", "métodos", "Só para cem_id == 2 (Independência)")
        Component(loteCache, "_insert_lote_batch / _refresh_lote_cache", "métodos", "Batch de inserção de lotes + cache de chaves (padrão O(n²) — ver architecture.md)")
        Component(helpers, "get_csv_field / parse_int / is_falecido_flag / clean_falecido_nome", "funções auxiliares", "Normalização de campos do CSV")
    }

    Rel(importer, dbConn, "usa para toda I/O de banco")
    Rel(importer, refTables, "1. executa")
    Rel(importer, perCemeteryTables, "2. executa por cemitério")
    Rel(importer, indepOnly, "3. executa só para Independência")
    Rel(perCemeteryTables, loteCache, "import_lotes usa")
    Rel(refTables, helpers, "usa para parsing de campos")
    Rel(perCemeteryTables, helpers, "usa para parsing de campos")
```

## Notas 🟢
Estrutura de componentes confirmada por leitura direta do código-fonte (ver `code-analysis.md` para detalhamento linha a linha de cada achado).
