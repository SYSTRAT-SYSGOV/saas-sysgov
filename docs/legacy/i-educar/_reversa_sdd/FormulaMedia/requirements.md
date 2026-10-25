# FormulaMedia (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Módulo `ieducar/modules/FormulaMedia`: fórmulas de cálculo de média final e de recuperação — lista de tokens, substituição de variáveis, executor (`eval`) e validador. Módulo Laravel de ponte: `App\Models\LegacyAverageFormula`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Recorte (evitar duplicação)

- A **unit `Avaliacao`** (já escrita) cobre o consumo: `Boletim._calculaMedia`, `notaNecessariaExameFinal` e a atribuição dos tokens (E1..E10, Cn, RSPn/RSPSn/RSPMn).
- A **unit `RegraAvaliacao`** cobre a escolha da fórmula na regra (FKs `formula_media_id`, finders por tipo).
- As **telas** do módulo (`Views/IndexController`, `EditController`, `ViewController`) são parte desta unit, mas como CRUD legado padrão (resumo aqui, detalhe de navegação na unit `Navigation`).
- Esta unit documenta o **motor de fórmulas**: tokens, sintaxe, validação, execução, DDL, seeds e integrações. 🟢 `ieducar/modules/FormulaMedia/*`

---

## Visão Geral

Uma fórmula é uma string armazenada em `modules.formula_media.formula_media` (varchar(200)) com tokens de variáveis e operadores, avaliada em runtime substituindo os tokens por números e executando o resultado via `eval()` do PHP. 🟢 `Formula.php:112-134`

> ⚠️ O inventário (modules.json) descreve a avaliação como "ExpressionLanguage seguro no SYSGOV (eliminando eval() do legado)" — é um **objetivo do alvo**, não uma característica do legado, que usa `eval()`. 🟡
> ⚠️ O inventor também declara `nome varchar(255)` e `formula_media varchar(255)`; o DDL real tem `varchar(50)` e `varchar(200)`. 🟡 inventário × DDL

---

## Responsabilidades

- Armazenar fórmulas por instituição, com tipo (`MEDIA_FINAL` = 1, `MEDIA_RECUPERACAO` = 2) e flag `substituiMenorNotaRc`. 🟢 `TipoFormula.php`, `FormulaDataMapper.php`
- Fornecer o vocabulário de tokens: `Se` (soma das notas das etapas), `Et` (total de etapas), `Rc` (nota da recuperação), `E1..E10` (nota na etapa En), `C1..C10` (etapa considerada: 1 sim/0 não), `RSP1..RSP10` (recuperação específica), `RSPS1..RSPS10` (soma das etapas ou recuperação específica, pega maior), `RSPM1..RSPM10` (média das etapas ou média com recuperação, pega maior). 🟢 `Formula.php:12-27`, help da tela
- Operadores: `+`, `/`, `*`, `x` (alias de `*`), parênteses, ternário `? :` e comparações `>` `<`. **Não existe operador de subtração `-`** no vocabulário (só na forma de literal numérico negativo). 🟢 `Formula.php:28-34`
- Substituir tokens por valores numéricos (`replaceTokens`) com delimitadores `@token@` para evitar conflito com `/`; zerar tokens não informados (`fixedUndefinedParams`) para não quebrar a fórmula. 🟢 `Formula.php:186-208, 274-286`
- Aplicar `substituiMenorNotaRc`: se ativo e `Rc` numérico, substituir a **menor nota de etapa** (E1..E10) por `Rc` quando `Rc` maior, antes da substituição. 🟢 `Formula.php:95-116`
- Validar a fórmula no cadastro (`FormulaMedia_Validate_Formula`): tokens permitidos + **pré-execução com eval** (tokens numéricos = 1) para checar sintaxe; por padrão exclui o token `Rc`, incluído quando `tipoFormula = MEDIA_RECUPERACAO`. 🟢 `Validate/Formula.php:23-93`
- Executar (`execFormulaMedia`): substituição + `eval('?><?php $result = ...; ?>')`. 🟢 `Formula.php:236-241`
- Expor CRUD (telas processo 948, nível institucional, com exclusão habilitada) sincronizado com Eloquent `LegacyAverageFormula`. 🟢 `Views/*`, `app/Models/LegacyAverageFormula.php`

---

## Regras de Negócio

