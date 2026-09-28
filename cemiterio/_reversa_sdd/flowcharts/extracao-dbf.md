# Fluxograma — extracao-dbf

> Gerado pelo Arqueólogo em 2026-09-24. Fonte: `export_all_dbfs.py`

```mermaid
flowchart TD
    A[main] --> B[Para cada pasta: Cemiterio Central, Cemiterio Independencia]
    B --> C[process_directory]
    C --> D[Listar arquivos *.DBF]
    D --> E[Para cada .DBF]
    E --> F[read_dbf_full]
    F --> G[Ler header 32 bytes]
    G --> H[Ler descritores de campo até 0x0D]
    H --> I[Para cada registro]
    I --> J{Byte 0 = 0x2A?}
    J -- sim, excluído --> I
    J -- não --> K[Decodificar campos por tipo C/N/D/L/M]
    K --> I
    I --> L[write_csv]
    L --> M{pyarrow instalado?}
    M -- sim --> N[write_parquet]
    M -- não --> O[pular Parquet, avisar]
    N --> E
    O --> E
    E --> P[Gravar EXTRACTION_SUMMARY.txt]
    P --> B
```

## Notas
- O passo `J` (byte de exclusão física `0x2A`) é distinto da exclusão lógica de negócio (`FLAG_EXCL='*'`), que só é tratada depois, na importação.
- `write_parquet` degrada graciosamente: se `pyarrow` não estiver instalado, a extração continua e só o CSV é gravado (confirmado: foi o caso nesta extração).
