# cemiterio/migracao-legado Specification

## Purpose
Provê mecanismo de migração e carga de dados (ETL) robusto, idempotente e transacional para importar acervos históricos legados em formato DBF/CSV para o modelo relacional multi-tenant do SYSGOV.

## Requirements

### Requirement: Comando CLI de Migração Idempotente de Necrópoles
O sistema SHALL disponibilizar um comando de linha de comando Artisan `cemiterios:migrar-clipper` capaz de ler os arquivos de dados exportados do sistema legado (`exported_data`) dos cemitérios Central e Independência, processando sequencialmente setores, quadras, jazigos, concessionários, concessões, falecidos e sepultamentos históricos com garantia de idempotência e isolamento por tenant.

#### Scenario: Execução em modo de simulação (dry-run)
- **WHEN** o administrador executa o comando de migração com a opção `--dry-run`
- **THEN** o sistema analisa a integridade dos dados, contabiliza os registros por entidade, valida as chaves estrangeiras e emite o relatório sem gravar nenhuma alteração no banco de dados

#### Scenario: Execução definitiva com persistência em lotes
- **WHEN** o administrador executa a migração indicando o tenant de destino e a necrópole desejada
- **THEN** o sistema processa os registros em transações por lote, normalizando nomes, mascarando/criptografando dados sensíveis conforme LGPD e recalculando a ocupação e o estado físico final de cada jazigo

### Requirement: Mapeamento de Ocupações Históricas e Equipe Operacional
O processo de migração SHALL mapear cada registro de óbito e ocupação dos arquivos legados (`DADOS.csv`, `FALECIDO.csv`) para as tabelas de falecidos (`deceased_records`) e inumações (`cemetery_burials`), preservando a gaveta ocupada, data de sepultamento, número de certidão, médico, cartório, coveiro e pedreiro.

#### Scenario: Importação de sepultamento histórico com coveiro e pedreiro
- **WHEN** um registro de falecido do arquivo legado possui código de funcionário coveiro e código de pedreiro preenchidos
- **THEN** o sistema vincula o nome correspondente do coveiro e do pedreiro na inumação histórica sem gerar erros de violação de chave
