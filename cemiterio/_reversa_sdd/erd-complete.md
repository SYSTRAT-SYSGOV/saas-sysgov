# ERD Completo — Schema Alvo (PostgreSQL/MySQL)

> Gerado pelo Arquiteto em 2026-09-24. Fonte: `data-dictionary.md`, `postgresql_schema.sql`, `mysql_schema.sql`. 13 tabelas.

```mermaid
erDiagram
    cemiterio ||--o{ quadra : "1:N"
    quadra ||--o{ lote : "1:N"
    tipo_lote ||--o{ lote : "1:N (tipo_codigo)"
    lote ||--o{ falecido : "1:N"
    lote ||--o{ responsavel : "1:N"
    lote ||--o{ lote_oba : "1:N (só Independência)"
    lote ||--o{ lote_historico_validade : "1:N (só Independência)"
    funcionario ||--o{ falecido : "1:N (coveiro_id)"
    pedreiro ||--o{ falecido : "1:N (pedreiro_id)"
    usuario_grupo ||--o{ usuario : "1:N"
    usuario_grupo ||--o{ permissao : "1:N"

    cemiterio {
        smallint id PK
        char_2 codigo_legado UK
        varchar_100 nome
        boolean ativo
    }
    quadra {
        serial id PK
        smallint cemiterio_id FK
        varchar_6 codigo
        varchar_200 descricao
    }
    tipo_lote {
        char_1 codigo PK
        varchar_50 descricao
        boolean perpetuo
    }
    lote {
        bigserial id PK
        int quadra_id FK
        varchar_6 codigo
        char_1 tipo_codigo FK
        smallint gavetas
        varchar_30 processo
        date validade
        char_2 legado_cemiterio
        varchar_6 legado_quadra
    }
    falecido {
        bigserial id PK
        bigint lote_id FK
        smallint item_ordem
        varchar_200 nome
        date dt_nascimento
        date dt_falecimento
        varchar_30 certidao_numero
        date dt_emissao_certidao
        varchar_200 cartorio
        varchar_200 medico
        varchar_500 causa_mortis
        smallint coveiro_id FK
        smallint pedreiro_id FK
        boolean excluido
    }
    responsavel {
        bigserial id PK
        bigint lote_id FK
        smallint item_ordem
        varchar_200 nome
        varchar_30 rg
        varchar_18 cpf_cnpj
        varchar_200 endereco
        varchar_20 numero
        varchar_10 cep
        varchar_100 cidade
        varchar_20 telefone
        varchar_20 celular
        boolean falecido_flag
    }
    funcionario {
        smallint codigo PK
        varchar nome
        varchar rg
    }
    pedreiro {
        smallint codigo PK
        varchar nome
        varchar rg
    }
    usuario_grupo {
        char_4 codigo PK
        varchar_100 nome
    }
    usuario {
        char_4 codigo PK
        char_4 grupo_codigo FK
        varchar_150 nome
        char_1 nivel
        varchar_255 senha_hash
    }
    permissao {
        char_4 grupo_codigo PK_FK
        varchar tabela PK
        boolean pode_incluir
        boolean pode_alterar
        boolean pode_excluir
        boolean pode_consultar
        boolean pode_relatorio
    }
    lote_oba {
        bigint lote_id FK
        varchar legado_quadra
        varchar legado_lote
    }
    lote_historico_validade {
        bigint lote_id FK
        date validade_legado
    }
    log_erro {
        varchar codigo_erro
        varchar tipo_mensagem
        varchar mensagem
    }
```

## Notas de cardinalidade e integridade 🟢🔴

- `UNIQUE(lote_id, item_ordem)` em `falecido` — garante RN001 (`domain.md`).
- `UNIQUE(quadra_id, codigo)` em `lote` — garante idempotência do upsert de lotes.
- 🔴 `responsavel` **não tem** `UNIQUE` — reimportação duplica linhas (ver `architecture.md`, dívidas técnicas).
- 🔴 `funcionario`, `pedreiro`, `usuario`, `usuario_grupo` **não têm** `cemiterio_id` apesar de serem, no legado, cadastros independentes por cemitério — ver ADR 0004. Diagrama acima reflete o schema **como implementado hoje** (globais), não o modelo ideal.
- `lote_oba`/`lote_historico_validade` só são populadas para `cemiterio_id = 2` (Independência) — assimetria de negócio confirmada, motivo não documentado (RN010 em `domain.md`).
