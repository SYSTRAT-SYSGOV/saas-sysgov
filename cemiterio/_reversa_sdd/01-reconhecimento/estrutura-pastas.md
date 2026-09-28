# Estrutura de Pastas do Projeto

## Raiz do Projeto
```
cemiterio/
├── .reversa/                    # Framework Reversa (configuração e estado)
├── _reversa_sdd/                # Documentação SDD gerada (esta pasta)
├── .agents/                     # Configuração de agentes (Kilo)
├── .claude/                     # Configuração Claude Code
├── .kiro/                       # Configuração Kiro
├── Cemiterio Central/           # Arquivos DBF originais - Cemitério Central
├── Cemiterio Independencia/     # Arquivos DBF originais - Cemitério Independência
├── exported_data/               # Dados exportados para CSV/Parquet
├── export_all_dbfs.py           # Script: DBF → CSV/Parquet
├── import_csv_to_db.py          # Script: CSV → PostgreSQL/MySQL
├── extract_data.py              # Script: Extração e análise de dados DBF
├── read_dbf.py                  # Leitor DBF (biblioteca)
├── read_dbf.ps1                 # Wrapper PowerShell para leitura DBF
├── mysql_schema.sql             # Schema MySQL
├── postgresql_schema.sql        # Schema PostgreSQL
├── create_db.sql                # Script de criação de banco
├── apply_schema*.bat            # Scripts de aplicação de schema
├── requirements.txt             # Dependências Python
├── EXPORT_SUMMARY.md            # Relatório de extração
├── QUICKSTART.md                # Guia rápido
├── AGENTS.md                    # Instruções do framework Reversa
├── CLAUDE.md                    # Instruções para Claude
├── GEMINI.md                    # Instruções para Gemini
```

## Detalhes das Pastas Principais

### Cemiterio Central/
Arquivos DBF originais do sistema legado Clipper do Cemitério Central (código legado '01'):
- **DADOS.DBF** (1.6 MB) - 6.956 registros de falecidos/sepultamentos
- **RESPONSA.DBF** (778 KB) - 4.348 registros de responsáveis/concessionários
- **LOTES.DBF** (67 KB) - 2.401 registros de cadastro de lotes
- **FALECIDO.DBF** (27 KB) - 2.477 registros de índice de lotes ocupados
- **ERROS.DBF** (52 KB) - 712 registros de log de erros do sistema
- **FUNCIONA.DBF** (308 bytes) - Cadastro de funcionários (coveiros)
- **PEDREIRO.DBF** (367 bytes) - Cadastro de pedreiros
- **PWUSUA.DBF** (353 bytes) - Usuários do sistema
- **PWGRUPOS.DBF** (119 bytes) - Grupos de permissão
- **PWTABELA.DBF** (529 bytes) - Permissões por grupo/tabela
- Arquivos de índice (.NTX) e sequência (*_SEQ.DBF)

### Cemiterio Independencia/
Arquivos DBF originais do sistema legado Clipper do Cemitério Independência/Boqueirão (código legado '02'):
- **DADOS.DBF** (3.4 MB) - 14.906 registros de falecidos/sepultamentos
- **RESPONSA.DBF** (2 MB) - 11.642 registros de responsáveis/concessionários
- **LOTES.DBF** (208 KB) - 7.437 registros de cadastro de lotes
- **FALECIDO.DBF** (86 KB) - 7.864 registros de índice de lotes ocupados
- **TTT.DBF** (85 KB) - 2.126 registros de histórico de validades
- **OBA.DBF** (1 MB) - 5.012 registros de mapeamento alternativo de lotes
- **ERROS.DBF** (52 KB) - 712 registros de log de erros
- **FUNCIONA.DBF**, **PEDREIRO.DBF**, **PWUSUA.DBF**, **PWGRUPOS.DBF**, **PWTABELA.DBF** - Mesma estrutura do Central

