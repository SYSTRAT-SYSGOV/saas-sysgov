# ADR-009: Numeração de processos por tabela de sequência com lock pessimista

- **Status**: Proposta
- **Data**: 2026-10-13
- **Mudança relacionada**: `openspec/changes/criar-modulo-protocolo`

## Contexto

O número oficial `NNNN/AAAA` deve ser sequencial por tenant e ano, sem duplicidade sob concorrência e, de
preferência, sem lacunas quando a criação falha (a cascata de criação é atômica).

## Decisão

Tabela `protocolo_sequencias (tenant_id, ano, ultimo_numero)` com UNIQUE `(tenant_id, ano)`. Dentro da mesma
`DB::transaction` que cria o processo: garantir a linha do ano (`insertOrIgnore`), bloqueá-la com
`SELECT ... FOR UPDATE`, incrementar e gravar. UNIQUE `(tenant_id, ano, numero)` em `protocolo_processos` como
rede de segurança. O número é inteiro; a máscara é aplicada na apresentação. Mesmo padrão já usado em
`requerimentos_contadores`.

## Alternativas consideradas

- **`MAX(numero) + 1`**: condição de corrida sob concorrência.
- **AUTO_INCREMENT**: não reinicia por ano nem isola por tenant.
- **Redis `INCR`**: fora da transação do banco; rollback gera lacunas e exige reconciliação.

## Consequências

- (+) Sem duplicidade e sem lacunas em caso de rollback.
- (+) Isolamento natural por tenant e ano.
- (−) Aberturas simultâneas do mesmo tenant/ano são serializadas; aceitável para o volume municipal.
