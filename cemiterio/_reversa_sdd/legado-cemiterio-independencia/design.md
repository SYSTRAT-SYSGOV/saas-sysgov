# Legado — Cemitério Independência, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`.

## Interface (Inventário de Tabelas)

| Tabela | Registros válidos | Observação |
|---|---|---|
| `DADOS.DBF` | 14.906 | Mesma estrutura de campos do Central |
| `RESPONSA.DBF` | 11.642 | Mesma estrutura |
| `LOTES.DBF` | 7.437 | Mesma estrutura |
| `FALECIDO.DBF` | 7.864 | Índice de ocupação, mesma observação do Central (RN008) |
| `TTT.DBF` | 2.126 | **Exclusivo desta unidade.** Histórico de validades — campos mais largos: CEMITERIO C(9), QUADRA C(6), LOTE C(4), TIPO C(4), GAVETA N(2), PROCESSO N(6), VALIDADE D(8) |
| `OBA.DBF` | 5.012 | **Exclusivo desta unidade.** Mapeamento alternativo de lote — CEMITERIO C(9), QUADRA C(6), LOTE C(4) |
| `ERROS.DBF` | 712 | Mesma estrutura do Central |
| `PWUSUA.DBF`, `PWGRUPOS.DBF`, `PWTABELA.DBF` | 2 / 1 / 6 | Mesma estrutura do Central, **base de segurança independente** |
| `FUNCIONA.DBF` 🔴 | 4 (recuperados) | Códigos/nomes totalmente diferentes do Central: 9=ERIANDRO JOSE RIBAS, 11=EDSON RIBEIRO CABRAL, 12=RYAN |
| `PEDREIRO.DBF` 🔴 | 2 (recuperados) | Idem, numeração própria |
| `DAD_SEQ.DBF`, `FUN_SEQ.DBF`, `RES_SEQ.DBF`, `PED_SEQ.DBF` | 1 cada | Contadores internos |
| `PRINTERS.DBF` | — | Configuração de estação, fora de escopo |

## Fluxo Principal
`Cemiterio Independencia/*.DBF` → `export_all_dbfs.py` → `exported_data/Cemiterio Independencia/*.csv` → `import_csv_to_db.py` → tabelas com `cemiterio_id = 2`, incluindo `import_oba`/`import_historico` (exclusivos desta fase).

## Fluxos Alternativos
- `lote_oba`/`lote_historico_validade` no schema alvo já refletem corretamente a assimetria (só populadas para `cem_id == 2`) — ver `erd-complete.md`.
- `FUNCIONA.DBF`/`PEDREIRO.DBF` recuperáveis pela mesma técnica de leitura de bytes brutos usada no Central.

## Dependências
- Consumido por `extracao-dbf`, depois `importacao-csv`

## Decisões de Design Identificadas
N/A — dado legado estático.

## Estado Interno
Os próprios arquivos `.DBF`/`.NTX` são o estado. Sem backups `.ARJ` preservados nesta pasta (diferente do Central).

## Observabilidade
N/A.

## Riscos e Lacunas
- 🔴 Motivo de `OBA`/`TTT` existirem só nesta unidade não está documentado — não há indicação se o Central já teve essas tabelas e perdeu, ou se são específicas de um fluxo de trabalho que só existiu em Independência.
- 🟢 Confirmado: base de segurança (`PWUSUA`/`PWGRUPOS`/`PWTABELA`) é independente do Central, mesmo estrutura, dados diferentes.
