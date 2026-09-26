# C4 — Diagrama de Containers (Nível 2)

> Gerado pelo Arquiteto em 2026-09-24. "Container" aqui no sentido C4 (unidade implantável/executável), não Docker — este projeto não usa containerização.

```mermaid
C4Container
    title Containers — Kit de Migração cemiterio

    Person(operador, "Operador/DBA")

    System_Boundary(kit, "Kit de Migração") {
        Container(extracao, "Script de Extração", "Python 3 (stdlib)", "export_all_dbfs.py — lê .DBF, grava CSV UTF-8")
        Container(extracaoDebug, "Scripts de inspeção", "Python 3 / PowerShell", "extract_data.py, read_dbf.py, read_dbf.ps1 — não usados no fluxo de produção")
        ContainerDb(csv, "CSV intermediário", "Arquivos .csv em exported_data/", "8 tabelas (Central) + 12 tabelas (Independência)")
        Container(importacao, "Script de Importação", "Python 3 + psycopg2/pymysql", "import_csv_to_db.py — lê CSV, popula banco relacional, transação única")
        Container(schemaDDL, "Schema DDL", "SQL", "postgresql_schema.sql / mysql_schema.sql / create_db.sql")
        Container(helpers, "Scripts auxiliares Windows", "Batch", "create_db_laragon.bat, apply_schema2.bat, apply_schema_laragon.bat")
    }

    System_Ext(legadoCentral, "Cemitério Central (legado)", ".DBF/.NTX")
    System_Ext(legadoIndep, "Cemitério Independência (legado)", ".DBF/.NTX")
    SystemDb_Ext(postgres, "PostgreSQL", "13 tabelas")
    SystemDb_Ext(mysql, "MySQL 8.0+", "13 tabelas, equivalente")

    Rel(operador, extracao, "Executa via CLI")
    Rel(operador, schemaDDL, "Aplica via .bat ou psql/mysql CLI")
    Rel(operador, importacao, "Executa via CLI, --db postgresql|mysql")
    Rel(extracao, legadoCentral, "Lê binário .DBF")
    Rel(extracao, legadoIndep, "Lê binário .DBF")
    Rel(extracao, csv, "Grava")
    Rel(importacao, csv, "Lê")
    Rel(helpers, schemaDDL, "Invoca via psql/mysql CLI")
    Rel(schemaDDL, postgres, "DDL")
    Rel(schemaDDL, mysql, "DDL")
    Rel(importacao, postgres, "psycopg2")
    Rel(importacao, mysql, "pymysql")
```

## Notas 🟢

- `extracaoDebug` (scripts de inspeção) não participa do pipeline de produção — incluído no diagrama por completude, já que existe no repositório e tem lógica divergente do script de produção (ver ADR 0001).
- `csv` é um "container" de dados (filesystem), não um serviço — mantido no diagrama por ser um ponto de desacoplamento real entre extração e importação (permite reexecutar a importação sem reextrair).
- Não há container de aplicação web, API ou cache — confirmado ausentes em `inventory.md`.
