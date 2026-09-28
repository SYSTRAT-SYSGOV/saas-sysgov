# Extração DBF, Design Técnico

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, módulo `extracao-dbf`.

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `read_dbf_full` | `(filepath: str, encoding='cp850')` | `(fields, records, deleted_count)` | Parser binário completo de um `.DBF` |
| `write_csv` | `(fields, records, output_path)` | `None` | Grava CSV UTF-8 |
| `write_parquet` | `(fields, records, output_path)` | `None` | Grava Parquet via `pyarrow`; no-op silencioso se lib ausente |
| `process_directory` | `(input_dir, output_base, format='both')` | resumo (dict) | Itera todos os `.DBF` de um diretório |
| `main` | `()` | `None` | Orquestra as duas pastas de cemitério, grava `EXTRACTION_SUMMARY.txt` |

## Fluxo Principal
1. `main()` chama `process_directory()` uma vez por cemitério (`Cemiterio Central/`, `Cemiterio Independencia/`)
2. `process_directory()` itera cada `.DBF` do diretório, chamando `read_dbf_full()`
3. `read_dbf_full()` lê o header (32 bytes: versão, data, nº registros, tamanho header, tamanho registro), os descritores de campo (blocos de 32 bytes até `0x0D`), e depois os registros sequencialmente
4. Byte 0 de cada registro é checado: `0x2A` (`'*'`) → registro pulado (exclusão física do DBF)
5. Cada valor é convertido conforme o tipo (`C`→`cp850`→UTF-8 com `rstrip`; `N`→`int`/`float`; `D`→ISO ou `NULL` se `'00000000'`/`'11111111'`; `L`→booleano; `M`→`cp850`→UTF-8)
6. `write_csv()` grava o resultado; `write_parquet()` é tentado best-effort
7. `main()` consolida os resumos em `EXTRACTION_SUMMARY.txt`

## Fluxos Alternativos
- **`pyarrow` ausente:** `write_parquet()` é pulado sem interromper a extração — CSV ainda é gravado normalmente.
- **Nomes de campo com bytes corrompidos (`FUNCIONA`, `PEDREIRO`, tabelas de sequência, `PRINTERS`):** o campo `name` é decodificado com `errors='replace'` virando `�` (U+FFFD). O `print()` de listagem de campos, que roda **antes** da gravação do CSV, quebra com `UnicodeEncodeError` se o console não estiver em UTF-8 — essas tabelas **não têm CSV gerado**, diferente do caso abaixo.
- **Tabelas com nomes de campo limpos, mas aviso de Parquet ausente contém `⚠` (U+26A0):** o `print()` de aviso roda **depois** de `write_csv()` já ter sido chamado com sucesso — o CSV sobrevive, só o relatório de sucesso no console falha.

## Dependências
- Nenhuma biblioteca de terceiros para o formato DBF — parser 100% custom (ver ADR 0001 em `adrs/`)
- `pyarrow`, opcional, só para Parquet

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Parser DBF manual em vez de biblioteca de terceiros | `export_all_dbfs.py`, `read_dbf_full()` | 🟢 — ver ADR 0001 |
| Falha graciosa quando `pyarrow` ausente | `write_parquet()` | 🟢 |

## Estado Interno
Nenhum estado persistente entre execuções — cada execução relê os `.DBF` do zero e sobrescreve os CSVs de saída em `exported_data/`.

## Observabilidade
Apenas `print()` no console — não há `logging` estruturado usado em `export_all_dbfs.py`, apesar do módulo importar/configurar logging em outro ponto do projeto (achado em `code-analysis.md`). Isso é a causa raiz confirmada do "problema de encoding" relatado em `EXPORT_SUMMARY.md`: não é falha de parsing/gravação, é `UnicodeEncodeError` em `print()` quando o console não está em UTF-8.

## Riscos e Lacunas
- 🔴 Motivo exato do abandono do driver OLEDB (`read_dbf.ps1`, `Microsoft.Jet.OLEDB.4.0`) não está documentado — hipótese provável é indisponibilidade do driver 32-bit em ambiente 64-bit moderno, mas não confirmado.
- 🟡 `extract_data.py` usa uma segunda implementação divergente do parser (formatação de data `DD/MM/YYYY`, sem tratar `"11111111"` como nulo) — sem impacto hoje porque não é usado no fluxo real, mas risco se alguém migrar lógica dele para produção sem notar a divergência.
- 🟡 `read_dbf.py` tem bug conhecido e reconhecido no próprio código (linha 68: `start = field_data[12:16]  # This is wrong, need to track offset`) — script cai para dump bruto de bytes; usado só para inspeção manual, não bloqueia a extração real.
