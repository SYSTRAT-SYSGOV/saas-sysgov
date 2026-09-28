# Spec Delta: cemiterio/migracao-legado

## MODIFIED Requirements

### Requirement: Comando CLI de Migração Idempotente de Necrópoles
O sistema SHALL disponibilizar um comando de linha de comando Artisan `cemiterios:migrar-clipper` e rotinas de saneamento de acervo capazes de ler os arquivos de dados exportados do sistema legado (`exported_data`) dos cemitérios Central e Independência, processando sequencialmente setores, quadras, jazigos, concessionários, concessões, falecidos e sepultamentos históricos com garantia de idempotência, isolamento por tenant, higienização de registros sentinelas e recálculo determinístico da ocupação e estado operacional dos jazigos.

#### Scenario: Execução em modo de simulação (dry-run)
- **WHEN** o administrador executa o comando de migração com a opção `--dry-run`
- **THEN** o sistema analisa a integridade dos dados, contabiliza os registros por entidade, valida as chaves estrangeiras e emite o relatório sem gravar nenhuma alteração no banco de dados

#### Scenario: Execução definitiva com persistência em lotes
- **WHEN** o administrador executa a migração indicando o tenant de destino e a necrópole desejada
- **THEN** o sistema processa os registros em transações por lote, normalizando nomes, mascarando/criptografando dados sensíveis conforme LGPD e recalculando a ocupação e o estado físico final de cada jazigo

#### Scenario: Descarte de registros sentinelas inválidos
- **WHEN** os arquivos de entrada contêm quadras ou lotes preenchidos exclusivamente com zeros (`0000`, `0`, vazio) sem dados reais vinculados
- **THEN** o sistema ignora a criação de jazigos fantasmas (como `Q0000-L0000`) e registra a ocorrência no log de auditoria da migração

## ADDED Requirements

### Requirement: Higienização de Registros Sentinelas e Reconciliação Cadastral
O sistema SHALL fornecer um comando de reconciliação e saneamento cadastral `cemiterios:reconciliar-inventario` capaz de auditar e reparar o acervo existente:
1. **Identificação e Tratamento de Sentinelas**: Detectar jazigos e setores artificiais criados por ruído de exportação (ex.: quadras/lotes `0000`) e permitir sua remoção ou desativação lógica segura.
2. **Reconciliação de Ocupação e Estados**: Recalcular a coluna `ocupacao` e a coluna `estado` de cada unidade em `plot_inventory` a partir da contagem de inumações reais com situação `confirmada`, aplicando a regra canônica de estados (`Capacidade Máxima`, `Ocupado`, `Concedido`, `Disponível` e preservando `Em Ruína/Manutenção`).
3. **Deduplicação de Concessões e Titulares**: Identificar termos de concessão duplicados para a mesma unidade física e titular, consolidando o vínculo histórico e marcando termos redundantes como inativos para eliminar contadores inflados como `(+2)` ou `(+1)`.
4. **Padronização de Datas e Registros Nominais**: Identificar inumações históricas com datas artificiais (`31/12/2012`, `1995-01-01`, etc.) e sinalizar o campo `revisao_pendente = true` para conferência do cartório cemiterial, preservando o valor original no livro de referência.

#### Scenario: Execução da reconciliação de ocupação e estado
- **WHEN** o administrador executa `php artisan cemiterios:reconciliar-inventario --tenant={slug}`
- **THEN** o comando inspeciona todos os jazigos do tenant, atualiza a contagem precisa de ocupação, ajusta o estado operacional correspondente e emite um resumo comparativo das correções efetuadas

#### Scenario: Deduplicação de concessões ativas
- **WHEN** um mesmo jazigo possui múltiplos registros de concessão para o mesmo titular gerados por inconsistência na migração
- **THEN** o comando preserva o termo principal com dados mais completos e desativa termos clonados, corrigindo a contagem de titulares vinculados
