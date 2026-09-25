# Arquitetura — Sistema de Gestão de Cemitérios (Kit de Migração)

> Gerado pelo Arquiteto em 2026-09-24. Fonte: `inventory.md`, `dependencies.md`, `code-analysis.md`, `data-dictionary.md`, `domain.md`.

## Visão geral 🟢

Este projeto **não é uma aplicação em produção com camada de serviço** — é um **kit de migração de dados em batch** (ETL manual, sem orquestrador), escrito em Python puro (stdlib + 3 dependências), que move dados de dois cemitérios independentes (Central, Independência), originalmente em arquivos `.DBF` de uma aplicação Clipper/DOS (`CONTROLE.EXE`, binário não presente no projeto), para um banco relacional moderno (PostgreSQL ou MySQL, schemas paralelos e equivalentes).

**Estilo arquitetural:** pipeline ETL de dois estágios, executado manualmente via linha de comando:
1. **Extração** (`export_all_dbfs.py`): DBF → CSV intermediário (`exported_data/`)
2. **Importação** (`import_csv_to_db.py`): CSV → banco relacional (PostgreSQL ou MySQL, schema aplicado previamente via `postgresql_schema.sql`/`mysql_schema.sql`)

Não há API, fila, cache, autenticação de aplicação, containerização ou pipeline de CI/CD — confirmado pela ausência de `Dockerfile`, `docker-compose.yml`, `.github/workflows` e equivalentes (ver `inventory.md`).

## Características arquiteturais principais

- **Sem orquestração:** execução manual via CLI, um comando por etapa; não há agendador nem monitoramento.
- **Transação única por importação completa:** `CemiterioImporter.run_full_import()` roda tudo dentro de uma transação; qualquer exceção reverte tudo (`rollback()` total).
- **Suporte dual de banco:** mesma lógica de importação abstraída sobre `psycopg2` (PostgreSQL) e `pymysql` (MySQL) via `DatabaseConnection`.
- **Multi-tenancy parcial:** o modelo alvo isola `quadra`/`lote`/`falecido`/`responsavel` por `cemiterio_id`, mas **não** isola `usuario`/`funcionario`/`pedreiro` (ver ADR 0004 em `adrs/`) — inconsistência arquitetural relevante para qualquer evolução futura do sistema.
- **Zero cobertura de testes** (confirmado em `inventory.md`) — qualquer mudança no pipeline de importação hoje depende de validação manual.

## Diagramas

- [C4 — Contexto](c4-context.md)
- [C4 — Containers](c4-containers.md)
- [C4 — Componentes](c4-components.md)
- [ERD Completo](erd-complete.md)

## Integrações externas 🟢

Não há integrações externas em tempo de execução (sem chamadas de rede, API REST/GraphQL, webhooks ou filas de mensagem). As únicas "integrações" são de arquivo/protocolo:
- Leitura direta de arquivos `.DBF`/`.NTX` (formato binário Clipper/dBase, sem biblioteca de terceiros — ver ADR 0001)
- Conexão de banco de dados via driver nativo (`psycopg2`/`pymysql`)

## Dívidas técnicas identificadas 🟡🔴

| Dívida | Severidade | Evidência |
|---|---|---|
| Lista hardcoded incorreta de funcionários/pedreiros | 🔴 Alta | `code-analysis.md`, módulo `importacao-csv`; RN012 em `domain.md` |
| Hash de senha SHA256 sem salt | 🔴 Alta | ADR 0002, SEC-002 em `permissions.md` |
| `usuario`/`funcionario`/`pedreiro` sem isolamento por cemitério (colisão de código) | 🔴 Alta | ADR 0004, SEC-003/SEC-004 |
| `responsavel` sem constraint `UNIQUE` → reimportação duplica linhas | 🟡 Média | `code-analysis.md`, módulo `schema-destino` |
| `_refresh_lote_cache` com padrão `O(n²)` ao longo da importação completa | 🟡 Média (não crítico no volume atual: ~9.835 lotes) | `code-analysis.md`, módulo `importacao-csv` |
| `updated_at` sem trigger de auto-atualização no DDL PostgreSQL (presente no MySQL) | 🟡 Média | `code-analysis.md`, módulo `schema-destino` |
| Duas implementações divergentes do parser DBF (`export_all_dbfs.py` vs `extract_data.py`) | 🟡 Baixa (script de amostragem não usado no fluxo real) | ADR 0001 |
| Zero cobertura de testes automatizados | 🟡 Média | `inventory.md` |
| Extensão `uuid-ossp` instalada no PostgreSQL sem uso (todas as PKs são `SERIAL`) | 🟢 Baixa (cosmético) | `code-analysis.md`, módulo `schema-destino` |

## Lacunas 🔴

- Não há evidência, nos artefatos analisados, de biblioteca de terceiros para leitura de DBF listada em `requirements.txt` — o parser é 100% custom (confirma ADR 0001), mas vale reconfirmar que nenhuma dependência de sistema (ex. driver ODBC) é necessária em outro ambiente.
- O binário `CONTROLE.EXE` (aplicação Clipper original) não está no escopo desta extração — toda a análise de arquitetura acima cobre apenas o kit de migração, não a aplicação legada completa.