| Regra | Evidência |
|---|---|
| `nome` válida como String min 5 / max 50; `instituicao` e `tipoFormula` escolhas fechadas | 🟢 `Formula.php:247-259` |
| Token `Rc` só é permitido em fórmula do tipo recuperação (validador exclui `Rc` por padrão; fórmulas MEDIA_RECUPERACAO recebem `excludeToken => null`) | 🟢 `Formula.php:253-256`, `Validate/Formula.php:23-27` |
| Fórmula com token/símbolo inválido → "As variáveis ou símbolos não são permitidos: …" | 🟢 `Validate/Formula.php:58-60` |
| Fórmula com erro de sintaxe (parêntese faltante, operador solto) → "A fórmula apresenta erros. Verifique algum parêntese faltante ou um sinal de operação matemática sem um operando." | 🟢 `Validate/Formula.php:70-73` |
| Tokens numéricos não informados no consumo viram `0` (zero-fill) | 🟢 `Formula.php:274-286` |
| `substituiMenorNotaRc` só substitui quando `Rc > menor nota` (exemplo da tela: E1=2, E2=3, E3=2, Rc=5 → E3 vira 5) | 🟢 help do campo, `Formula.php:95-116` |
| Escolha da fórmula de recuperação na regra: `FormulaMedia_Model_TipoFormula::MEDIA_RECUPERACAO` injetado nas validações da `Regra` | 🟢 `RegraDataMapper.findFormulaMediaRecuperacao` |
| Lançamento na etapa `Rc` exige que a fórmula de recuperação exista e seja do tipo recuperação (mensagens do diário API) | 🟢 `DiarioApiController.php:95-106` |

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| FM-01 | CRUD de fórmulas por instituição (nome 5..50, string da fórmula, tipo, flag de substituição). | Must | 🟢 Views + DataMapper |
| FM-02 | Vocabulário de tokens fixo (Se/Et/Rc/En/Cn/RSPn/RSPSn/RSPMn) com `Rc` restrito ao tipo recuperação. | Must | 🟢 `_tokens`, validador |
| FM-03 | Avaliação executável com aritmética, parênteses, ternário e comparações; alias `x`. | Must | 🟢 `replaceAliasTokens`, `_exec` |
| FM-04 | Zero-fill de parâmetros faltantes antes da execução. | Must | 🟢 `fixedUndefinedParams` |
| FM-05 | Substituição opcional da menor nota de etapa pela nota de recuperação. | Should | 🟢 `substituiMenorNotaPorRecuperacao` |
| FM-06 | Validação sintática no cadastro com pré-execução controlada. | Must | 🟢 `Validate/Formula` |
| FM-07 | Fórmulas default seed: "Média aritmética" (`Se / Et`) e "Média recuperação ponderada" (`(Rc * 0.4) + (Se / Et * 0.6)`). | Must | 🟢 seeds |
| FM-08 | Consumo e composição de tokens pelo Boletim (por referência à unit `Avaliacao`). | Must | 🟢 `_calculaMedia`, `notaNecessariaExameFinal` |

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Segurança | `eval()` executa o texto da fórmula vindo do banco; a validação protege só o caminho de cadastro (edição direta no banco injeta código) | `_exec` × validador | 🟡 |
| Compatibilidade | `x` é substituído por `*` em toda a string (inclusive dentro de outras letras minúsculas) | `replaceAliasTokens` | 🟡 |
| Erros | Divisão por zero (ex. `Se / Et` com `Et = 0`) não é tratada no executor; em PHP 8 vira `DivisionByZeroError` | `_exec` | 🟡 |
| Convenção | "nota necessária" não alcançável devolvida como string `"+{notaMax}"` (ex. `"10+"`) — contrato de tipo misto | `Boletim.php:2440-2442` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado fórmula "Se / Et" com E1=5, E2=7, E3=8, E4=10, Et=4
Quando avaliar média final
Então resultado 7.5 🟢

Dado fórmula de recuperação "(Rc * 0.4) + (Se / Et * 0.6)"
Quando avaliar com Se=30, Et=4, Rc=6
Então resultado 7.5 🟢

Dado fórmula com token inválido "Se / Eb"
Quando salvar
Então mensagem "As variáveis ou símbolos não são permitidos: Eb" 🟢

Dado fórmula com parêntese faltante "(Rc * 0.4"
Quando salvar
Então mensagem "A fórmula apresenta erros. …" 🟢

Dado fórmula do tipo MEDIA_FINAL
Quando salvar com token Rc
Então bloqueado (Rc excluído por padrão) 🟢

Dado substituiMenorNotaRc ativo com E1=2, E2=3, E3=2, Rc=5
Quando avaliar
Então menor etapa substituída: E3=5 🟢

Dado valor de etapa não informado
Quando avaliar fórmula que usa todos os tokens
Então token faltante tratado como 0 🟢
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Motor de tokens + avaliação | Must | núcleo do cálculo de média 🟢 |
| Validação no cadastro | Must | integridade das fórmulas 🟢 |
| Substituição da menor nota | Should | feature opcional por fórmula 🟢 |
| Substituir `eval()` no alvo | Must (alvo) | objetivo declarado de segurança 🟡 |
| Seeds das 2 fórmulas default | Must | paridade de instalação 🟢 |

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `ieducar/modules/FormulaMedia/Model/Formula.php` | Entidade, tokens, substituição, eval | 🟢 |
| `ieducar/modules/FormulaMedia/Model/FormulaDataMapper.php` | `modules.formula_media` (chave composta id+instituicao no mapper) | 🟢 |
| `ieducar/modules/FormulaMedia/Model/TipoFormula.php` | Enum MEDIA_FINAL=1, MEDIA_RECUPERACAO=2 | 🟢 |
| `ieducar/modules/FormulaMedia/Validate/(Formula|Exception).php` | Validador de fórmula com pré-execução | 🟢 |
| `ieducar/modules/FormulaMedia/Views/{Index,Edit,View}Controller.php` | Telas processo 948 | 🟢 |
| `app/Models/LegacyAverageFormula.php` | Ponte Eloquent (sem timestamps) | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_formula_media_table.php` | DDL | 🟢 |
| `database/sqls/inserts/modules.formula_media.sql` + seeder `DefaultDataModulesFormulaMedia` | Seeds | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim.php` (`_calculaMedia`, `notaNecessariaExameFinal`, `_calculateNotasRecuperacoesEspecificas`) | Consumo — unit `Avaliacao` | 🟢 (referência) |
