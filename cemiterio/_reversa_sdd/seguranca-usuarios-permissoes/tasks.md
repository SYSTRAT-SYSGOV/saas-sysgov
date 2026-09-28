# Segurança — Usuários e Permissões, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24.

## Pré-requisitos
- [ ] Decisão sobre isolamento por cemitério (ver `questions.md`) tomada **antes** de codar T-02/T-03
- [ ] Biblioteca de hash de senha adequada disponível (`bcrypt`/`argon2`)

## Tarefas

- [ ] T-01, Migrar `PWGRUPOS`/`PWUSUA`/`PWTABELA` de ambos os cemitérios para `usuario_grupo`/`usuario`/`permissao`
  - Origem no legado: `import_grupos_usuarios`, `import_usuarios`, `import_permissoes`
  - Confiança: 🟢

- [ ] T-02, Implementar isolamento por cemitério (adicionar `cemiterio_id`) OU confirmar unificação intencional
  - Origem no legado: ADR 0004
  - Critério de pronto: decisão registrada e schema ajustado conforme
  - Confiança: 🔴 — bloqueado por decisão de negócio (ver `questions.md`)

- [ ] T-03, Substituir `SHA256(senha)` sem salt por hash adequado (bcrypt/argon2)
  - Origem no legado: ADR 0002
  - Critério de pronto: nenhuma senha em texto puro ou hash fraco persiste no banco alvo
  - Confiança: 🔴 — correção de segurança necessária antes de produção

- [ ] T-04, Confirmar o mapeamento de posições de `PW_PERMIS` com um operador do legado
  - Confiança: 🟡 — ver `questions.md`

## Tarefas de Teste
- [ ] TT-01, Teste de colisão: dois usuários com mesmo `PW_CODIGO` em cemitérios diferentes — validar comportamento após T-02
- [ ] TT-02, Teste de hash de senha — confirmar que o hash resultante não é reversível por rainbow table simples

## Tarefas de Migração de Dados
- [ ] TM-01, Após T-02/T-03, reprocessar `usuario`/`usuario_grupo`/`permissao` com o schema/hash corrigidos

## Ordem Sugerida
1. T-04 (esclarecer mapeamento) pode rodar a qualquer momento, não bloqueia
2. T-02 (decisão) **antes de** T-01 ser considerado "definitivo" — T-01 pode rodar com o schema atual, mas será refeito se T-02 mudar a estrutura
3. T-03 é independente, pode rodar em paralelo

## Lacunas Pendentes (🔴)
Ver `questions.md`.
