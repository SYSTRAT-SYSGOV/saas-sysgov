# Análise de Código — cemiterio

> Gerado pelo Arqueólogo em 2026-09-24. Consolidado por módulo (granularidade: `feature`).

---

## Módulo `extracao-dbf`

**Arquivos:** `export_all_dbfs.py` (produção), `extract_data.py` (amostragem/debug), `read_dbf.py` (debug), `read_dbf.ps1` (tentativa alternativa via OLEDB, não usada no fluxo final)

### 🟢 Fluxo de controle

`export_all_dbfs.py` é o script de produção:
- `read_dbf_full(filepath, encoding='cp850') -> (fields, records, deleted_count)` — parser binário completo de um `.DBF`
- `write_csv(fields, records, output_path)` — grava CSV UTF-8
- `write_parquet(fields, records, output_path)` — grava Parquet via `pyarrow` (opcional, falha graciosamente se `pyarrow` ausente — confirmado: não instalado nesta extração, ver `EXPORT_SUMMARY.md`)
- `process_directory(input_dir, output_base, format='both')` — itera todos os `.DBF` de um diretório, chama os dois anteriores, retorna resumo
- `main()` — orquestra as duas pastas (`Cemiterio Central`, `Cemiterio Independencia`) e grava `EXTRACTION_SUMMARY.txt`

### 🟢 Algoritmo — parser DBF binário (sem biblioteca externa)

Não há dependência de biblioteca DBF em `requirements.txt` — o parsing é feito manualmente lendo o formato dBase III/IV byte a byte:

1. **Header (32 bytes):** byte 0 = versão; bytes 1-3 = data da última atualização (YY/MM/DD); bytes 4-7 = nº de registros (`uint32` little-endian); bytes 8-9 = tamanho do header (`uint16` LE); bytes 10-11 = tamanho do registro (`uint16` LE)
2. **Descritores de campo:** blocos de 32 bytes cada, terminados pelo byte `0x0D`. Cada descritor: nome (11 bytes, ASCII, padding `\x00`), tipo (1 char: `C`/`N`/`D`/`L`/`M`), tamanho, casas decimais
3. **Registros:** lidos sequencialmente a partir de `header_len`, `record_len` bytes cada. Byte 0 do registro = flag de exclusão física do DBF (`0x2A` = `'*'` = excluído) — registros marcados são **pulados na extração** (não entram no CSV)
4. **Conversão por tipo:**
   - `C` (Character): decodificado com `cp850` (DOS Latin-1), `rstrip` de espaços/nulos
   - `N` (Numeric): ASCII → `int` ou `float` conforme `decimal > 0`; vazio → `None`
   - `D` (Date, formato `YYYYMMDD`): `"00000000"` e `"11111111"` são tratados como `NULL`; caso contrário normalizado para ISO `YYYY-MM-DD`
   - `L` (Logical): `True` se byte ∈ `{Y,y,T,t}`
   - `M` (Memo): decodificado com `cp850`

### 🟡 Achados de risco

- **Duas exclusões distintas coexistem e não devem ser confundidas:** (1) o flag de exclusão física do próprio DBF (byte `0x2A`), filtrado nesta etapa de extração; (2) o campo de negócio `FLAG_EXCL='*'` dentro de `DADOS`/`RESPONSA` (exclusão lógica da aplicação legada), filtrado só depois, na importação (`import_csv_to_db.py`). Um registro pode ter apenas um dos dois marcadores.
- `extract_data.py` (script de amostragem) usa uma **segunda implementação divergente** do parser DBF, com formatação de data diferente (`DD/MM/YYYY` em vez de ISO) e sem tratar `"11111111"` como nulo — inconsistência entre scripts, mas sem impacto porque `extract_data.py` não é usado na extração real (é só inspeção manual).
- `read_dbf.py` (debug) tem um bug conhecido e reconhecido no próprio código: linha 68, `start = field_data[12:16]  # This is wrong, need to track offset` — o loop de leitura de valores de registro está incompleto/quebrado (variável `values` é populada mas nunca usada; o script cai para um dump bruto dos bytes). Não afeta a extração real, script é só para inspeção manual de headers.
- `read_dbf.ps1` é uma tentativa alternativa via `Microsoft.Jet.OLEDB.4.0` (driver 32-bit) — abandonada em favor do parser Python custom, provavelmente por indisponibilidade do driver Jet em ambiente 64-bit moderno. 🔴 LACUNA: motivo exato do abandono não está documentado.