### exported_data/
Dados convertidos para CSV (UTF-8) organizados por cemitério:
- **Cemiterio Central/**: DADOS.csv, RESPONSA.csv, LOTES.csv, FALECIDO.csv, ERROS.csv, PWUSUA.csv, PWTABELA.csv, PWGRUPOS.csv
- **Cemiterio Independencia/**: DADOS.csv, RESPONSA.csv, LOTES.csv, FALECIDO.csv, TTT.csv, OBA.csv, ERROS.csv, PWUSUA.csv, PWTABELA.csv, PWGRUPOS.csv, FUN_SEQ.csv, PED_SEQ.csv

## Tecnologias Identificadas

### Sistema Legado (Origem)
- **Linguagem**: Clipper / xBase (DBase III+/IV)
- **Banco de Dados**: Arquivos DBF (dBase) com índices NTX
- **Encoding**: CP850 (DOS Latin-1 / Western European)
- **Interface**: Terminal/Console (aplicação Desktop)

### Ferramentas de Migração (Atual)
- **Python 3.x**: Scripts de extração, conversão e carga
- **Bibliotecas**: 
  - `psycopg2-binary` ≥ 2.9.0 (PostgreSQL)
  - `pymysql` ≥ 1.0.0 (MySQL)
  - `python-dateutil` ≥ 2.8.0 (manipulação de datas)
  - `pyarrow` (opcional, para Parquet)
- **Banco de Dados Alvo**: PostgreSQL ou MySQL
- **Schema**: Tabelas relacionais normalizadas com chaves estrangeiras

### Frameworks de Documentação
- **Reversa Framework** v1.3.3: Engenharia reversa e documentação
- **Kilo**: Configuração de agentes e skills

## Dependências (requirements.txt)
```
# PostgreSQL
psycopg2-binary>=2.9.0

# MySQL
pymysql>=1.0.0

# Utilitários
python-dateutil>=2.8.0
```

## Entry Points / Scripts Principais

1. **export_all_dbfs.py** - Ponto de entrada principal para extração DBF → CSV/Parquet
   - Processa ambos os cemitérios automaticamente
   - Gera relatório EXTRACTION_SUMMARY.txt
   - Suporta saída CSV e/ou Parquet

2. **import_csv_to_db.py** - Ponto de entrada para carga CSV → Banco Relacional
   - Suporte a PostgreSQL e MySQL
   - Importação idempotente (ON CONFLICT / ON DUPLICATE KEY)
   - Processamento em lotes (batch size 1000)
   - Cache de lookups para performance
   - Argumentos CLI: --db, --host, --port, --database, --user, --password

3. **extract_data.py** - Análise exploratória e validação de dados
   - Extrai amostras de todos os DBFs
   - Gera estatísticas consolidadas
   - Reporta problemas de encoding

4. **read_dbf.py** / **read_dbf.ps1** - Leitura de baixo nível de arquivos DBF

## Configuração e CI/CD
- **apply_schema_laragon.bat** / **apply_schema2.bat** - Aplicação de schema no Laragon
- **create_db_laragon.bat** - Criação de banco no Laragon
- **create_db.sql** - SQL de criação de banco
- **mysql_schema.sql** / **postgresql_schema.sql** - DDL completo

## Problemas Conhecidos (Encoding)
- Tabelas FUNCIONA.DBF e PEDREIRO.DBF têm nomes de campos com caracteres especiais CP850 que causam erros de decode em Python
- PWUSUA.DBF, PWGRUPOS.DBF, PWTABELA.DBF têm problemas similares
- Essas tabelas são pequenas e podem ser extraídas manualmente se necessário
- Os CSVs principais (DADOS, RESPONSA, LOTES, FALECIDO) foram convertidos corretamente

## Estatísticas Consolidadas

| Entidade | Central | Independência | Total |
|----------|---------|---------------|-------|
| Falecidos (DADOS) | 6.956 | 14.906 | **21.857** |
| Responsáveis (RESPONSA) | 4.332 | 11.642 | **15.974** |
| Lotes (LOTES) | 2.398 | 7.437 | **9.835** |
| Lotes Ocupados (FALECIDO) | 2.477 | 7.864 | **10.341** |
| Histórico Validades (TTT) | - | 2.126 | **2.126** |
| Mapeamento OBA | - | 5.012 | **5.012** |
| Erros (ERROS) | 712 | 712 | **1.424** |