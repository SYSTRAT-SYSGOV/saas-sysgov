# Importação CSV, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, módulo `importacao-csv`.

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `DatabaseConnection` | classe | — | Wrapper fino sobre `psycopg2`/`pymysql`: `execute`, `executemany`, `fetchone`, `fetchall`, `cursor()` (context manager), `commit`/`rollback` |
| `CemiterioImporter.run_full_import` | `()` | `None` | Orquestra o pipeline completo em uma transação |
| `import_cemiterios`...`import_permissoes` | métodos | `None` | Tabelas de referência, uma vez |
| `import_quadras`...`import_erros` | métodos | `None` | Por cemitério (1=Central, 2=Independência) |
| `import_oba`, `import_historico` | métodos | `None` | Só `cem_id == 2` |
| `_insert_lote_batch` | `(lotes: list)` | `None` | "Batch" de inserção de lotes (ver Riscos) |
| `_refresh_lote_cache` | `()` | `None` | Recarrega cache de `(quadra_id, codigo)` → `lote_id` |
| `get_csv_field` | `(row: dict, key: str)` | `str` | Tenta variações de nome de coluna, retorna `''` se nenhuma bater |
| `parse_int` | `(value: str)` | `int \| None` | Converte para int, `None` em falha silenciosa |
| `is_falecido_flag` / `clean_falecido_nome` | funções | `bool` / `str` | Detecta/limpa tag `[FALECIDO]` |

## Fluxo Principal
1. `main()` verifica se a tabela `cemiterio` já existe (exige schema aplicado); suporta `--schema-only`
2. `run_full_import()` abre uma única transação
3. **Fase 1 — referência (uma vez):** `import_cemiterios` → `import_tipos_lote` → `import_funcionarios` → `import_pedreiros` → `import_grupos_usuarios` → `import_usuarios` → `import_permissoes`
4. **Fase 2 — por cemitério (1, depois 2):** `import_quadras` → `import_lotes` → `import_falecidos` → `import_responsaveis` → `import_erros`
5. **Fase 3 — só Independência (`cem_id == 2`):** `import_oba`, `import_historico`
6. `commit()` único ao final; qualquer exceção em qualquer fase dispara `rollback()` total

## Fluxos Alternativos
- **`--schema-only`:** valida conexão/schema sem inserir dados.
- **Exceção em qualquer ponto:** `rollback()` reverte a transação inteira — nenhuma fase fica "meio aplicada".
- **`get_csv_field()` sem correspondência de coluna:** retorna `''` silenciosamente, sem erro nem log — risco de perda silenciosa de dado se um CSV futuro tiver nomes de coluna em um padrão de bytes não previsto.
- **`numero` do endereço do responsável não numérico** (ex. `"S/N"`, `"12A"`): `parse_int()` falha silenciosamente, campo vira `None`, perdendo a informação original.

## Dependências
- `psycopg2-binary` (PostgreSQL) / `pymysql` (MySQL) — ver `dependencies.md`
- CSVs em `exported_data/` (produzidos pela unit `extracao-dbf`)

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Transação única para toda a importação (não por tabela) | `run_full_import()`, `commit()`/`rollback()` únicos | 🟢 |
| `SHA256(senha)` sem salt como hash de migração | Comentário do próprio autor no código | 🔴 — ver ADR 0002 |
| Lista hardcoded de coveiros/pedreiros em vez de ler do CSV | `import_funcionarios`/`import_pedreiros` | 🔴 — ver RN012 em `domain.md`, achado crítico: **incorreta**, não só incompleta |
| `_insert_lote_batch` não é batch real: `cur.execute()` linha a linha, descarta `RETURNING id`, refaz lookup via `_refresh_lote_cache()` | `code-analysis.md`, módulo `importacao-csv` | 🟢 — confirmado no código, comentário `# fazer lookup depois` |

## Estado Interno
`_refresh_lote_cache()` mantém em memória o cache completo de `(quadra_id, codigo)` → `lote_id` já inseridos, recarregado a cada lote de 1000 linhas via `SELECT ... WHERE (quadra_id, codigo) NOT IN (...)` contra **todas** as chaves já cacheadas — cresce O(n²) ao longo da importação completa (não crítico nos ~9.835 lotes atuais, mas não escala para uma base legada maior).

## Observabilidade
Não identificado uso de `logging` estruturado neste módulo (mesma observação da unit `extracao-dbf` — nenhum log de erro estruturado para os casos de falha silenciosa de `get_csv_field()`/`parse_int()`).

## Riscos e Lacunas
- 🔴 Lista hardcoded de funcionários/pedreiros incorreta — ver RN012, bloqueia integridade de `falecido.coveiro_id`/`pedreiro_id`.
- 🔴 Hash de senha inadequado para produção — ver ADR 0002, SEC-002.
- 🟡 `import_responsaveis` sem `ON CONFLICT` — duplica em reexecução (dependente de correção em `schema-destino`, T-06).
- 🟡 Decodificação de `PW_PERMIS` incerta — o próprio comentário original tem um ponto de interrogação.
- 🟡 `_insert_lote_batch`/`_refresh_lote_cache` com padrão O(n²) — sem urgência no volume atual.
