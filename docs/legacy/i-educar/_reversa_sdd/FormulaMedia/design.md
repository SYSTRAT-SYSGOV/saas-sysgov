# FormulaMedia (i-Educar legado) — Design

> Estrutura de dados, contratos, fluxos, dependências e riscos do motor de fórmulas.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelo relacional (schema `modules`)

| Tabela | Chaves | Colunas | Confiança |
|---|---|---|---|
| `formula_media` | id integer (mapper declara PK composta `id`, `instituicao_id`) | `instituicao_id integer NOT NULL`, `nome varchar(50) NOT NULL`, `formula_media varchar(200) NOT NULL`, `tipo_formula smallint DEFAULT 1`, `substitui_menor_nota_rc smallint DEFAULT 0 NOT NULL` | 🟢 DDL |

- Sem colunas de auditoria (`created_at`/`updated_at`) nem tabela `*_excluidos` — exclusão física pelas telas (`_deleteOption = true`). 🟢
- Sem FK declarada no CREATE TABLE (integridade por aplicação). 🟡

### Classes

| Classe | Papel | Fonte |
|---|---|---|
| `FormulaMedia_Model_Formula` | entidade: `instituicao`, `nome`, `formulaMedia`, `tipoFormula`, `substituiMenorNotaRc`; vocabulário `_tokens` e `_tokenNumerics`; `replaceTokens`, `replaceAliasTokens`, `execFormulaMedia`, `fixedUndefinedParams`, `substituiMenorNotaPorRecuperacao` | 🟢 `Model/Formula.php` |
| `FormulaMedia_Model_FormulaDataMapper` | CRUD `modules.formula_media`; `_primaryKey` composta | 🟢 |
| `FormulaMedia_Model_TipoFormula` | enum fechado (1/2) | 🟢 |
| `FormulaMedia_Validate_Formula` | validador de sintaxe com tokens + eval de teste (`@eval` suprimindo erro) | 🟢 `Validate/Formula.php` |
| `FormulaMedia_Validate_Exception` | exceção do validador | 🟢 |
| `App\Models\LegacyAverageFormula` | ponte Eloquent (`legacy` alias map, sem timestamps) | 🟢 |

### Gramática da fórmula

```
expressão := número | token | "(" expressão ")" | e "/" e | e "*" e | e "+" e
             | e ">" e | e "<" e | e "?" e ":" e
token     := Se | Et | Rc | E1..E10 | C1..C10 | RSP1..RSP10 | RSPS1..RSPS10 | RSPM1..RSPM10
alias     := "x" → "*" ; "(" ")" normalizados com espaços
```
- Processamento: `replaceAliasTokens` → (opcional) substituição menor nota → `preg_replace` com `@token@` → `fixedUndefinedParams` (zero-fill) → `eval()`. 🟢

---

## Fluxo Principal — avaliação da média (consumo)

1. `Boletim._calculaMedia(values)`: se `values['Rc']` presente e a regra tem fórmula de recuperação → `formulaRecuperacao->execFormulaMedia`; senão `formulaMedia->execFormulaMedia`. 🟢 `Boletim.php:2554-2568`
2. `execFormulaMedia` = `replaceTokens(formulaMedia, values)` + `_exec`. 🟢
3. `replaceTokens` normaliza aliases, aplica `substituiMenorNotaRc` (se flag e `Rc` numérico), substitui tokens com valores e zero-fills faltantes. 🟢
4. Resultado numérico volta para o cálculo de situação/promoção. 🟢 (unit `Avaliacao`)

## Fluxo 2 — nota necessária no exame (consumo)

