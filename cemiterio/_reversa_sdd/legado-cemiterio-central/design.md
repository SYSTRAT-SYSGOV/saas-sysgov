# Legado — Cemitério Central, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`.

## Interface (Inventário de Tabelas)

| Tabela | Registros válidos | Campos reais | Observação |
|---|---|---|---|
| `DADOS.DBF` | 6.951 | CEMITERIO, QUADRA, LOTE, ITEM, NOME, DT_NASC, DT_FAL, CERTIDAO, DT_EMI, CARTORIO, MEDICO, CAUSA, COD_FUNC, COD_PED, FLAG_EXCL | Dados completos de óbito |
| `RESPONSA.DBF` | 4.332 | CEMITERIO, QUADRA, LOTE, ITEM, NOME, RG, CPF, ENDERECO, NUMERO, CEP, CIDADE, FONE, CELULAR, FLAG_EXCL | Responsáveis/concessionários |
| `LOTES.DBF` | 2.398 | CEMITERIO, QUADRA, LOTE, TIPO, GAVETA, PROCESSO, VALIDADE | Estrutura física |
| `FALECIDO.DBF` | 2.477 | CEMITERIO, QUADRA, LOTE | Índice de ocupação — não é fonte de verdade (RN008) |
| `ERROS.DBF` | 712 | CODI_ERRO, TPMSG_ERRO, MSG_ERRO | Log de erros do legado |
| `PWUSUA.DBF` | 2 | PW_GRUPO, PW_CODIGO, PW_NOME, PW_NIVEL, PW_OBS, PW_PASS `C(6)` | Senha em texto puro |
| `PWGRUPOS.DBF` | 1 | PW_GRUPO, PW_NOGRUPO | |
| `PWTABELA.DBF` | 6 | PW_GRUPO, PW_DBF, PW_PERMIS, FLAG_EXCL | Matriz de permissões |
| `FUNCIONA.DBF` 🔴 | 3 (recuperados via bytes brutos) | CODIGO, NOME, RG | Central: código 4=RAFAEL STARON, 7=vazio, 8=AUGUSTO BOJAN |
| `PEDREIRO.DBF` 🔴 | 4 (códigos 2-4 corrompidos no DBF) | CODIGO, NOME, RG | Corrupção na origem, não recuperável |
| `DAD_SEQ.DBF`, `RES_SEQ.DBF`, `FUN_SEQ.DBF`, `PED_SEQ.DBF` | 1 cada | ITEM/CODIGO | Contadores internos do Clipper, sem relevância de negócio |
| `PRINTERS.DBF` | — | MARCA, PORTA, PADRAO + 14 campos de template | Configuração de estação, corretamente fora de escopo |

## Fluxo Principal
Esta unit não executa lógica — é a fonte de dados consumida pela unit `extracao-dbf`. O fluxo de dados é: `Cemiterio Central/*.DBF` → `export_all_dbfs.py` → `exported_data/Cemiterio Central/*.csv` → `import_csv_to_db.py` → tabelas com `cemiterio_id = 1`.

## Fluxos Alternativos
- **`FUNCIONA.DBF`/`PEDREIRO.DBF` com bytes corrompidos no nome do campo:** recuperáveis lendo os bytes brutos do descritor diretamente (ver `extracao-dbf/design.md`).
- **`PEDREIRO.DBF` códigos 2-4:** corrupção está nos **dados**, não no nome do campo — não recuperável pela mesma técnica.

## Dependências
- Consumido por `extracao-dbf` (primeira leitura)
- Indiretamente por `importacao-csv` (via CSV intermediário)

## Decisões de Design Identificadas
N/A — esta unit é dado legado estático, não código com decisões de design.

## Estado Interno
Os próprios arquivos `.DBF`/`.NTX` são o estado. Existe também um histórico de backups `.ARJ` (2009–2011) em `Cemiterio Central/backup/`, não analisado nesta extração — propósito atual desconhecido (ativo, arquivo morto, ou redundante com o `.DBF` corrente).

## Observabilidade
N/A — dado estático, sem instrumentação.

## Riscos e Lacunas
- 🔴 Propósito adicional de `FALECIDO.DBF` (além de índice) não confirmado — ver `questions.md`.
- 🔴 `PEDREIRO.DBF` códigos 2-4 corrompidos na origem — perda de dado permanente, a menos que exista registro em papel para reconstrução manual.
- 🔴 Propósito atual dos backups `.ARJ` (2009-2011) não avaliado — podem conter dado histórico relevante ou ser puramente arquivo morto.
