# Dicionário de Dados — cemiterio

> Gerado pelo Arqueólogo em 2026-09-24. Cobre os módulos `extracao-dbf` e `schema-destino`.

## 🟢 Tipos de campo DBF (formato de origem, dBase III/IV)

| Tipo DBF | Nome | Conversão aplicada na extração |
|---|---|---|
| `C` | Character | `cp850` → UTF-8, `rstrip` de espaços/nulos |
| `N` | Numeric | ASCII → `int` (sem decimais) ou `float` (com decimais); vazio → `NULL` |
| `D` | Date (`YYYYMMDD`) | `"00000000"`/`"11111111"` → `NULL`; senão → ISO `YYYY-MM-DD` |
| `L` | Logical | `True` se byte ∈ `{Y,y,T,t}` |
| `M` | Memo | `cp850` → UTF-8 |

## 🟢 Schema relacional alvo (`postgresql_schema.sql` / `mysql_schema.sql`)

### `cemiterio`
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | SMALLINT (PK) | sim | 1=Central, 2=Independência |
| codigo_legado | CHAR(2) | sim, único | '01'/'02' — código do sistema legado |
| nome | VARCHAR(100) | sim | |
| ativo | BOOLEAN | não | default TRUE |

### `quadra`
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | SERIAL/AUTO_INCREMENT (PK) | sim | |
| cemiterio_id | SMALLINT (FK cemiterio) | sim | |
| codigo | VARCHAR(6) | sim | único por cemitério; vem de `QUADRAIOQ` no CSV |
| descricao | VARCHAR(200) | não | |

### `tipo_lote` (domínio fixo, 2 valores)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| codigo | CHAR(1) (PK) | sim | '1' ou '3' |
| descricao | VARCHAR(50) | sim | '1'=Comum/temporário, '3'=Gaveta/Perpétuo |
| perpetuo | BOOLEAN | não | true apenas para '3' |

### `lote`
| Campo | Tipo | Obrigatório | Origem no CSV legado |
|---|---|---|---|
| id | BIGSERIAL/AUTO_INCREMENT (PK) | sim | |
| quadra_id | INT (FK quadra) | sim | resolvido via `QUADRAIOQ` |
| codigo | VARCHAR(6) | sim | `LOTEAIOQ` |
| tipo_codigo | CHAR(1) (FK tipo_lote) | sim | `TIPOAIOQ`, default `'1'` se vazio |
| gavetas | SMALLINT | não | `GAVETAIOQ`, default 1 |
| processo | VARCHAR(30) | não | `PROCESSOQ` |
| validade | DATE | não | `VALIDADEQ`; `NULL` = perpétuo |
| legado_cemiterio, legado_quadra | CHAR(2), VARCHAR(6) | não | rastreabilidade para a origem |
| 🔴 UNIQUE(quadra_id, codigo) | — | — | garante idempotência do upsert |

### `falecido`
| Campo | Tipo | Obrigatório | Origem no CSV legado |
|---|---|---|---|
| id | BIGSERIAL/AUTO_INCREMENT (PK) | sim | |
| lote_id | BIGINT (FK lote) | sim | resolvido via quadra+lote |
| item_ordem | SMALLINT | sim | `ITEMAIOQ` |
| nome | VARCHAR(200) | sim | `NOMEAIOQ` |
| dt_nascimento | DATE | não | `DT_NASCOQ` |
| dt_falecimento | DATE | sim | `DT_FALOQ` |
| certidao_numero | VARCHAR(30) | não | `CERTIDAOQ` |
| dt_emissao_certidao | DATE | não | `DT_EMIOQ` |
| cartorio | VARCHAR(200) | não | `CARTORIOQ` |
| medico | VARCHAR(200) | não | `MEDICOOQ` |
| causa_mortis | VARCHAR(500) | não | `CAUSAOQ` |
| coveiro_id | SMALLINT (FK funcionario) | não | `COD_FUNCQ` |
| pedreiro_id | SMALLINT (FK pedreiro) | não | `COD_PEDQ` |
| excluido | BOOLEAN | não | sempre `false` na importação (linhas com `FLAG_EXCLQ='*'` são puladas, não marcadas) |
| 🔴 UNIQUE(lote_id, item_ordem) | — | — | garante idempotência do upsert |

### `responsavel`
| Campo | Tipo | Obrigatório | Origem no CSV legado |
|---|---|---|---|
| id | BIGSERIAL/AUTO_INCREMENT (PK) | sim | |
| lote_id | BIGINT (FK lote) | sim | |
| item_ordem | SMALLINT | sim | `ITEMAIOQ` |
| nome | VARCHAR(200) | sim | `NOMEAIOQ`, sem tag `[FALECIDO]` |
| rg | VARCHAR(30) | não | `RGEAIOQ` |
| cpf_cnpj | VARCHAR(18) | não | `CPFAIOQ` |
| endereco | VARCHAR(200) | não | `ENDERECOQ` |
| numero | VARCHAR(20) | não | `NUMEROOQ` — só valores numéricos sobrevivem (ver achado em code-analysis.md) |
| cep | VARCHAR(10) | não | `CEPROOQ` |
| cidade | VARCHAR(100) | não | `CIDADEOQ` |
| telefone | VARCHAR(20) | não | `FONEEOQ` |
| celular | VARCHAR(20) | não | `CELULARQ` |
| falecido_flag | BOOLEAN | não | derivado da tag `[FALECIDO]` no nome original |
| ⚠️ Sem UNIQUE | — | — | reimportação duplica linhas (ver code-analysis.md) |

### `usuario_grupo` / `usuario` / `permissao` (segurança do legado — RBAC por grupo)
| Tabela.Campo | Tipo | Origem no CSV legado |
|---|---|---|
| usuario_grupo.codigo | CHAR(4) (PK) | `PW_GRUPO` |
| usuario_grupo.nome | VARCHAR(100) | `PW_NOGRUPO` |
| usuario.codigo | CHAR(4) (PK) | `PW_CODIGO` |
| usuario.grupo_codigo | CHAR(4) (FK) | `PW_GRUPO` |
| usuario.nome | VARCHAR(150) | `PW_NOME` |
| usuario.nivel | CHAR(1) | `PW_NIVEL` |
| usuario.senha_hash | VARCHAR(255) | `PW_PASS` → SHA256 (🔴 ver achado de segurança em code-analysis.md) |
| permissao.grupo_codigo + tabela | PK composta | `PW_GRUPO` + `PW_DBF` |
| permissao.pode_incluir/alterar/excluir/consultar/relatorio | BOOLEAN | decodificado de `PW_PERMIS` (🟡 inferido, ver code-analysis.md) |

### `lote_oba` / `lote_historico_validade` (específicas de Independência)
Rastreiam mapeamento alternativo de lote (`OBA.DBF`) e histórico de validades (`TTT.DBF`); campos `*_legado` preservam os valores originais, `lote_id` linka à tabela `lote` quando resolvido.

### `log_erro`
Log de erros do sistema legado (`ERROS.DBF`) — `codigo_erro` (`CODI_ERROQ`), `tipo_mensagem` (`TPMSG_ERRO`), `mensagem` (`MSG_ERROO`).

## 🔴 Lacunas confirmadas

- `FUNCIONA.DBF` e `PEDREIRO.DBF` não foram exportados (erro de encoding nos nomes de campo) — nomes reais de funcionários (id 4-12) e pedreiros (id 2-4) são desconhecidos, hardcoded como placeholder no importador.
