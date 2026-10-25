# EvaluationRules (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir o domínio no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Confirmar se `RegraRecuperacaoMes` existiu em alguma versão (history do git/legado anterior) — o inventário o cita e o snapshot não o tem. 🔴
- [ ] Inventariar regras por instituição/tenant (quantidade, variações, uso de regra inclusiva). 🔴
- [ ] Mapear uso real de `pontos` (multiplicadores) e `disciplinasAglutinadas` nas regras vigentes. 🟡

## Fase 1 — Modelo de dados

- [ ] Entidade `EvaluationRule` com atributos tipados (enums para tipo_nota/progressão/parecer/presença/recuperação paralela/cálculo). 🟢
- [ ] Tabelas filhas: `RuleRecovery` (etapas ";" → array no alvo, sem vírgula textual), `RuleGradeYear` (série+ano→regra) — no alvo exigir PK e unique(serie, ano). 🟢 🟡
- [ ] Regra inclusiva como FK autorreferida opcional com validação de ciclo. 🟢
- [ ] Corrigir domínios do legado: `mediaRecuperacao` com teto coerente (DDL 9,999 vs validação 14); `mediaRecuperacaoParalela` como numeric; limites de nota/faltas (min/max 2021). 🟡
- [ ] `pontos`: migrar para tabela filha ou array JSON validado. 🟡

## Fase 2 — Regras

- [ ] Implementar validações: nome 5..50; fórmula obrigatória exceto nota NENHUMA; média coerente com progressão (contínua exige >= 1); tabelas de arredondamento compatíveis com o sistema de nota e mesma instituição. 🟢
- [ ] Validar `notaMaximaGeral > notaMinimaGeral` e `faltaMaximaGeral > faltaMinimaGeral` (usar o validador solto do legado como base). 🟡
- [ ] Limites de dependência (disciplinas e matrículas) e reprovação automática por contagem de "em exame". 🟢
- [ ] Regra de aprovação pela frequência após exame e `desconsiderarLancamentoFrequencia`. 🟢

## Fase 3 — Consumo

- [ ] Exceções tipadas no alvo: regra não definida na série/ano; falta geral não permitida (com school_class_id). 🟢
- [ ] Responder HTTP 422 no diário com código de erro do enum `Error` (paridade do legado). 🟢
- [ ] Resolução por matrícula: regra da série+ano; fallback regra diferenciada quando aluno com deficiência. 🟡
- [ ] Prever fallback moderno (cache da regra por matrícula) — legado não tem, avaliar. 🔴

## Fase 4 — Migração de dados

- [ ] Migrar `regra_avaliacao`, `regra_avaliacao_recuperacao`, `regra_avaliacao_serie_ano` por tenant. 🟢
- [ ] Preservar 2 regras default (quantitativa/qualitativa) como seed. 🟢
- [ ] Reconciliar tabelas `*_excluidos` (auditoria histórica) com política do alvo (soft delete nativo?). 🟡
- [ ] Verificar FKs órfãs (formula/tabela ids quebrados). 🔴

## Fase 5 — Verificação

- [ ] Testes: validações de coerência, resolução por série/ano, exceções 422, regra inclusiva. 🟢
- [ ] Teste de paridade dos limites (nota máx exame, qtd casas decimais) vs unidade `FormulaMedia`/`TabelaArredondamento`. 🟡
- [ ] Teste de migração: contagem de regras por instituição igual legado. 🟡
