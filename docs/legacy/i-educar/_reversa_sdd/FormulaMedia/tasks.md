# FormulaMedia (i-Educar legado) — Tarefas de Migração

> Sequência para reconstruir o motor de fórmulas no alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Inventariar fórmulas por tenant (quantidade, sintaxes usadas em produção, uso de ternário/comparações, uso de Cn e RSP*). 🔴
- [ ] Verificar se existe fórmula em produção com `substitui_menor_nota_rc = 1`. 🔴
- [ ] Confirmar se alguma instalação tem fórmulas com texto fora do vocabulário (sintaxe congelada ou gravada sem validação). 🔴

## Fase 1 — Modelo de dados

- [ ] Entidade `AverageFormula` com `type` (enum média final/recuperação), `formula` string, `replace_lowest_stage_with_recovery` boolean. 🟢
- [ ] Ajustar domínios do legado: `nome` 50 e `formula` 200 (não 255); FK para instituição. 🟡
- [ ] Decidir política de auditoria: legado não tem; alvo deve auditar? 🟡
- [ ] PK: resolver a composição id+instituicao do mapper (no alvo, id PK + escopo por tenant). 🟡

## Fase 2 — Motor de avaliação (seguro)

- [ ] Implementar parser/avaliador sem `eval()` (expression language com aritmética, parênteses, ternário e comparações), paridade com a gramática do legado. 🟢 🟡
- [ ] Vocabulário de tokens congelado: Se, Et, Rc, E1..E10, C1..C10, RSP1..10, RSPS1..10, RSPM1..10; decidir se mantém alias `x`. 🟢
- [ ] Zero-fill de tokens faltantes (paridade) vs falha explícita no alvo — decidir e documentar. 🟡
- [ ] Tratar divisão por zero explicitamente (erro de fórmula, não crash). 🟡
- [ ] Substituição da menor nota por `Rc` quando flag ativa (paridade do algoritmo: menor E-token substituído apenas se Rc maior). 🟢

## Fase 3 — Validações

- [ ] Validador de sintaxe no cadastro (sem pré-execução eval; parser nega tokens fora do vocabulário). 🟡
- [ ] `Rc` só em fórmulas do tipo recuperação. 🟢
- [ ] Variáveis fornecidas devem ser numéricas (definir contrato de tipo do resultado — evitar retorno string "10+" ; manter convenção na camada de consumo se necessário). 🟡

## Fase 4 — Consumo e integração

- [ ] Consumo pelo serviço de avaliação (unit `Avaliacao`): composição de valores por etapa, recuperações específicas (RSP*), brute force da nota necessária. 🟡
- [ ] Manter seeds das 2 fórmulas default ("Média aritmética", "Média recuperação ponderada"). 🟢
- [ ] CRUD por instituição (processo 948) com exclusão física — ou reavaliar exclusão (fórmula em uso não deve ser apagada: verificar FKs/uso). 🟡

## Fase 5 — Verificação

- [ ] Testes de paridade: avaliar o conjunto seed nos dois motores (legado vs alvo) com os mesmos valores. 🟡
- [ ] Testes de validação (tokens inválidos, parêntese faltante, Rc em fórmula final). 🟢
- [ ] Teste de segurança: tentar injetar código PHP via fórmula — deve falhar no alvo. 🟡
- [ ] Teste de migração: contagem e hash das fórmulas por instituição igual ao legado. 🟡
