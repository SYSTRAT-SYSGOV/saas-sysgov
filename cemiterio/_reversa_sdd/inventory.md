# Inventário — cemiterio

> Gerado pelo Scout em 2026-09-24

## 🟢 Visão geral

Este não é um projeto de aplicação em produção com código-fonte próprio: é um **kit de migração de dados** de um sistema legado DOS/Clipper (dois cemitérios, "Central" e "Independência") para um banco relacional moderno (PostgreSQL ou MySQL). O sistema legado em si (`CONTROLE.EXE`) é um binário compilado Clipper — não há código-fonte dele no projeto, apenas os arquivos de dados (`.DBF`/`.NTX`) e os artefatos gerados pelo processo de extração/migração.

## 🟢 Estrutura de pastas (raiz)

```
cemiterio/
├── Cemiterio Central/            # dados legados DOS/Clipper (DBF+NTX+EXE), cemitério 1
│   └── backup/cemiterio/*.ARJ    # backups históricos compactados (ARJ), 2009-2011
├── Cemiterio Independencia/      # dados legados DOS/Clipper (DBF+NTX+EXE), cemitério 2
├── exported_data/                # CSVs já extraídos dos DBF, prontos para import
│   ├── Cemiterio Central/        # 8 tabelas exportadas
│   └── Cemiterio Independencia/  # 12 tabelas exportadas
├── export_all_dbfs.py            # extrai todos os DBF -> CSV
├── extract_data.py               # extração/tratamento de dados específico
├── read_dbf.py                   # leitor utilitário de DBF
├── read_dbf.ps1                  # equivalente PowerShell do leitor DBF
├── import_csv_to_db.py           # importa os CSVs para PostgreSQL/MySQL
├── postgresql_schema.sql         # DDL do banco alvo (PostgreSQL)
├── mysql_schema.sql              # DDL do banco alvo (MySQL)
├── create_db.sql                 # criação do banco
├── create_db_laragon.bat         # helper Windows/Laragon p/ criar banco
├── apply_schema2.bat             # helper Windows p/ aplicar schema
├── apply_schema_laragon.bat      # helper Windows/Laragon p/ aplicar schema
├── requirements.txt              # deps Python (psycopg2, pymysql, python-dateutil)
├── QUICKSTART.md                 # guia passo a passo de importação
├── EXPORT_SUMMARY.md             # resumo quantitativo da extração já realizada
└── CLAUDE.md / AGENTS.md / GEMINI.md  # instruções do framework Reversa (não são código do sistema)
```

## 🟢 Linguagens

| Linguagem | Extensões | Arquivos (raiz do projeto) |
|---|---|---|
| Python | `.py` | 4 |
| SQL | `.sql` | 3 |
| Batch (Windows) | `.bat` | 3 |
| PowerShell | `.ps1` | 1 |
| Markdown | `.md` | 5 |

**Linguagem principal do kit de migração:** Python.

O sistema legado em si (não presente como código-fonte, apenas binário/dados) foi construído em **Clipper** (dBase-family): evidenciado por `CONTROLE.EXE`, arquivos `.DBF` (dados) e `.NTX` (índices), padrão clássico de aplicações Clipper/FoxPro de DOS.

## 🟢 Tecnologias e frameworks

- **Python 3** — scripts de extração e importação, sem framework web (uso de `argparse`, `csv`, `dataclasses`, `logging` puros da stdlib)
- **psycopg2-binary** — driver PostgreSQL
- **pymysql** — driver MySQL
- **python-dateutil** — normalização de datas
- **PostgreSQL** e **MySQL** — bancos alvo suportados (schemas paralelos mantidos para ambos)
- **Clipper/dBase (legado)** — `.DBF` (tabelas) + `.NTX` (índices), formato binário DOS, encoding **CP850** (DOS Latin-1)

## 🟢 Pontos de entrada

| Arquivo | Papel |
|---|---|
| `export_all_dbfs.py` | Ponto de entrada da extração: lê todos os `.DBF` dos dois cemitérios e gera CSV em `exported_data/` |
| `import_csv_to_db.py` | Ponto de entrada da importação: lê `exported_data/*.csv` e popula PostgreSQL ou MySQL via CLI (`--db postgresql|mysql --host --database --user --password`) |
| `extract_data.py` | Extração/tratamento auxiliar de dados |
| `read_dbf.py` / `read_dbf.ps1` | Utilitário de leitura direta de um `.DBF` para inspeção |
| `create_db.sql`, `create_db_laragon.bat` | Criação do banco alvo |
| `apply_schema2.bat`, `apply_schema_laragon.bat` | Aplicação do DDL (`postgresql_schema.sql`/`mysql_schema.sql`) |

Não há `.env.example`, `Dockerfile`, `docker-compose.yml` nem pipeline de CI/CD (`.github/workflows`, `Jenkinsfile`, `.gitlab-ci.yml`) — não encontrados no projeto.

## 🟢 Schema de banco de dados

Dois DDLs paralelos e equivalentes, ambos na raiz:
- `postgresql_schema.sql` — schema alvo PostgreSQL (13 tabelas)
- `mysql_schema.sql` — schema alvo MySQL (equivalente)
- `create_db.sql` — criação inicial do banco

Análise detalhada do schema fica a cargo do `reversa-data-master`.

## 🟡 Cobertura de testes

Nenhum framework de teste identificado (`*.test.*`, `*.spec.*` ausentes, sem `pytest`/`unittest` configurado). **Cobertura estimada: 0%.**

## 🟢 Dados legados (contexto para o Arqueólogo/Detetive)

- **2 unidades/cemitérios**: "Central" (código legado `01`) e "Independência/Boqueirão" (código legado `02`)
- Extração já concluída (ver `EXPORT_SUMMARY.md`): 21.857 falecidos, 15.974 responsáveis, 9.835 lotes, 10.341 registros de ocupação de lote, consolidados entre as duas unidades
- Autenticação/segurança do legado: tabelas `PWUSUA` (usuários), `PWGRUPOS` (grupos), `PWTABELA` (permissões por grupo/tabela) — modelo RBAC simples por grupo
- Tabela `ERROS` — log de erros do sistema legado (712 registros em cada unidade)
- Backups históricos em `.ARJ` (2009–2011) preservados em `Cemiterio Central/backup/`