1. `notaNecessariaExameFinal`: monta `Se`, `Et`, `E[i]`, aplica recuperações específicas (`RSP*`); incrementa `Rc` de 0,1 (ou 1 quando `qtdCasasDecimais = 0`) até `notaMaximaExameFinal`.
2. Para cada `Rc`, avalia a fórmula de recuperação; primeiro valor cuja média atinge ou supera `mediaRecuperacao` é retornado. 🟢
3. Se nenhum atinge, retorna a **string** `"+{notaMax}"` (ex.: `"10+"`). 🟢 `Boletim.php:2410-2444`

## Fluxo 3 — cadastro pela tela (processo 948)

1. Lista/detalhe/edição CoreExt padrão; `EditController` carrega instituições por `App_Model_IedFinder`. 🟢
2. Submit → validadores do modelo (`getDefaultValidatorCollection`) + `FormulaMedia_Validate_Formula` (pré-execução com todos os tokens numéricos = 1; `Rc` incluído quando tipo recuperação). 🟢
3. Persistência via `FormulaDataMapper` (exclusão física autorizada). 🟢
4. `IndexController` consulta Eloquent `LegacyAverageFormula` no caminho moderno. 🟢

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Token/símbolo inválido ao salvar | exceção com lista dos inválidos | 🟢 |
| Sintaxe quebrada ao salvar | `FormulaMedia_Validate_Exception` com mensagem padrão | 🟢 |
| `Rc` em fórmula final | bloqueado pelo validador (exclusão padrão) | 🟢 |
| Token faltante no consumo | zero-fill → fórmula avalia (pode gerar média zerada silenciosamente) | 🟡 |
| Divisão por zero em runtime | não tratada no executor («PHP 8: DivisionByZeroError») | 🟡 |
| Fórmula editada direto no banco | sem validação; código PHP arbitrário pode entrar no `eval` | 🟡 |

---

## Dependências

| Dependência | Papel | Fonte |
|-------------|-------|-------|
| `RegraAvaliacao` / `EvaluationRules` | FKs `formula_media_id`/`formula_recuperacao_id` + finders por tipo | 🟢 |
| `Avaliacao` (Boletim) | consumidor com atribuição de valores a todos os tokens | 🟢 |
| `Configuracao` (`App_Model_IedFinder`) | lista de instituições para o form | 🟢 |
| `Usuario` | controle de acesso processo 948 | 🟢 (unit RegraAvaliacao/Navigation) |

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Linguagem de fórmula minúscula via token-substitution + `eval` (em vez de parser próprio) | `_exec` | 🟢 |
| Delimitadores `@…@` nas regex para evitar conflito com `/` | `Formula.php:199-203` | 🟢 |
| Zero-fill de parâmetros ausentes (robustez em vez de erro) | `fixedUndefinedParams` | 🟢 |
| PK composta no mapper (`id`, `instituicao_id`) — peculiaridade do CoreExt | `FormulaDataMapper` | 🟢 |
| Sem auditoria/soft delete (exclusão física na tela) | `EditController._deleteOption` | 🟢 |
| Seeds com fórmula de recuperação ponderada fixa (0.4/0.6) | SQL de insert | 🟢 |

## Estado interno

- Nenhum cache; fórmula recarregada por consumo via regra da matrícula. 🟡

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| `eval()` legado | executa string do banco; no alvo substituída por parser seguro — o próprio inventor declara esse objetivo (ExpressionLanguage) | `_exec` × modules.json | 🟡 |
| Sem subtração | vocabulário sem `-`; subtração possível só via literal negativo ou ternário | `_tokens` | 🟢 |
| `x` global alias | substitui `x` em qualquer posição da string | `replaceAliasTokens` | 🟡 |
| Inventário divergente | modules.json fala em varchar(255) para nome/fórmula; DDL 50/200 | inventor × DDL | 🟡 |
| Return string `"10+"` | contrato misto numérico/string nas respostas ("nota necessária") | `Boletim` | 🟢 |
| Seeds limitados | 2 fórmulas; instituições criam variantes próprias — decide-se no alvo como tratar fórmulas fora do vocabulário documentado | SQL de insert | 🔴 |
