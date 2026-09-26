# Schema Destino

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`, `erd-complete.md`, `domain.md`.

## Visão Geral
Define o schema relacional do sistema alvo — 13 tabelas, mantidas em dois DDLs paralelos e estruturalmente equivalentes (PostgreSQL e MySQL 8.0+) — destino final de toda a migração dos dois cemitérios.

## Responsabilidades
- Definir as 13 tabelas com chaves primárias, estrangeiras e constraints
- Manter equivalência estrutural entre `postgresql_schema.sql` e `mysql_schema.sql`
- Prover criação inicial do banco (`create_db.sql`)

## Regras de Negócio
- Isolamento por cemitério via `cemiterio_id` em `quadra`/`lote`/`falecido`/`responsavel` (ver RN004, `domain.md`) 🟢
- `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` **não** isolados por cemitério, apesar de serem cadastros independentes no legado (ver ADR 0004) 🔴
- Exclusão lógica via `falecido.excluido`, hoje sempre `false` na importação (ver ADR 0003) 🟡

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Criar as 13 tabelas respeitando a ordem de dependência de FKs | Must | `create_db.sql` + DDL aplicam sem erro de FK |
| RF-02 | Manter equivalência estrutural entre os dois DDLs | Must | Mesmas tabelas/colunas/constraints em Postgres e MySQL |
| RF-03 | Garantir idempotência de upsert via `UNIQUE` em `lote` e `falecido` | Must | Reimportação não duplica linhas nessas tabelas |
| RF-04 | Adicionar `UNIQUE` em `responsavel` (hoje ausente) | Should | Reimportação não duplica responsáveis |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Integridade | FKs entre as 13 tabelas, ordem de criação respeitada | `postgresql_schema.sql`/`mysql_schema.sql` | 🟢 |
| Auditoria | `updated_at` deveria se atualizar automaticamente em updates | MySQL: `ON UPDATE CURRENT_TIMESTAMP` nativo; PostgreSQL: **sem trigger equivalente** | 🟡 — funcional só no MySQL hoje |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado o schema aplicado corretamente
Quando um registro é inserido respeitando a ordem de FKs (cemiterio → quadra → lote → falecido/responsavel)
Então a integridade referencial é garantida sem erro

Dado que responsavel não tem constraint UNIQUE
Quando a importação de responsáveis é executada duas vezes
Então todas as linhas de responsavel são duplicadas (comportamento atual, não é um erro capturado)
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|----------------|
| 13 tabelas com FKs corretas | Must | Base de toda a migração |
| Equivalência Postgres/MySQL | Must | Ambos os bancos são suportados pelo importador |
| `UNIQUE` em `responsavel` | Should | Corrige duplicação silenciosa em reimportação |
| Trigger `updated_at` no PostgreSQL | Could | Só relevante se o sistema alvo depender de auditoria por `updated_at` |
| Remover extensão `uuid-ossp` não usada | Won't | Cosmético, sem impacto funcional |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `postgresql_schema.sql` | DDL completo, 13 tabelas | 🟢 |
| `mysql_schema.sql` | DDL equivalente | 🟢 |
| `create_db.sql` | Criação inicial do banco | 🟢 |