### 🟢 Achado confirmado — causa raiz real do "problema de encoding" relatado em `EXPORT_SUMMARY.md`

Lendo os bytes brutos dos descritores de campo diretamente dos `.DBF` (bypassando o parser), foi possível **recuperar os nomes reais dos campos** de `FUNCIONA.DBF`, `PEDREIRO.DBF` e das tabelas de sequência — e comparar com `exported_data/EXTRACTION_SUMMARY.txt` (relatório gerado pelo próprio `export_all_dbfs.py` na execução mais recente, 2026-09-24 15:11:10, dentro de `exported_data/`, distinto do `EXPORT_SUMMARY.md` da raiz do projeto). Esse relatório mostra que **todas as 15 tabelas de cada cemitério "falharam" com `UnicodeEncodeError` ('charmap' codec)** — inclusive tabelas que claramente têm CSV válido em disco (`DADOS.csv`, `LOTES.csv` etc., com os registros descritos em `EXPORT_SUMMARY.md`).

A causa real **não é o parsing do DBF nem a gravação do CSV** (que já usa `encoding='utf-8'` explicitamente em `write_csv`) — é um `print()` no console que estoura porque o stdout dessa execução não está em UTF-8:
- Para tabelas com nomes de campo limpos (ex.: `DADOS`, `LOTES`, `PWUSUA`): o erro ocorre depois do CSV já gravado com sucesso, no aviso de Parquet ausente — `print(f"  ⚠ pyarrow não instalado...")` (`export_all_dbfs.py:161`) contém o caractere `⚠` (U+26A0), que não existe na code page `cp1252`/`charmap` do console Windows nesta execução. O CSV sobrevive porque já foi gravado antes do crash; só o relatório de sucesso (`summary.append`) nunca é alcançado.
- Para tabelas com bytes não-ASCII no nome dos campos (`FUNCIONA`, `PEDREIRO`, `DAD_SEQ`, `RES_SEQ`, `PRINTERS`, e `FUN_SEQ`/`PED_SEQ` do Central): o campo `name` é decodificado com `errors='replace'`, virando `�` (U+FFFD). O `print` de listagem de campos (`export_all_dbfs.py:189`, antes da gravação do CSV) já quebra com esse caractere — por isso, **só essas tabelas realmente não têm CSV em `exported_data/`** (confirmado: arquivos ausentes).

**Conclusão:** `EXPORT_SUMMARY.md` (na raiz) descreve corretamente quais CSVs existem, mas atribui a ausência de alguns a "problema de encoding nos nomes dos campos" — o que é só parcialmente verdade (verdadeiro para `FUNCIONA`/`PEDREIRO`/tabelas de sequência/`PRINTERS`, que têm bytes de lixo nos descritores de campo). Para essas, a única barreira real era o `print()` de diagnóstico no console, não o parsing em si — os nomes de campo verdadeiros (`CODIGO`, `NOME`, `RG` para `FUNCIONA`/`PEDREIRO`) são perfeitamente legíveis lendo os bytes até o primeiro `\x00`. Uma reextração trocando `print()` por `logging` (que já está configurado no módulo, mas não é usado em `export_all_dbfs.py`) ou fixando `PYTHONIOENCODING=utf-8` resolveria e recuperaria os dados de `FUNCIONA.DBF`/`PEDREIRO.DBF` — **os nomes reais dos funcionários/pedreiros (hoje hardcoded como placeholder em `import_csv_to_db.py`) provavelmente são recuperáveis**, contradizendo a lacuna assumida no módulo `importacao-csv`.

---

## Módulo `schema-destino`

**Arquivos:** `postgresql_schema.sql`, `mysql_schema.sql`, `create_db.sql`

### 🟢 Estrutura

13 tabelas, dois DDLs paralelos e estruturalmente equivalentes (PostgreSQL e MySQL 8.0+). Ver dicionário completo em `data-dictionary.md`.

