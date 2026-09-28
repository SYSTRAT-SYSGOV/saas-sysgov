# Schema Destino, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24.

## Pré-requisitos
- [ ] PostgreSQL 12+ ou MySQL 8.0+ disponível
- [ ] Usuário de banco com permissão de `CREATE TABLE`/`CREATE EXTENSION` (Postgres)

## Tarefas

- [ ] T-01, Criar tabelas raiz `cemiterio` e `tipo_lote`
  - Origem no legado: `postgresql_schema.sql`/`mysql_schema.sql`
  - Critério de pronto: 2 registros fixos em `cemiterio` (01/Central, 02/Independência), 2 em `tipo_lote`
  - Confiança: 🟢

- [ ] T-02, Criar `quadra` com FK para `cemiterio`
  - Origem no legado: `postgresql_schema.sql`/`mysql_schema.sql`
  - Critério de pronto: FK aplicada, `UNIQUE(cemiterio_id, codigo)` se existir na spec original
  - Confiança: 🟢

- [ ] T-03, Criar `lote` com FK para `quadra`/`tipo_lote` e `UNIQUE(quadra_id, codigo)`
  - Origem no legado: `postgresql_schema.sql`/`mysql_schema.sql`
  - Critério de pronto: reimportação de lotes não duplica
  - Confiança: 🟢

- [ ] T-04, Criar `funcionario`, `pedreiro`, `usuario_grupo`, `usuario`, `permissao`
  - Origem no legado: `postgresql_schema.sql`/`mysql_schema.sql`
  - Critério de pronto: FKs de `usuario`→`usuario_grupo` e `permissao`→`usuario_grupo` aplicadas
  - Confiança: 🟢
  - ⚠️ Decisão pendente antes de implementar: avaliar se `cemiterio_id` deve ser adicionado aqui (ver ADR 0004) — impacta o desenho desta tarefa

- [ ] T-05, Criar `falecido` com FK para `lote`/`funcionario`/`pedreiro` e `UNIQUE(lote_id, item_ordem)`
  - Origem no legado: RN001 em `domain.md`
  - Critério de pronto: dois falecidos não podem ocupar o mesmo item_ordem do mesmo lote
  - Confiança: 🟢

- [ ] T-06, Criar `responsavel` com FK para `lote` **e adicionar `UNIQUE(lote_id, item_ordem)`** (gap identificado, ausente no schema atual)
  - Origem no legado: achado em `code-analysis.md`, módulo `schema-destino`
  - Critério de pronto: reimportação de responsáveis não duplica
  - Confiança: 🟡 — comportamento atual não tem essa constraint; adicioná-la é uma correção proposta

- [ ] T-07, Criar `lote_oba`/`lote_historico_validade` (só populadas para Independência)
  - Origem no legado: RN010 em `domain.md`
  - Confiança: 🟢

- [ ] T-08, Criar `log_erro`
  - Confiança: 🟢

- [ ] T-09, Adicionar trigger de auto-atualização de `updated_at` no PostgreSQL (paridade com o comportamento nativo do MySQL)
  - Origem no legado: achado em `code-analysis.md`, módulo `schema-destino`
  - Critério de pronto: `UPDATE` em qualquer linha atualiza `updated_at` automaticamente em ambos os bancos
  - Confiança: 🟡 — correção proposta, não comportamento atual

## Tarefas de Teste

- [ ] TT-01, Teste de criação completa do schema em ordem de FK, sem erro
- [ ] TT-02, Teste de violação de `UNIQUE` em `lote`/`falecido` (deve rejeitar duplicata)
- [ ] TT-03, Teste de violação de `UNIQUE` em `responsavel` após T-06 (hoje: deve reproduzir a duplicação atual; depois de T-06: deve rejeitar)

## Ordem Sugerida
1. T-01 → T-02 → T-03 (cadeia principal de FK)
2. T-04 (tabelas de referência/segurança) — decidir a questão de `cemiterio_id` **antes** de codar
3. T-05 → T-06 → T-07 → T-08 (dependem de T-01–T-04)
4. T-09 (cosmético/auditoria, pode ser feito a qualquer momento após o schema base existir)

## Lacunas Pendentes (🔴)
- Decisão sobre isolamento por cemitério em `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` — ver ADR 0004 e `seguranca-usuarios-permissoes/questions.md`. Bloqueia o desenho final de T-04.
