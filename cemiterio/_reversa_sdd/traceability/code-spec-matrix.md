# Code/Spec Matrix

> Gerado pelo Redator em 2026-09-24. Lista, por arquivo do legado, qual unit cobre o quê.

| Arquivo do legado | Unit correspondente | Cobertura |
|---|---|---|
| `export_all_dbfs.py` | `extracao-dbf/` | 🟢 |
| `extract_data.py` | `extracao-dbf/` | 🟡 (divergente, não usado em produção) |
| `read_dbf.py` | `extracao-dbf/` | 🟡 (utilitário de inspeção) |
| `read_dbf.ps1` | `extracao-dbf/` | 🟡 (abandonado, motivo não confirmado) |
| `postgresql_schema.sql` | `schema-destino/` | 🟢 |
| `mysql_schema.sql` | `schema-destino/` | 🟢 |
| `create_db.sql` | `schema-destino/` | 🟢 |
| `create_db_laragon.bat` | `schema-destino/` | 🟡 (helper Windows, não detalhado linha a linha) |
| `apply_schema2.bat` | `schema-destino/` | 🟡 |
| `apply_schema_laragon.bat` | `schema-destino/` | 🟡 |
| `import_csv_to_db.py` | `importacao-csv/` | 🟢 |
| `Cemiterio Central/*.DBF` (15 tabelas) | `legado-cemiterio-central/` | 🟢 |
| `Cemiterio Central/*.NTX` | `legado-cemiterio-central/` | 🟡 (não analisado, só mencionado) |
| `Cemiterio Central/backup/*.ARJ` | `legado-cemiterio-central/` | 🔴 (não analisado, lacuna aberta) |
| `Cemiterio Independencia/*.DBF` (16 tabelas) | `legado-cemiterio-independencia/` | 🟢 |
| `Cemiterio Independencia/*.NTX` | `legado-cemiterio-independencia/` | 🟡 |
| `PWUSUA.DBF`/`PWGRUPOS.DBF`/`PWTABELA.DBF` (ambos cemitérios) | `seguranca-usuarios-permissoes/` | 🟢 |
| `requirements.txt` | `dependencies.md` (documento transversal, não é uma unit) | 🟢 |
| `QUICKSTART.md` | n/a (documentação operacional, coberta em `inventory.md`) | n/a |
| `EXPORT_SUMMARY.md` | n/a (relatório de extração anterior, referenciado em `code-analysis.md`) | n/a |
| `CONTROLE.EXE` (binário Clipper original) | n/a — fora do escopo desta extração | 🔴 candidato a análise adicional, se obtido o código-fonte |

## Cobertura estimada
Todos os arquivos de código/dados do kit de migração (scripts Python, DDLs, `.DBF` de ambos os cemitérios, segurança) estão mapeados a pelo menos uma unit. As únicas lacunas de cobertura são: backups `.ARJ` do Central (não analisados) e o binário `CONTROLE.EXE` da aplicação Clipper original (não presente no projeto, fora do escopo de um kit de migração de dados).
