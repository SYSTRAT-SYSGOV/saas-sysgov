# Análise dos Scripts de Migração

## export_all_dbfs.py

### Propósito
Converter todos os arquivos DBF dos dois cemitérios para CSV e/ou Parquet.

### Funcionamento
1. **read_dbf_full()** - Leitura completa de arquivo DBF:
   - Header de 32 bytes (versão, data, num_registros, header_len, record_len)
   - Descritores de campo (32 bytes cada, terminador 0x0D)
   - Registros: byte 0 = flag exclusão (0x2A = '*'), depois dados por campo
   - Tipos suportados: C (Character), N (Numeric), D (Date), L (Logical), M (Memo)

2. **write_csv()** - Escrita CSV com UTF-8
3. **write_parquet()** - Escrita Parquet (requer pyarrow, opcional)
4. **process_directory()** - Processa todos .DBF de um diretório
5. **main()** - Orquestra processamento dos dois cemitérios

### Características
- Encoding: CP850 → UTF-8
- Datas: YYYYMMDD → YYYY-MM-DD (datas inválidas como '00000000', '11111111' → NULL)
- Exclusão lógica: Registros com flag '*' são contados mas não exportados
- Relatório: EXTRACTION_SUMMARY.txt com estatísticas consolidadas

### Saída
- CSV por tabela por cemitério em `exported_data/<Cemiterio>/`
- Parquet opcional (se pyarrow instalado)

---

## import_csv_to_db.py

### Propósito
Importar CSVs exportados para PostgreSQL ou MySQL com idempotência e integridade referencial.

### Arquitetura
- **DatabaseConnection**: Abstração para PostgreSQL (psycopg2) e MySQL (pymysql)
  - Transações manuais (autocommit=False)
  - Context manager para cursores
  - execute_batch (PG) / executemany (MySQL) para bulk insert
  - Suporte a ON CONFLICT (PG) / ON DUPLICATE KEY (MySQL)

- **CemiterioImporter**: Lógica de importação ordenada:
  1. Tabelas de referência (cemiterio, tipo_lote, funcionario, pedreiro, usuario_grupo, usuario, permissao)
  2. Por cemitério: quadras → lotes → falecidos → responsaveis → erros
  3. Específicos Independência: OBA, histórico (TTT)

### Estratégia de Idempotência
- **INSERT ... ON CONFLICT / ON DUPLICATE KEY UPDATE** em todas as tabelas
- Chaves primárias compostas naturais (legado_cemiterio, legado_quadra, legado_lote, item_ordem)
- Caches em memória para lookups: quadra_cache, lote_cache, funcionario_cache, pedreiro_cache

### Processamento em Lotes
- BATCH_SIZE = 1000
- Acumula em lista, faz flush via execute_batch/executemany
- Refresh de cache de lotes após cada batch

### Normalização e Limpeza
- **parse_date()**: Trata strings vazias, 'NULL', 'None', '1111-11-11', '0000-00-00'
- **parse_int()**, **parse_float()**: Conversão segura
- **clean_str()**: Strip e NULL para vazios
- **is_falecido_flag()**: Detecta `[FALECIDO]` no nome
- **clean_falecido_nome()**: Remove `[FALECIDO]` do nome
- **get_csv_field()**: Busca campo tolerando null bytes nos headers

### Mapeamento de Tipos de Lote
```python
TIPO_LOTE_MAP = {
    '1': ('Comum (terra) - Concessão Temporária', False),
    '3': ('Gaveta/Perpétuo (concreto) - Perpetuidade', True),
}
```

### Dados Fixos (Hardcoded)
- **Funcionários (coveiros)**: 12 registros com códigos 1-12
- **Pedreiros**: 4 registros com códigos 1-4
- **Cemitérios**: 2 registros fixos (id=1 'Central', id=2 'Independência')

### Tabelas Específicas Independência
- **OBA** (lote_oba): Mapeamento alternativo quadra/lote
- **TTT** (lote_historico_validade): Histórico de mudanças de validade/tipo

### CLI
```bash
python import_csv_to_db.py --db postgresql --host localhost --database cemiterios_migracao --user postgres --password senha
python import_csv_to_db.py --db mysql --host localhost --database cemiterios_migracao --user root --password senha
```
- `--schema-only`: Apenas valida existência das tabelas

---

## extract_data.py

### Propósito
Análise exploratória: extrai amostras, estatísticas e relata qualidade dos dados.

### Funcionamento
- Usa read_dbf.py para ler DBFs diretamente
- Imprime 5 primeiros registros de cada tabela
- Conta registros totais por tabela por cemitério
- Reporta erros de encoding
- Gera saída formatada para console

---

## read_dbf.py

### Propósito
Biblioteca de leitura DBF de baixo nível.

### Funcionamento
- Parse de header DBF
- Leitura de descritores de campo
- Decodificação de registros por tipo de campo
- Tratamento de encoding CP850
- Retorna lista de dicionários

---

## Schema SQL (postgresql_schema.sql / mysql_schema.sql)

### Tabelas e Relacionamentos

```
cemiterio (PK: id)
    │
    └── quadra (PK: id, FK: cemiterio_id, UK: cemiterio_id+codigo)
            │
            └── lote (PK: id, FK: quadra_id, FK: tipo_codigo, UK: quadra_id+codigo)
                    │
                    ├─── falecido (PK: id, FK: lote_id, UK: lote_id+item_ordem, FK: coveiro_id, pedreiro_id)
                    │
                    └─── responsavel (PK: id, FK: lote_id)
```

### Tabelas de Referência
- **tipo_lote**: '1'=Comum/Temporário, '3'=Gaveta/Perpétuo
- **funcionario**: Coveiros (PK = código legado)
- **pedreiro**: Pedreiros (PK = código legado)

### Tabelas de Segurança
- **usuario_grupo**: Grupos de permissão
- **usuario**: Usuários (senha_hash SHA256)
- **permissao**: Matriz grupo × tabela (I/A/E/C/R)

### Auditoria
- **log_erro**: Log de erros do sistema legado

### Tabelas Específicas Independência
- **lote_oba**: Mapeamento alternativo (cemiterio_legado, quadra_legado, lote_legado → lote_id)
- **lote_historico_validade**: Histórico (cemiterio_legado, quadra_legado, lote_legado, tipo, gavetas, processo, validade, lote_id)

### Índices
- `idx_lote_quadra`, `idx_lote_validade`, `idx_lote_tipo`
- `idx_falecido_lote`, `idx_falecido_nome`, `idx_falecido_dt_falecimento`, `idx_falecido_certidao`
- `idx_responsavel_lote`, `idx_responsavel_nome`, `idx_responsavel_cpf`
- `idx_log_erro_data`, `idx_oba_legado`

### Carga via COPY (PostgreSQL)
O schema inclui comandos \copy comentados para carga direta via awk/CSV.

---

## Gaps e Pendências

1. **FUNCIONA/PEDREIRO/PWUSUA/PWGRUPOS/PWTABELA**: Problemas de encoding impedem leitura automática completa
2. **Dados hardcoded**: Funcionários e pedreiros são fixos no script Python, não lidos dos DBFs
3. **Parquet**: Não gerado (pyarrow não instalado)
4. **Validação FK**: Script importa mas não valida integridade referencial completa no final
5. **LGPD**: Não há mascaramento/criptografia de CPF, RG, endereço, telefone na importação atual
6. **Dry-run**: Não existe modo de simulação sem persistir
7. **Tenant isolation**: Script processa ambos cemitérios sequencialmente, sem isolamento transacional por tenant
8. **Recalculação de ocupação**: Não recalcula estado físico/ocupação do jazigo após importação