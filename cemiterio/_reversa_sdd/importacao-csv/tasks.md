# Importação CSV, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24.

## Pré-requisitos
- [ ] Schema alvo aplicado (ver unit `schema-destino`)
- [ ] CSVs extraídos disponíveis em `exported_data/` (ver unit `extracao-dbf`)
- [ ] Driver de banco instalado (`psycopg2-binary` ou `pymysql`)

## Tarefas

- [ ] T-01, Implementar `DatabaseConnection` (wrapper dual Postgres/MySQL)
  - Origem no legado: `import_csv_to_db.py`, classe `DatabaseConnection`
  - Critério de pronto: mesma interface funciona nos dois bancos
  - Confiança: 🟢

- [ ] T-02, Implementar importação de tabelas de referência com upsert idempotente
  - Origem no legado: `import_cemiterios`...`import_permissoes`
  - Critério de pronto: reexecução não duplica linhas de referência
  - Confiança: 🟢

- [ ] T-03, Implementar `import_quadras`/`import_lotes` com batch real (corrigir o padrão O(n²) de `_refresh_lote_cache`)
  - Origem no legado: achado em `code-analysis.md`, módulo `importacao-csv`
  - Critério de pronto: tempo de importação não degrada quadraticamente com o volume de lotes
  - Confiança: 🟡 — correção proposta sobre comportamento confirmado

- [ ] T-04, Implementar `import_falecidos` com filtro `FLAG_EXCL` e resolução de FK
  - Origem no legado: RN001, RN005, RN006, RN009 em `domain.md`
  - Confiança: 🟢

- [ ] T-05, Implementar `import_responsaveis` com `ON CONFLICT`/`ON DUPLICATE KEY` (depende de `schema-destino` T-06, `UNIQUE(lote_id, item_ordem)`)
  - Origem no legado: achado em `code-analysis.md`, módulo `importacao-csv`
  - Critério de pronto: reexecução não duplica responsáveis
  - Confiança: 🟡

- [ ] T-06, Implementar `import_oba`/`import_historico` (só Independência)
  - Confiança: 🟢

- [ ] T-07, Substituir `SHA256(senha)` sem salt por bcrypt/argon2
  - Origem no legado: ADR 0002, SEC-002 em `permissions.md`
  - Critério de pronto: novo hash de senha resistente a rainbow tables; considerar forçar reset de senha no primeiro login (senha original de 6 caracteres é fraca por natureza)
  - Confiança: 🔴 — correção de segurança necessária antes de produção

- [ ] T-08, Substituir a lista hardcoded de coveiros/pedreiros por leitura real do CSV corrigido (depende de `extracao-dbf` T-07/TM-01)
  - Origem no legado: RN012 em `domain.md`
  - Critério de pronto: `falecido.coveiro_id`/`pedreiro_id` apontam para a pessoa certa nas duas unidades
  - Confiança: 🔴 CRÍTICO — bloqueado até a decisão de isolamento por cemitério (T-09) estar resolvida

- [ ] T-09, Decidir e implementar isolamento por cemitério em `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` (ver ADR 0004)
  - Critério de pronto: colisão de código entre cemitérios não sobrescreve/mistura identidades
  - Confiança: 🔴 — depende de decisão do usuário, ver `questions.md`

## Tarefas de Teste

- [ ] TT-01, Teste do happy path completo (referência + 2 cemitérios + Independência-only), banco final íntegro
- [ ] TT-02, Teste de rollback: forçar exceção no meio da Fase 2, confirmar que nada foi persistido
- [ ] TT-03, Teste de reexecução: confirmar que `import_responsaveis` não duplica após T-05
- [ ] TT-04, Teste de `get_csv_field`/`parse_int` com valores fora do padrão esperado — hoje deve reproduzir perda silenciosa; considerar logar ao invés de descartar

## Tarefas de Migração de Dados

- [ ] TM-01, Após T-08, reimportar `falecido`/`funcionario`/`pedreiro` e validar `coveiro_id`/`pedreiro_id` contra os dados reais recuperados na extração

## Ordem Sugerida
1. T-01 → T-02 (base de conexão e referência)
2. T-03 → T-04 → T-05 → T-06 (dados por cemitério, em paralelo entre si após T-02)
3. T-09 (decisão) **antes de** T-08 (implementação) — a decisão muda o desenho de T-08
4. T-07 (segurança) pode rodar em paralelo a qualquer momento, é independente das demais

## Lacunas Pendentes (🔴)
Ver `questions.md` para as decisões que bloqueiam T-08/T-09/T-07.
