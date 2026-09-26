# Extração DBF, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24.

## Pré-requisitos
- [ ] Nenhuma dependência externa de leitura DBF necessária (stdlib apenas)
- [ ] Encoding `cp850` disponível no runtime Python de destino
- [ ] Acesso de leitura às pastas `Cemiterio Central/` e `Cemiterio Independencia/`

## Tarefas

- [ ] T-01, Implementar parser de header DBF (32 bytes: versão, data, nº registros, tamanho header, tamanho registro)
  - Origem no legado: `export_all_dbfs.py`, `read_dbf_full()`
  - Critério de pronto: header parseado corretamente para as 13+ tabelas de teste (Central + Independência)
  - Confiança: 🟢

- [ ] T-02, Implementar parser de descritores de campo (blocos de 32 bytes até `0x0D`)
  - Origem no legado: `export_all_dbfs.py`, `read_dbf_full()`
  - Critério de pronto: nomes e tipos de campo batem com `data-dictionary.md`
  - Confiança: 🟢

- [ ] T-03, Implementar leitura de registros com filtro de exclusão física (`0x2A`)
  - Origem no legado: `export_all_dbfs.py`, `read_dbf_full()`
  - Critério de pronto: contagem de registros válidos bate com `EXTRACTION_SUMMARY.txt` já gerado
  - Confiança: 🟢

- [ ] T-04, Implementar conversão de tipos (`C`/`N`/`D`/`L`/`M`), incluindo datas especiais → `NULL`
  - Origem no legado: RN006 em `domain.md`
  - Critério de pronto: `'00000000'`/`'11111111'` viram `NULL`; demais datas em ISO `YYYY-MM-DD`
  - Confiança: 🟢

- [ ] T-05, Implementar `write_csv()` (UTF-8)
  - Origem no legado: `export_all_dbfs.py`, `write_csv()`
  - Critério de pronto: CSV legível sem caracteres corrompidos para nomes com acentuação
  - Confiança: 🟢

- [ ] T-06, Implementar `write_parquet()` com fallback gracioso se `pyarrow` ausente
  - Origem no legado: `export_all_dbfs.py`, `write_parquet()`
  - Critério de pronto: extração completa sem erro mesmo sem `pyarrow` instalado
  - Confiança: 🟢

- [ ] T-07, Trocar `print()` de diagnóstico por `logging` (ou fixar `PYTHONIOENCODING=utf-8`)
  - Origem no legado: achado de causa-raiz em `code-analysis.md`, módulo `extracao-dbf`
  - Critério de pronto: CSVs de `FUNCIONA.DBF`/`PEDREIRO.DBF`/tabelas de sequência/`PRINTERS.DBF` são gerados nas duas unidades
  - Confiança: 🔴 — correção proposta, não comportamento confirmado do legado

## Tarefas de Teste

- [ ] TT-01, Teste do happy path: `.DBF` válido → CSV com registros corretos e datas convertidas
- [ ] TT-02, Teste de registro com exclusão física (`0x2A`) — não deve aparecer no CSV
- [ ] TT-03, Teste de tabela com nomes de campo corrompidos — hoje deve reproduzir a falha de `print()`; após T-07, deve gerar CSV corretamente

## Tarefas de Migração de Dados

- [ ] TM-01, Reextrair `FUNCIONA.DBF`/`PEDREIRO.DBF` de ambos os cemitérios após aplicar T-07, e comparar com a lista hardcoded atual do importador (ver `importacao-csv/tasks.md`)

## Ordem Sugerida
1. T-01 → T-02 → T-03 (parser binário, base de tudo)
2. T-04 → T-05 (conversão e gravação CSV)
3. T-06 (Parquet, independente, pode ser paralelo a T-04/T-05)
4. T-07 e TM-01 por último — dependem do parser já estar correto para não misturar duas fontes de erro

## Lacunas Pendentes (🔴)
- Motivo exato do abandono da tentativa OLEDB (`read_dbf.ps1`) — ver `questions.md`
- Decisão de negócio: vale a pena investir em T-07/TM-01 antes de ir para produção, dado que hoje a lista hardcoded de coveiros/pedreiros mascara o problema (ver `importacao-csv/questions.md`)?
