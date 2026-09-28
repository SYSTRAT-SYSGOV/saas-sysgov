# Dependências — cemiterio

> Gerado pelo Scout em 2026-09-24. Fonte: `requirements.txt`

## 🟢 Python (`requirements.txt`)

| Pacote | Versão mínima | Uso |
|---|---|---|
| `psycopg2-binary` | >=2.9.0 | Driver de conexão com PostgreSQL, usado por `import_csv_to_db.py` |
| `pymysql` | >=1.0.0 | Driver de conexão com MySQL, usado por `import_csv_to_db.py` |
| `python-dateutil` | >=2.8.0 | Parsing/normalização de datas na importação |

**Gerenciador de pacotes:** pip (`pip install -r requirements.txt`)

## 🟡 Observação sobre `pyarrow`

`EXPORT_SUMMARY.md` menciona que a geração de Parquet foi pulada por `pyarrow` não estar instalado — não é uma dependência declarada em `requirements.txt`, é opcional e não utilizada no fluxo atual.

## 🔴 Bancos de dados alvo (não são dependências Python, mas pré-requisitos de ambiente)

- PostgreSQL (com extensão `uuid-ossp`) — requer instalação e criação prévia do banco (`createdb`/`create_db.sql`)
- MySQL — alternativa equivalente (`mysql_schema.sql`)

Nenhum dos dois está containerizado (sem `docker-compose.yml`); os `.bat` (`create_db_laragon.bat`, `apply_schema_laragon.bat`) sugerem uso local via **Laragon** (stack de desenvolvimento Windows) para MySQL.

## 🟢 Legado (não é dependência do kit de migração, é o formato de origem)

- Arquivos `.DBF`/`.NTX` no formato Clipper/dBase, encoding **CP850** — lidos pelos scripts de extração (`read_dbf.py`, `export_all_dbfs.py`) provavelmente via alguma biblioteca Python de leitura de DBF (a confirmar no código pelo Arqueólogo — não declarada em `requirements.txt`, o que é uma **lacuna** a validar).
