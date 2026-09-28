# Guia Rápido: Importação para PostgreSQL/MySQL
=================================================

## 1. Preparar o Banco de Dados

### PostgreSQL
```bash
# Criar banco
createdb -U postgres -E UTF8 -l pt_BR.UTF-8 cemiterios_migracao

# Executar schema
psql -U postgres -d cemiterios_migracao -f postgresql_schema.sql
```

### MySQL
```bash
# Criar banco
mysql -u root -p -e "CREATE DATABASE cemiterios_migracao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Executar schema
mysql -u root -p cemiterios_migracao < mysql_schema.sql
```

## 2. Instalar Dependências Python
```bash
pip install -r requirements.txt
```

## 3. Executar Importação

### PostgreSQL
```bash
python import_csv_to_db.py \
  --db postgresql \
  --host localhost \
  --port 5432 \
  --database cemiterios_migracao \
  --user postgres \
  --password sua_senha
```

### MySQL
```bash
python import_csv_to_db.py \
  --db mysql \
  --host localhost \
  --port 3306 \
  --database cemiterios_migracao \
  --user root \
  --password sua_senha
```

## 4. Verificar Importação

### PostgreSQL
```sql
-- Contar registros por tabela
SELECT 'cemiterio' as tabela, count(*) FROM cemiterio
UNION ALL SELECT 'quadra', count(*) FROM quadra
UNION ALL SELECT 'lote', count(*) FROM lote
UNION ALL SELECT 'falecido', count(*) FROM falecido
UNION ALL SELECT 'responsavel', count(*) FROM responsavel
UNION ALL SELECT 'funcionario', count(*) FROM funcionario
UNION ALL SELECT 'pedreiro', count(*) FROM pedreiro
UNION ALL SELECT 'usuario_grupo', count(*) FROM usuario_grupo
UNION ALL SELECT 'usuario', count(*) FROM usuario
UNION ALL SELECT 'permissao', count(*) FROM permissao
UNION ALL SELECT 'log_erro', count(*) FROM log_erro
UNION ALL SELECT 'lote_oba', count(*) FROM lote_oba
UNION ALL SELECT 'lote_historico_validade', count(*) FROM lote_historico_validade
ORDER BY tabela;

-- Verificar integridade referencial
SELECT 'falecido sem lote' as problema, count(*) 
FROM falecido f LEFT JOIN lote l ON f.lote_id = l.id WHERE l.id IS NULL
UNION ALL
SELECT 'responsavel sem lote', count(*) 
FROM responsavel r LEFT JOIN lote l ON r.lote_id = l.id WHERE l.id IS NULL
UNION ALL
SELECT 'lote sem quadra', count(*) 
FROM lote l LEFT JOIN quadra q ON l.quadra_id = q.id WHERE q.id IS NULL;
```

### MySQL
```sql
-- Mesmas consultas (sintaxe compatível)
SELECT 'cemiterio' as tabela, count(*) FROM `cemiterio`
UNION ALL SELECT 'quadra', count(*) FROM `quadra`
UNION ALL SELECT 'lote', count(*) FROM `lote`
UNION ALL SELECT 'falecido', count(*) FROM `falecido`
UNION ALL SELECT 'responsavel', count(*) FROM `responsavel`
UNION ALL SELECT 'funcionario', count(*) FROM `funcionario`
UNION ALL SELECT 'pedreiro', count(*) FROM `pedreiro`
UNION ALL SELECT 'usuario_grupo', count(*) FROM `usuario_grupo`
UNION ALL SELECT 'usuario', count(*) FROM `usuario`
UNION ALL SELECT 'permissao', count(*) FROM `permissao`
UNION ALL SELECT 'log_erro', count(*) FROM `log_erro`
UNION ALL SELECT 'lote_oba', count(*) FROM `lote_oba`
UNION ALL SELECT 'lote_historico_validade', count(*) FROM `lote_historico_validade`
ORDER BY tabela;
```

## 5. Consultas Úteis Pós-Migração

### Lotes com concessão vencida
```sql
SELECT l.*, c.nome as cemiterio, q.codigo as quadra
FROM lote l
JOIN quadra q ON l.quadra_id = q.id
JOIN cemiterio c ON q.cemiterio_id = c.id
WHERE l.validade IS NOT NULL 
  AND l.validade < CURRENT_DATE
  AND l.tipo_codigo = '1'
ORDER BY l.validade;
```

### Falecidos por causa mortis (top 20)
```sql
SELECT causa_mortis, count(*) as total
FROM falecido
WHERE causa_mortis IS NOT NULL
GROUP BY causa_mortis
ORDER BY total DESC
LIMIT 20;
```

### Responsáveis sem CPF
```sql
SELECT r.*, l.codigo as lote, q.codigo as quadra, c.nome as cemiterio
FROM responsavel r
JOIN lote l ON r.lote_id = l.id
JOIN quadra q ON l.quadra_id = q.id
JOIN cemiterio c ON q.cemiterio_id = c.id
WHERE r.cpf_cnpj IS NULL OR r.cpf_cnpj = ''
ORDER BY c.id, q.codigo, l.codigo;
```

### Lotes perpétuos (tipo 3)
```sql
SELECT c.nome as cemiterio, q.codigo as quadra, l.codigo as lote, l.gavetas
FROM lote l
JOIN quadra q ON l.quadra_id = q.id
JOIN cemiterio c ON q.cemiterio_id = c.id
JOIN tipo_lote t ON l.tipo_codigo = t.codigo
WHERE t.perpetuo = TRUE
ORDER BY c.id, q.codigo, l.codigo;
```

## 6. Troubleshooting

### Erro de conexão PostgreSQL
```bash
# Verificar pg_hba.conf permite conexão local
# Verificar postgresql.conf listen_addresses = '*'
```

### Erro de conexão MySQL
```bash
# Verificar bind-address = 0.0.0.0 no my.cnf
# Verificar usuário tem permissão: GRANT ALL ON cemiterios_migracao.* TO 'user'@'%';
```

### Encoding issues
```bash
# PostgreSQL: verificar locale do banco
SELECT datname, datcollate, datctype FROM pg_database WHERE datname='cemiterios_migracao';

# MySQL: verificar charset
SHOW VARIABLES LIKE 'character_set%';
```

### Performance para bases grandes
```sql
-- Desabilitar FKs temporariamente durante carga (reabilitar depois)
-- PostgreSQL:
ALTER TABLE falecido DISABLE TRIGGER ALL;
-- ... importar ...
ALTER TABLE falecido ENABLE TRIGGER ALL;

-- MySQL:
SET FOREIGN_KEY_CHECKS = 0;
-- ... importar ...
SET FOREIGN_KEY_CHECKS = 1;
```

## 7. Arquivos Gerados

```
cemiterio/
├── postgresql_schema.sql    # DDL PostgreSQL
├── mysql_schema.sql         # DDL MySQL
├── import_csv_to_db.py      # Script de importação Python
├── requirements.txt         # Dependências Python
├── EXPORT_SUMMARY.md        # Resumo da extração
└── exported_data/
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
```

## 8. Próximos Passos Após Importação

1. **Validar dados** - Rodar queries de integridade
2. **Criar índices adicionais** - Conforme padrões de consulta da aplicação
3. **Migrar senhas** - Substituir hash SHA256 por bcrypt/argon2
4. **Implementar triggers/auditoria** - Para log de alterações
5. **Criar views** - Para relatórios comuns
6. **Testar aplicação** - Apontar novo banco para validação