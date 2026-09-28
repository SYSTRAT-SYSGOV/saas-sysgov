# C4 — Diagrama de Contexto (Nível 1)

> Gerado pelo Arquiteto em 2026-09-24.

```mermaid
C4Context
    title Contexto — Kit de Migração cemiterio

    Person(operador, "Operador/DBA", "Executa os scripts de extração e importação manualmente via CLI")

    System_Boundary(kit, "Kit de Migração (Python)") {
        System(extracao, "Extração DBF→CSV", "export_all_dbfs.py")
        System(importacao, "Importação CSV→DB", "import_csv_to_db.py")
    }

    System_Ext(legadoCentral, "Cemitério Central (legado)", "Arquivos .DBF/.NTX — Clipper/DOS")
    System_Ext(legadoIndep, "Cemitério Independência (legado)", "Arquivos .DBF/.NTX — Clipper/DOS")
    SystemDb_Ext(bancoAlvo, "Banco relacional alvo", "PostgreSQL ou MySQL")

    Rel(operador, extracao, "Executa via CLI")
    Rel(operador, importacao, "Executa via CLI, após aplicar o schema SQL")
    Rel(extracao, legadoCentral, "Lê .DBF (binário, cp850)")
    Rel(extracao, legadoIndep, "Lê .DBF (binário, cp850)")
    Rel(importacao, bancoAlvo, "Escreve via psycopg2/pymysql")
```

## Atores e sistemas

| Elemento | Papel |
|---|---|
| Operador/DBA | Único ator humano identificado — roda os scripts manualmente, não há usuário final da aplicação legada envolvido no kit de migração em si 🟢 |
| Cemitério Central / Independência (legado) | Sistemas de origem — cada um é uma pasta isolada de arquivos `.DBF`/`.NTX` 🟢 |
| Banco relacional alvo | Sistema de destino, PostgreSQL ou MySQL à escolha do operador (`--db` no CLI) 🟢 |

🔴 LACUNA: não há indicação, nos artefatos disponíveis, de quem/o quê consome o banco alvo depois da migração (aplicação web? relatórios?) — fora do escopo desta extração, que cobre apenas o kit de migração.
