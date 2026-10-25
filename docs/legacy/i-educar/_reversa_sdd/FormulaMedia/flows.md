# FormulaMedia (i-Educar legado) — Fluxos

> Fluxos observados no código. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Cadastro/validação de fórmula

1. Tela de fórmulas (processo 948, institucional): lista com Eloquent (`LegacyAverageFormula`) e CRUD CoreExt via mapper. 🟢
2. Submit: `nome` 5..50, `instituicao` e `tipoFormula` escolhas fechadas; `formulaMedia` validada por `FormulaMedia_Validate_Formula`. 🟢
3. Validador: normaliza aliases → separa tokens → rejeita tokens fora do vocabulário (exceto números), então substitui tokens por `1` e **pré-executa com eval** (erros suprimidos) para validar sintaxe. 🟢
4. Se `tipoFormula = MEDIA_RECUPERACAO`, token `Rc` é incluído nas variações permitidas; caso contrário `Rc` é excluído. 🟢
5. Persistência: `FormulaMedia_Model_FormulaDataMapper` em `modules.formula_media`. Exclusão física autorizada. 🟢

## Fluxo 2 — Avaliação da média final (consumo)

1. O `Boletim` (unit `Avaliacao`) monta `values`: `Se` (soma das notas), `Et`, `E1..En` (notas), `C1..Cn` (etapas consideradas) e `RSP*` (recuperações específicas). 🟢
2. `_calculaMedia`: sem `Rc` nos valores → usa a fórmula `MEDIA_FINAL` da regra. 🟢
3. `execFormulaMedia`: alias `x` → `*`; substituição com padrões `@token@`; zero-fill de faltantes; `eval` devolve o número. 🟢
4. Resultado alimenta situação/promoção. 🟢

## Fluxo 3 — Avaliação da recuperação (etapa `Rc`)

1. Lançamento na etapa `Rc` exige fórmula de recuperação do tipo correto (mensagens do `DiarioApiController`). 🟢
2. `_calculaMedia`: com `Rc` presente e fórmula de recuperação definida → usa `formulaRecuperacao`. 🟢
3. Com `substituiMenorNotaRc` ativo: a menor nota entre `E1..E10` é trocada por `Rc` (só se `Rc` maior) **antes** da substituição de tokens. 🟢
4. "Nota necessária" no exame: incrementa `Rc` (passo 0,1, ou 1 com 0 casas decimais) até `notaMaximaExameFinal`, avaliando a fórmula a cada incremento; primeiro valor com média igual ou acima de `mediaRecuperacao` vence, senão retorna `"+{notaMax}"` (string). 🟢

## Fluxo 4 — Recuperações específicas (RSP)

1. Para cada regra de recuperação específica da regra de avaliação, o Boletim calcula: nota de recuperação da etapa final (`RSPn`), soma/média das etapas cobertas (`RSPSn`/`RSPMn`), com critério de "pega maior" conforme `substituiMenorNota` da regra de recuperação. 🟢 `Boletim.php:2448-2520`
2. Quando não há nota de recuperação lançada para a regra, só soma/média das etapas são fornecidas. 🟢
3. `Se` é redefinido como 0 e acumulado apenas pelas etapas cobertas pelas regras de recuperação. 🟡 (semântica derivada)

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Token inválido no cadastro | exceção com lista dos tokens | 🟢 |
| Fórmula sintaticamente quebrada | exceção do validador (mensagem padrão) | 🟢 |
| `Rc` em fórmula final | bloqueado no validador | 🟢 |
| Token faltante na execução | zero-fill (→ 0), média avaliada silenciosamente | 🟢 (zero-fill) 🟡 (impacto) |
| Divisão por zero ("Se / Et" com Et=0) | sem tratamento no executor | 🟡 |
| Nenhuma nota de recuperação atinge a média | resposta `"+{notaMax}"` como string | 🟢 |
| Fórmula editada direto no banco | injetada no eval sem validação | 🟡 |

## Pontos de Fail-silente (coleta para o Revisor)

- Zero-fill mascara dados ausentes: etapa não lançada vira 0 e a média é calculada mesmo assim. 🟡
- `preg_replace` com padrões `@token@` preenchidos a partir de valores do banco: se o valor contiver `@`, a substituição pode se comportar de forma inesperada. 🟡
- Sem registro de auditoria para exclusões de fórmula (exclusão física pela tela). 🟢
