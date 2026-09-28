# Extração DBF

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`, `domain.md`.

## Visão Geral
Componente que lê os arquivos `.DBF` (dBase III/IV) dos dois cemitérios legados e os converte para CSV UTF-8 intermediário, servindo de primeira etapa do pipeline de migração. Não depende de biblioteca externa de leitura DBF (parser binário próprio — ADR 0001).

## Responsabilidades
- Ler header, descritores de campo e registros de cada `.DBF`
- Converter cada valor conforme o tipo de campo DBF (`C`/`N`/`D`/`L`/`M`) e encoding `cp850` → UTF-8
- Filtrar registros fisicamente excluídos no próprio DBF (byte `0x2A`)
- Gravar CSV UTF-8 por tabela; opcionalmente Parquet
- Gerar um resumo consolidado da extração (`EXTRACTION_SUMMARY.txt`)

## Regras de Negócio
- Registro com flag de exclusão física (`0x2A`) não entra no CSV — distinto do `FLAG_EXCL` de negócio, tratado só na importação 🟢
- Datas `'00000000'`/`'11111111'` → `NULL` (ver RN006, `domain.md`) 🟢
- Encoding de origem é sempre `cp850` (DOS Latin-1) 🟢
- Geração de Parquet é opcional — se `pyarrow` não estiver instalado, o passo é pulado sem interromper a extração 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Ler e parsear todos os `.DBF` de um diretório | Must | CSV gerado para cada tabela legível |
| RF-02 | Converter valores por tipo de campo (`C`/`N`/`D`/`L`/`M`) | Must | Valores no CSV batem com o dicionário de dados |
| RF-03 | Gravar CSV UTF-8 por tabela | Must | Arquivo `.csv` sem erros de encoding no conteúdo |
| RF-04 | Gravar Parquet opcionalmente | Could | Se `pyarrow` presente, arquivo `.parquet` gerado; se ausente, extração segue sem erro |
| RF-05 | Gerar resumo consolidado da extração | Should | `EXTRACTION_SUMMARY.txt` lista tabelas processadas e contagens |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | Extração continua mesmo sem `pyarrow` instalado (degradação graciosa) | `export_all_dbfs.py`, `write_parquet()` | 🟢 |
| Confiabilidade | Saída de console (`print`) não deve interromper a gravação do CSV já concluída | achado de causa-raiz em `code-analysis.md`, módulo `extracao-dbf` | 🔴 — hoje **falha** para tabelas com nomes de campo corrompidos (`FUNCIONA`, `PEDREIRO` etc.), o `print()` de diagnóstico quebra **antes** do CSV ser gravado |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um arquivo .DBF válido com registros ativos e excluídos fisicamente
Quando a extração é executada
Então o CSV gerado contém apenas os registros não excluídos fisicamente, com datas especiais convertidas para NULL

Dado um arquivo .DBF cujos nomes de campo contêm bytes não-ASCII corrompidos (ex.: FUNCIONA.DBF)
Quando a extração tenta imprimir a listagem de campos no console
Então o processo falha com UnicodeEncodeError antes de gravar o CSV daquela tabela — nenhum dado é extraído para ela
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|----------------|
| Parser binário DBF (header/campos/registros) | Must | Caminho crítico, toda a migração depende dele |
| Conversão de tipos e datas especiais | Must | Regra de negócio sem fallback (RN006) |
| Geração de Parquet | Could | Opcional, não usado no fluxo de importação real |
| Correção do `print()`→`logging` para recuperar `FUNCIONA`/`PEDREIRO` | Should | Não é caminho crítico da extração em si, mas bloqueia dado real de negócio (RN012) |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `export_all_dbfs.py` | `read_dbf_full`, `write_csv`, `write_parquet`, `process_directory`, `main` | 🟢 |
| `extract_data.py` | Implementação divergente, apenas amostragem/debug | 🟡 |
| `read_dbf.py` | Utilitário de inspeção, bug conhecido (linha 68) | 🟡 |
| `read_dbf.ps1` | Tentativa OLEDB abandonada | 🔴 |