Ordem de dependência (FKs): `cemiterio`, `tipo_lote` → `quadra` → `lote` → `falecido`/`responsavel`; `funcionario`/`pedreiro` → `falecido` (coveiro/pedreiro); `usuario_grupo` → `usuario`/`permissao`; `lote` → `lote_oba`/`lote_historico_validade` (específicas do cemitério Independência).

### 🟡 Achados de divergência entre os dois DDLs

- **PostgreSQL cria a extensão `uuid-ossp` (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`) mas nenhuma coluna usa `uuid_generate_v4()` ou tipo `UUID`** — todas as PKs são `SERIAL`/`BIGSERIAL` (inteiros). A extensão fica instalada sem uso — configuração morta, possivelmente resquício de um design anterior.
- **`updated_at` não se atualiza sozinho no PostgreSQL.** O MySQL declara `` `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP `` (atualização automática nativa). O DDL do PostgreSQL declara apenas `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` — **sem trigger equivalente** — ou seja, em PostgreSQL o campo só é preenchido na criação da linha e nunca mais muda automaticamente em updates subsequentes. Isso é uma lacuna funcional real se o sistema alvo rodar em PostgreSQL e depender de `updated_at` para auditoria.
- **`responsavel` não tem nenhuma constraint `UNIQUE`** em nenhum dos dois schemas (diferente de `lote` e `falecido`, que têm `UNIQUE(quadra_id/lote_id, codigo/item_ordem)`). Combinado com o achado do módulo `importacao-csv` (abaixo), isso significa que re-executar a importação de responsáveis duplica linhas.

---

## Módulo `importacao-csv`

**Arquivo:** `import_csv_to_db.py` (979 linhas)

### 🟢 Fluxo de controle

Classe `DatabaseConnection` — wrapper fino sobre `psycopg2`/`pymysql`, mesma interface para os dois bancos (`execute`, `executemany`, `fetchone`, `fetchall`, `cursor()` como context manager, `commit`/`rollback`).

Classe `CemiterioImporter.run_full_import()` — pipeline sequencial em uma única transação, ordem fixa (respeita FKs):
1. `import_cemiterios` → `import_tipos_lote` → `import_funcionarios` → `import_pedreiros` → `import_grupos_usuarios` → `import_usuarios` → `import_permissoes` (tabelas de referência, uma vez)
2. Por cemitério (1=Central, 2=Independência): `import_quadras` → `import_lotes` → `import_falecidos` → `import_responsaveis` → `import_erros`
3. Só para Independência (`cem_id == 2`): `import_oba`, `import_historico`
4. `commit()` único ao final; qualquer exceção dispara `rollback()` total

### 🟢 Regras de negócio

- **Exclusão lógica do legado:** `FLAG_EXCL == '*'` em `DADOS`/`RESPONSA` → registro pulado na importação (não é excluído por hard-delete do DBF, é o campo de negócio, ver nota no módulo `extracao-dbf`)
- **Tag `[FALECIDO]` embutida no nome do responsável:** quando o nome do responsável contém literalmente `[FALECIDO]` (case-insensitive), o sistema legado sinalizava que aquele responsável também já morreu. `is_falecido_flag()`/`clean_falecido_nome()` extraem isso para a coluna booleana `falecido_flag` e limpam o nome
- **Hash de senha:** `senha_hash = SHA256(senha)` — comentário no próprio código: `# Hash simples para migração (substituir por bcrypt/argon2 na aplicação real)`. 🔴 **Achado de segurança:** SHA256 sem salt é a senha efetivamente migrada para o banco novo; não é apenas um placeholder de exemplo, é o que o script realmente grava em `usuario.senha_hash`.
- **Decodificação de permissões (`PW_PERMIS`):** string de 20 caracteres interpretada como 5 blocos de 4 chars (Incluir/Alterar/Excluir/Consultar/Relatório), `'S' in bloco` → `True`. 🟡 **INFERIDO, não confirmado** — o próprio comentário no código tem um ponto de interrogação (`# Interpretar: ... ?`), indicando incerteza do autor original sobre o mapeamento exato de posições.
- 🔴 **CRÍTICO — a lista hardcoded de funcionários/pedreiros está incorreta, não é só incompleta.** O script assume que `FUNCIONA.DBF`/`PEDREIRO.DBF` "não puderam ser exportados" (ver `EXPORT_SUMMARY.md`) e grava uma lista fixa adivinhada de 12 funcionários e 4 pedreiros, mas isso é evitável: lendo os bytes brutos do `.DBF` diretamente (ver achado no módulo `extracao-dbf` acima), foi possível recuperar os dados reais e eles **não batem** com o hardcode:
  - `FUNCIONA.DBF` do Central tem só 3 registros reais: código `4`=RAFAEL STARON, `7`=(vazio), `8`=AUGUSTO BOJAN. O script hardcoded grava RAFAEL STARON no código `2` e AUGUSTO BOJAN no código `3` — **códigos errados**, o que faz `falecido.coveiro_id` apontar para a pessoa errada em qualquer sepultamento que originalmente referenciasse `COD_FUNC=4` ou `COD_FUNC=8`.
  - `FUNCIONA.DBF`/`PEDREIRO.DBF` do Independência têm **códigos e nomes completamente diferentes** dos do Central (ex.: código `9`=ERIANDRO JOSE RIBAS, `11`=EDSON RIBEIRO CABRAL, `12`=RYAN — nenhum desses aparece no hardcode). O importador usa a **mesma lista global** para os dois cemitérios porque `funcionario`/`pedreiro` no schema alvo não têm `cemiterio_id` (são tabelas globais) — isso é uma incompatibilidade de modelagem: no legado, os códigos de funcionário são por cemitério (cada `Cemiterio */FUNCIONA.DBF` tem sua própria numeração), mas o schema alvo os trata como um único domínio compartilhado. Sem correção, `coveiro_id`/`pedreiro_id` dos falecidos de Independência vão silenciosamente apontar para funcionários/pedreiros do Central (ou para nenhum, via `ON CONFLICT`/FK nula).
  - `PEDREIRO.DBF` do Central, por outro lado, genuinamente tem dados corrompidos nos códigos 2-4 (nomes como `'�'`, `'3324'`, `'21'`, RG com lixo tipo `'45MKMJKM1,2'`) — aí sim o placeholder é uma escolha razoável, mas isso só pôde ser confirmado lendo os bytes brutos, não estava documentado em lugar nenhum.

### 🟡 Achados técnicos

- **`get_csv_field()` tenta múltiplas variações de nome de coluna incluindo bytes nulos** (`key.replace('IO','IO\x00')` etc.) — workaround para nomes de campo DBF de 11 bytes que às vezes preservam padding/artefatos de encoding no cabeçalho do CSV exportado. Se um header do CSV vier em um padrão de bytes não previsto nessa lista, o campo retorna `''` silenciosamente (sem erro, sem log) — risco de perda silenciosa de dado em uma reexportação futura com nomes de campo ligeiramente diferentes.
- **`import_responsaveis` não usa `ON CONFLICT`/`ON DUPLICATE KEY`** (diferente de `cemiterios`, `tipos_lote`, `funcionarios`, `pedreiros`, `quadras`, `lotes`, `falecidos`) — combinado com a ausência de `UNIQUE` no schema (achado do módulo `schema-destino`), **rodar o import duas vezes duplica todos os responsáveis**. Os demais `import_*` são idempotentes (upsert); este não é.
- **`_insert_lote_batch` no caminho PostgreSQL não é um batch de verdade:** itera `cur.execute()` linha a linha dentro do "batch" (para poder usar `RETURNING id`), mas descarta o `id` retornado (`pass`, com comentário `# fazer lookup depois`) e em vez disso chama `_refresh_lote_cache()`, que faz um `SELECT ... WHERE (quadra_id, codigo) NOT IN (...)` comparando contra **todas as chaves já cacheadas**. Esse refresh roda a cada lote de 1000 linhas — para MySQL, a lista de parâmetros do `NOT IN` cresce a cada chamada (todas as chaves do cache inteiro), o que é `O(n²)` ao longo da importação completa. Com ~9.835 lotes ao todo, não é crítico agora, mas não escala para uma base de dados legada maior.
- `numero` do endereço do responsável é convertido via `parse_int` e depois `str(numero)` — números de casa não numéricos (ex.: `"S/N"`, `"12A"`) falham o `parse_int` silenciosamente e viram `None`, perdendo a informação original.
- `main()` verifica se a tabela `cemiterio` já existe antes de importar (exige rodar o schema SQL primeiro) e suporta `--schema-only` para só validar a conexão/schema sem importar dados.

---

## Módulo `legado-cemiterio-central`

**Arquivos:** `Cemiterio Central/*.DBF` + `*.NTX` (índices, não analisados — só o `.DBF` é lido pelo pipeline de migração)

### 🟢 Inventário de tabelas (nomes de campo confirmados lendo os bytes brutos do descritor)

| Tabela | Registros válidos | Campos reais |
|---|---|---|
| `DADOS.DBF` | 6.951 | CEMITERIO, QUADRA, LOTE, ITEM, NOME, DT_NASC, DT_FAL, CERTIDAO, DT_EMI, CARTORIO, MEDICO, CAUSA, COD_FUNC, COD_PED, FLAG_EXCL |
| `RESPONSA.DBF` | 4.332 | CEMITERIO, QUADRA, LOTE, ITEM, NOME, RG, CPF, ENDERECO, NUMERO, CEP, CIDADE, FONE, CELULAR, FLAG_EXCL |
| `LOTES.DBF` | 2.398 | CEMITERIO, QUADRA, LOTE, TIPO, GAVETA, PROCESSO, VALIDADE |
| `FALECIDO.DBF` | 2.477 | CEMITERIO, QUADRA, LOTE — **apenas índice de lotes ocupados, não tem os dados do óbito** (esses estão em `DADOS.DBF`) |
| `ERROS.DBF` | 712 | CODI_ERRO, TPMSG_ERRO, MSG_ERRO |
| `PWUSUA.DBF` | 2 | PW_GRUPO, PW_CODIGO, PW_NOME, PW_NIVEL, PW_OBS, **PW_PASS: C(6)** — senha de até 6 caracteres, em texto puro no DBF |
| `PWGRUPOS.DBF` | 1 | PW_GRUPO, PW_NOGRUPO |
| `PWTABELA.DBF` | 6 | PW_GRUPO, PW_DBF, PW_PERMIS, FLAG_EXCL |
| `FUNCIONA.DBF` 🔴 | 3 (recuperados via leitura de bytes brutos) | CODIGO, NOME, RG — ver achado crítico no módulo `importacao-csv` |
| `PEDREIRO.DBF` 🔴 | 4 (dados de códigos 2-4 corrompidos no próprio DBF) | CODIGO, NOME, RG |
| `DAD_SEQ.DBF`, `RES_SEQ.DBF` | 1 cada | ITEM — contador sequencial, sem relevância além do controle interno do Clipper |
| `FUN_SEQ.DBF`, `PED_SEQ.DBF` | 1 cada | CODIGO — idem |
| `PRINTERS.DBF` | — | Configuração de impressoras do posto de trabalho original (MARCA, PORTA, PADRAO + 14 campos de template de impressão) — **não é dado de negócio**, é configuração de estação de trabalho; corretamente fora do escopo da migração |

### 🟡 Achados

- `FALECIDO.DBF` (índice de ocupação) é extraído para CSV mas **não é lido em nenhum ponto de `import_csv_to_db.py`** (`CEMETERIOS[1]['files']` não tem entrada para ele). Os dados de óbito vêm inteiramente de `DADOS.DBF`. Não há indício de perda de informação (campos de `FALECIDO.DBF` são um subconjunto de `DADOS.DBF`), mas vale confirmar com o usuário se `FALECIDO.DBF` tinha algum propósito adicional no sistema legado (ex.: cache de índice usado pela aplicação Clipper para navegação rápida) antes de descartá-lo definitivamente.
- Único cemitério dos dois que tem `PRINTERS.DBF` preservado no diretório — mais uma confirmação de que é configuração local de estação, não dado replicado entre unidades.

---

## Módulo `legado-cemiterio-independencia`

**Arquivos:** `Cemiterio Independencia/*.DBF` + `*.NTX`

### 🟢 Inventário de tabelas

| Tabela | Registros válidos | Observação |
|---|---|---|
| `DADOS.DBF` | 14.906 | Mesma estrutura de campos do Central |
| `RESPONSA.DBF` | 11.642 | Mesma estrutura |
| `LOTES.DBF` | 7.437 | Mesma estrutura |
| `FALECIDO.DBF` | 7.864 | Mesma estrutura (índice de ocupação, não importado — mesma observação do Central) |
| `TTT.DBF` | 2.126 | Histórico de validades — **campos mais largos que o padrão**: CEMITERIO C(9), QUADRA C(6), LOTE C(4), TIPO C(4), GAVETA N(2), PROCESSO N(6), VALIDADE D(8) |
| `OBA.DBF` | 5.012 | Mapeamento alternativo de lote — CEMITERIO C(9), QUADRA C(6), LOTE C(4) — **estrutura específica desta unidade**, sem equivalente no Central |
| `ERROS.DBF` | 712 | Mesma estrutura do Central |
| `PWUSUA.DBF`, `PWGRUPOS.DBF`, `PWTABELA.DBF` | 2 / 1 / 6 | Mesma estrutura do Central — **mas é uma base de segurança independente**, não compartilhada com o Central (ver módulo `seguranca-usuarios-permissoes`) |
| `FUNCIONA.DBF` 🔴 | 4 (recuperados) | Códigos e nomes totalmente diferentes dos do Central — ver achado crítico no módulo `importacao-csv` |
| `PEDREIRO.DBF` 🔴 | 2 (recuperados) | Idem |
| `DAD_SEQ.DBF`, `FUN_SEQ.DBF`, `RES_SEQ.DBF`, `PED_SEQ.DBF` | 1 cada | Contadores sequenciais |
| `PRINTERS.DBF` | — | Config. de estação, fora de escopo |

### 🟡 Achados específicos desta unidade

- É a única unidade com `OBA.DBF` e `TTT.DBF` — não há indicação de que o Central já teve essas tabelas e perdeu, ou se são específicas de um fluxo de trabalho que só existiu em Independência (🔴 LACUNA, vale confirmar com o usuário/operador do sistema legado).
- `lote_oba` e `lote_historico_validade` no schema alvo já refletem corretamente essa assimetria (só populadas para `cem_id == 2`).

---

## Módulo `seguranca-usuarios-permissoes`

**Fontes:** `PWUSUA.DBF`, `PWGRUPOS.DBF`, `PWTABELA.DBF` de **cada** cemitério

### 🟢 Modelo confirmado

RBAC simples por grupo, independente por cemitério: cada `Cemiterio */PWUSUA.DBF` tem seus próprios usuários (`PW_CODIGO`, PK de 4 chars), vinculados a um grupo (`PW_GRUPO`) definido em `PWGRUPOS.DBF`, e as permissões por grupo+tabela ficam em `PWTABELA.DBF` (`PW_PERMIS`, string de 20 chars decodificada como 5 blocos de 4 — ver achado 🟡 inferido no módulo `importacao-csv`).

### 🔴 Achados críticos de segurança

- **Senha de até 6 caracteres, em texto puro no DBF** (`PW_PASS: C(6)`) — o sistema legado não usa hash nem criptografia. A migração aplica SHA256 sem salt (achado já registrado no módulo `importacao-csv`), o que é uma melhoria marginal sobre texto puro mas ainda inadequado para produção.
- **`import_usuarios` e `import_grupos_usuarios` rodam para `cem_id in [1, 2]` na mesma tabela global `usuario`/`usuario_grupo`** (sem `cemiterio_id`) — como `usuario.codigo` é `CHAR(4) PRIMARY KEY`, **se o mesmo código de usuário existir em ambos os cemitérios (números de 4 dígitos, universo pequeno — plausível)**, o upsert (`ON CONFLICT ... DO UPDATE SET nome=...`) do segundo cemitério **sobrescreve silenciosamente** o usuário do primeiro. Mesmo problema estrutural do achado sobre `funcionario`/`pedreiro`: o schema alvo assume usuários globais, mas o legado tem uma base de segurança **por cemitério**, não compartilhada. 🔴 Requer decisão do usuário: os usuários das duas unidades são de fato a mesma pessoa (mesmo login usado nos dois sistemas) ou são universos de código independentes que colidem por acaso?
