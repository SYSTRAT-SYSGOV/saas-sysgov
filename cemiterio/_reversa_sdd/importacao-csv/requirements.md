# Importação CSV

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`, `domain.md`, `permissions.md`.

## Visão Geral
Segunda e última etapa do pipeline de migração: lê os CSVs gerados pela extração e popula o schema relacional alvo (PostgreSQL ou MySQL) em uma única transação atômica, traduzindo regras de negócio do legado no processo (exclusão lógica, tag `[FALECIDO]`, hash de senha, decodificação de permissões).

## Responsabilidades
- Conectar ao banco alvo via wrapper único (`DatabaseConnection`, abstrai `psycopg2`/`pymysql`)
- Popular tabelas de referência uma vez, depois tabelas por cemitério, respeitando ordem de FK
- Aplicar regras de tradução do legado (RN005, RN007, RN011)
- Garantir atomicidade: transação única, `rollback()` total em qualquer exceção

## Regras de Negócio
- `FLAG_EXCL == '*'` → registro pulado na importação (RN005, `domain.md`) 🟢
- Tag `[FALECIDO]` no nome do responsável → `falecido_flag` + nome limpo (RN007) 🟢
- Senha migrada com `SHA256(senha)` sem salt — inadequado para produção (RN011, SEC-002 em `permissions.md`) 🔴
- Lista hardcoded de coveiros/pedreiros está **incorreta**, não apenas incompleta (RN012) 🔴 CRÍTICO
- Decodificação de `PW_PERMIS` em 5 blocos de 4 caracteres — inferida, incerteza reconhecida no próprio comentário original do código 🟡

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Importar tabelas de referência uma única vez | Must | `cemiterio`, `tipo_lote`, `funcionario`, `pedreiro`, `usuario_grupo`, `usuario`, `permissao` populadas sem duplicata |
| RF-02 | Importar `quadra`/`lote`/`falecido`/`responsavel`/`erro` por cemitério | Must | Dados de Central e Independência corretamente isolados por `cemiterio_id` |
| RF-03 | Importar `lote_oba`/`lote_historico_validade` apenas para Independência | Must | Tabelas vazias para Central, populadas para Independência |
| RF-04 | Filtrar registros com `FLAG_EXCL='*'` | Must | Nenhum registro excluído logicamente aparece no banco alvo |
| RF-05 | Reverter toda a importação em caso de erro | Must | Nenhuma linha parcial persiste após exceção não tratada |
| RF-06 | Suportar execução `--schema-only` (só validar conexão/schema) | Should | Roda sem inserir dados quando a flag é passada |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | Senha deveria usar hash adequado para produção (bcrypt/argon2) | `import_csv_to_db.py`, comentário do próprio autor sobre `SHA256` ser placeholder | 🔴 — não atendido hoje |
| Confiabilidade | Transação única com rollback total garante atomicidade | `run_full_import()`, `commit()`/`rollback()` | 🟢 |
| Performance | `_refresh_lote_cache` cresce O(n²) ao longo da importação completa | `code-analysis.md`, módulo `importacao-csv` | 🟡 — não crítico no volume atual (~9.835 lotes), mas não escala |
| Idempotência | A maioria dos `import_*` usa upsert (`ON CONFLICT`), exceto `import_responsaveis` | `code-analysis.md` | 🟡 — gap conhecido |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um CSV com registros ativos e registros com FLAG_EXCL='*'
Quando a importação é executada
Então apenas os registros ativos aparecem no banco alvo

Dado um erro em qualquer ponto da importação (ex.: violação de FK)
Quando a exceção é lançada
Então nenhuma linha da execução inteira é persistida (rollback total)

Dado que import_responsaveis não usa ON CONFLICT
Quando a importação completa é executada duas vezes
Então todas as linhas de responsavel aparecem duplicadas no banco (comportamento atual, não um erro capturado)
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|----------------|
| Importação de tabelas de referência e por cemitério | Must | Caminho crítico da migração |
| Transação única com rollback | Must | Evita estado parcial corrompido no banco alvo |
| Correção do hash de senha (bcrypt/argon2) | Must (antes de produção) | Risco de segurança real, senha efetivamente persistida hoje |
| Correção da lista hardcoded de coveiro/pedreiro | Must (antes de produção) | Regra de negócio violada silenciosamente (RN012) |
| `ON CONFLICT` em `import_responsaveis` | Should | Evita duplicação em reexecução |
| Otimização de `_refresh_lote_cache` | Could | Não crítico no volume atual |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `import_csv_to_db.py` | `DatabaseConnection`, `CemiterioImporter` e todos os `import_*` | 🟢 |
