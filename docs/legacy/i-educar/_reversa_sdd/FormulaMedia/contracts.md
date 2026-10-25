# FormulaMedia (i-Educar legado) — Contratos

> Superfícies observáveis do motor de fórmulas. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tabela `modules.formula_media` (contrato fonte)

| Coluna | Tipo | Default | Campo do modelo |
|---|---|---|---|
| `id` | integer | — | id |
| `instituicao_id` | integer NOT NULL | — | instituicao |
| `nome` | varchar(50) NOT NULL | — | nome |
| `formula_media` | varchar(200) NOT NULL | — | formulaMedia |
| `tipo_formula` | smallint | 1 | tipoFormula (1=MEDIA_FINAL, 2=MEDIA_RECUPERACAO) |
| `substitui_menor_nota_rc` | smallint | 0 | substituiMenorNotaRc (boolean) |

🟢 DDL + `FormulaDataMapper::$attributeMap`; mapper declara `_primaryKey` = (`id`, `instituicao_id`). Sem colunas de auditoria.

## Gramática e tokens (contrato da string)

```text
Tokens numéricos: Se, Et, Rc, E1..E10, C1..C10,
                  RSP1..RSP10, RSPS1..RSPS10, RSPM1..RSPM10
Operadores:       +  /  *  x (= *)  ( )  ? :  >  <
Regra:            "Rc" permitido apenas com tipo_formula = 2
```
🟢 `Formula::$_tokens`, help da tela de edição

Significado das variáveis de recuperação específica (atribuídas pelo Boletim): 🟢 `Boletim.php:2448-2520`
- `RSPn` = nota da recuperação específica da regra n.
- `RSPSn` = soma das etapas da regra n (ou a nota da recuperação, a maior).
- `RSPMn` = média das etapas da regra n (ou média com recuperação, a maior).

## API da entidade (contrato interno)

```php
// FormulaMedia_Model_Formula
public replaceTokens(string $formula, array $values): ?string   // alias + substituição + zero-fill
public replaceAliasTokens(string $formula): string              // "x"→"()", "*"
public execFormulaMedia(array $values): float|null              // replaceTokens + eval
public getTokens(): array
public isNumericToken(string $token): bool
private substituiMenorNotaPorRecuperacao(array $values): array  // menor E substituído por Rc se Rc maior
private _exec(string $code): float|null                          // eval('?><?php $result = …; ?>')
```
🟢

## Validador (cadastro)

- Tokens fora do vocabulário → exceção "As variáveis ou símbolos não são permitidos: {lista}". 🟢
- Sintaxe quebrada → "A fórmula apresenta erros. Verifique algum parêntese faltante ou um sinal de operação matemática sem um operando." 🟢
- Opção `excludeToken` default `['Rc']`; nula quando `tipoFormula = MEDIA_RECUPERACAO`. 🟢

## Dados default (seeds)

```sql
INSERT INTO modules.formula_media VALUES (1, 1, 'Média aritmética', 'Se / Et', 1, 0);
INSERT INTO modules.formula_media VALUES (2, 1, 'Média recuperação ponderada', '(Rc * 0.4) + (Se / Et * 0.6)', 2, 0);
```
🟢 `database/sqls/inserts/modules.formula_media.sql`

## Integrações

| Integração | Uso | Confiança |
|---|---|---|
| `FormulaMedia_Model_FormulaDataMapper` por `RegraDataMapper` | finders `findFormulaMediaFinal` / `findFormulaMediaRecuperacao` (por `tipo_formula`) | 🟢 |
| `Avaliacao_Service_Boletim` | `_calculaMedia` e "nota necessária": fornece Se/Et/Rc/E[i]/C[i]/RSP* e avalia | 🟢 |
| `DiarioApiController` | valida tipo da fórmula de recuperação para etapa `Rc` | 🟢 |
| `RegraAvaliacao_Views_EditController` | escolha de fórmulas na regra (listadas por tipo) | 🟢 |
| `App\Models\LegacyAverageFormula` (Eloquent) | caminho moderno da listagem | 🟢 |

## Contratos de tela

- Processo **948**, nível **institucional**; `_saveOption = true`, `_deleteOption = true` (exclusão física). 🟢
- Help do campo fórmula documentado na tela (En, Cn, Et, Se, Rc, RSPn, RSPSn, RSPMn e símbolos). 🟢
