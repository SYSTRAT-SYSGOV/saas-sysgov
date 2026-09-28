# Schema Destino, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `erd-complete.md`.

## Interface

Ver `erd-complete.md` para o diagrama completo das 13 tabelas. Ordem de criação (dependência de FK):

| Ordem | Tabela | Depende de |
|---|---|---|
| 1 | `cemiterio`, `tipo_lote` | — |
| 2 | `quadra` | `cemiterio` |
| 3 | `lote` | `quadra`, `tipo_lote` |
| 4 | `funcionario`, `pedreiro`, `usuario_grupo` | — |
| 5 | `usuario` | `usuario_grupo` |
| 6 | `permissao` | `usuario_grupo` |
| 7 | `falecido` | `lote`, `funcionario`, `pedreiro` |
| 8 | `responsavel` | `lote` |
| 9 | `lote_oba`, `lote_historico_validade` | `lote` (só Independência) |
| 10 | `log_erro` | — (tabela independente) |

## Fluxo Principal
1. `create_db.sql` cria o banco vazio
2. `postgresql_schema.sql` **ou** `mysql_schema.sql` (à escolha do operador) é aplicado, criando as 13 tabelas na ordem acima
3. Schema fica pronto para receber dados via `import_csv_to_db.py` (ver unit `importacao-csv`)

## Fluxos Alternativos
- **Ambiente Postgres:** extensão `uuid-ossp` é criada (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`), mas nenhuma coluna usa `uuid_generate_v4()`/tipo `UUID` — todas as PKs são `SERIAL`/`BIGSERIAL`. Configuração instalada sem uso.
- **Ambiente MySQL:** `updated_at` tem `ON UPDATE CURRENT_TIMESTAMP` nativo — atualiza sozinho. No DDL PostgreSQL equivalente, o campo só é preenchido na criação da linha, sem trigger de atualização automática.

## Dependências
- Nenhuma — SQL puro, sem extensões externas além de `uuid-ossp` (instalada mas não usada no PostgreSQL)

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Manter dois DDLs paralelos (Postgres/MySQL) em vez de um ORM/migration tool único | Presença de `postgresql_schema.sql` e `mysql_schema.sql` como arquivos separados | 🟢 |
| PKs surrogate via `SERIAL`/`BIGSERIAL` em vez de UUID | Todas as tabelas, apesar da extensão `uuid-ossp` instalada | 🟢 |
| `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` como tabelas globais (sem `cemiterio_id`) | Ausência da coluna nesses DDLs | 🔴 — ver ADR 0004, identificado como incompatibilidade, não decisão deliberada documentada |

## Estado Interno
O schema em si é o "estado" — não há lógica de aplicação além do DDL. Nenhuma trigger, stored procedure ou view identificada em nenhum dos dois DDLs.

## Observabilidade
Nenhuma — sem tabela de auditoria dedicada além de `log_erro` (que replica o log de erros do legado, não audita mudanças no schema alvo).

## Riscos e Lacunas
- 🟡 `updated_at` sem trigger de auto-atualização no PostgreSQL — risco funcional real se o sistema alvo rodar em Postgres e depender desse campo para auditoria.
- 🔴 `responsavel` sem `UNIQUE` — combinado com a ausência de `ON CONFLICT` no importador (ver `importacao-csv/design.md`), reimportação duplica todos os responsáveis.
- 🟢 Extensão `uuid-ossp` sem uso — risco baixo, apenas configuração morta.
