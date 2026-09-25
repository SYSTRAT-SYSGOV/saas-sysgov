EXTRACAO COMPLETA CONCLUIDA - RESUMO FINAL
===========================================

Data: 2026-09-24 14:30:36
Origem: D:\SYSTRAT\Novos Projetos\Gestao Cemiterios\cemiterio
Destino: D:\SYSTRAT\Novos Projetos\Gestao Cemiterios\cemiterio\exported_data
Encoding: CP850 (DOS Latin-1) -> UTF-8

ARQUIVOS GERADOS (CSV)
----------------------

CEMITERIO CENTRAL (8 tabelas):
  DADOS.csv          796 KB   6.951 registros  (falecidos/sepultamentos)
  RESPONSA.csv       432 KB   4.332 registros  (responsaveis/concessionarios)
  LOTES.csv           72 KB   2.398 registros  (cadastro de lotes)
  FALECIDO.csv        35 KB   2.477 registros  (indices de lotes ocupados)
  ERROS.csv          113 KB     712 registros  (log de erros do sistema)
  PWUSUA.csv           289 B       2 registros  (usuarios do sistema)
  PWTABELA.csv         844 B       6 registros  (permissoes por grupo/tabela)
  PWGRUPOS.csv          65 B       1 registro   (grupos de permissao)

  Tabelas sem CSV (problema encoding nos nomes dos campos):
  - DAD_SEQ, FUN_SEQ, RES_SEQ, FUNCIONA, PEDREIRO, PED_SEQ, PRINTERS
  (tabelas pequenas, podem ser extraidas manualmente se necessario)

CEMITERIO INDEPENDENCIA (11 tabelas):
  DADOS.csv         2.07 MB  14.906 registros
  RESPONSA.csv      1.27 MB  11.642 registros
  LOTES.csv         230 KB   7.437 registros
  FALECIDO.csv      110 KB   7.864 registros
  TTT.csv            66 KB   2.126 registros (historico de validades)
  OBA.csv            70 KB   5.012 registros (mapeamento alternativo)
  ERROS.csv         113 KB     712 registros
  PWUSUA.csv           289 B       2 registros
  PWTABELA.csv         844 B       6 registros
  PWGRUPOS.csv          65 B       1 registro
  FUN_SEQ.csv           17 B       1 registro
  PED_SEQ.csv           16 B       1 registro

  Tabelas sem CSV (problema encoding):
  - DAD_SEQ, RES_SEQ, FUNCIONA, PEDREIRO, PRINTERS

TOTAIS CONSOLIDADOS
-------------------
  Falecidos (DADOS):        21.857 registros
  Responsaveis (RESPONSA):  15.974 registros
  Lotes (LOTES):             9.835 registros
  Lotes Ocupados (FALECIDO): 10.341 registros

QUALIDADE DOS DADOS
-------------------
✓ Encoding CP850 convertido corretamente para UTF-8
✓ Acentos preservados (ex: ARAUCARIA, SAO VICENTE, PARADA CARDIORESPIRATORIA)
✓ Datas normalizadas para ISO 8601 (YYYY-MM-DD)
✓ Datas '11111111' e '00000000' convertidas para vazio (NULL)
✓ Exclusao logica (FLAG_EXCL = '*') filtrada - apenas registros ativos
✓ Campos numericos convertidos para int/float
✓ CSV com aspas para campos com virgula (ex: causa mortis)

PROXIMOS PASSOS RECOMENDADOS
----------------------------
1. Importar CSVs no banco de dados alvo (PostgreSQL/MySQL/SQL Server)
2. Criar chaves primarias compostas e estrangeiras
3. Normalizar tabelas de seguranca (PW*) para modelo relacional
4. Validar integridade referencial (FKs entre DADOS-RESPONSA-LOTES)
5. Gerar scripts de carga inicial para o novo sistema

ESTRUTURA DE DIRETORIOS
-----------------------
exported_data/
├── Cemiterio Central/
│   ├── DADOS.csv
│   ├── RESPONSA.csv
│   ├── LOTES.csv
│   ├── FALECIDO.csv
│   ├── ERROS.csv
│   ├── PWUSUA.csv
│   ├── PWTABELA.csv
│   └── PWGRUPOS.csv
└── Cemiterio Independencia/
    ├── DADOS.csv
    ├── RESPONSA.csv
    ├── LOTES.csv
    ├── FALECIDO.csv
    ├── TTT.csv
    ├── OBA.csv
    ├── ERROS.csv
    ├── PWUSUA.csv
    ├── PWTABELA.csv
    ├── PWGRUPOS.csv
    ├── FUN_SEQ.csv
    └── PED_SEQ.csv

NOTAS TECNICAS
--------------
- Parquet nao gerado (pyarrow nao instalado). Para gerar: pip install pyarrow
- Tabelas de sequencia (DAD_SEQ, FUN_SEQ, PED_SEQ, RES_SEQ) contem apenas contadores
- Tabelas FUNCIONA e PEDREIRO tem nomes de campos com caracteres especiais do CP850
- Arquivo TTT.DBF (Independencia) parece ser historico de validades de lotes
- Arquivo OBA.DBF (Independencia) usa estrutura diferente (CEMITERIO C9, QUADRA C6)