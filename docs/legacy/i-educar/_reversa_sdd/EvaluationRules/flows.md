# EvaluationRules (i-Educar legado) — Fluxos

> Fluxos observados no código. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Configuração da regra (cadastro, resumo)

> Fluxo completo das telas é da unit `RegraAvaliacao`; aqui só o contrato que passa pela camada de domínio.

1. Usuário abre a tela de edição (processo 947, nível institucional). 🟢 `EditController::$_processoAp`
2. `EditController` carrega opções de referência via `RegraDataMapper`: fórmulas de média final (`findFormulaMediaFinal`), fórmulas de recuperação (`findFormulaMediaRecuperacao`), tabelas de arredondamento por instituição. 🟢 `RegraDataMapper.php`
3. Submit monta a entidade `RegraAvaliacao_Model_Regra`; validações do modelo rodam (`getDefaultValidatorCollection`). 🟢 `Regra.php:143-247`
4. Persistência via `CoreExt_DataMapper` em `modules.regra_avaliacao`; recuperações salvas em `_setRecuperacoes` com `LegacyRemedialRule`/tabela filha. 🟢 `EditController.php`
5. Vínculo série/ano gravado em `modules.regra_avaliacao_serie_ano` (sem PK id). 🟢 `SerieAnoDataMapper`

## Fluxo 2 — Resolução da regra por matrícula (consumo no diário)

1. `IedFinder.getMatricula(codMatricula)` carrega a matrícula. 🟢
2. Define a régua da série/ano: se não há regra para a série no ano letivo → `EvaluationRuleNotDefinedInLevel` (código `EVALUATION_RULE_NOT_DEFINED_IN_LEVEL`, extra `level_code`). 🟢 `IedFinder.php`, `EvaluationRuleNotDefinedInLevel.php`
3. Instancia `RegraAvaliacao_Model_Regra` (via `RegraDataMapper`) e, se `tipoRecuperacaoParalela = USAR_POR_ETAPAS_ESPECIFICAS`, carrega `RegraRecuperacao(s)` para achar a configuração da etapa (`getRegraRecuperacaoByEtapa`). 🟢 `Regra.php:250-285`
4. `Boletim` usa os limites da regra (`notaMaximaGeral`, `notaMaximaExameFinal`, `qtdCasasDecimais`, `pontos`) nos cálculos de média/promoção. 🟡 (engine própria na unit `Avaliacao`)

## Fluxo 3 — Lançamento de falta geral (exceção no HTTP)

1. `POST` no diário de faltas gerais (`FaltasGeralController` / `DiarioController::postFaltasGeral`). 🟢
2. Valida `regra->get('tipoPresenca') == TipoPresenca::GERAL`; se não → `throw new EvaluationRuleNotAllowGeneralAbsence($turmaId)`. 🟢 `FaltasGeralController.php`
3. `catch` converte em resposta HTTP 422 `{ "message": "A regra da turma N não permite lançamento de faltas geral." }` + extra `school_class_id`. 🟢
4. Caminho feliz: persiste `Avaliacao_Model_FaltaGeral`, `saveFaltas()`, `promover()`. 🟢

## Fluxo 4 — Recuperação específica por etapa

1. Regra com regras de recuperação cadastradas ("etapasRecuperadas" = "1;2"). 🟢
2. Na etapa em exame, `getNotaMaximaRecuperacao(etapa)` decide: etapa coberta → `notaMaxima` da recuperação específica; etapa não coberta → `notaMaximaGeral` da regra. 🟢 `Regra.php`
3. Cálculo da média com recuperação usa `tipoCalculoRecuperacaoParalela` (1 Substituir / 2 Média / 3 Soma). 🟢 `ParallelRemedialCalculationType`

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Série/ano sem regra vinculada | `EvaluationRuleNotDefinedInLevel` no `IedFinder`/`Boletim` | 🟢 |
| Falta geral com regra por componente | 422 com `EvaluationRuleNotAllowGeneralAbsence` | 🟢 |
| `tipoNota = NENHUM` | fórmula/média deixam de ser obrigatórias na validação | 🟢 |
| Tabela de arredondamento incompatível com o sistema de nota | mensagem "…não corresponde ao sistema de nota escolhido." | 🟢 |
| `mediaRecuperacao` > 14 | bloqueado pelo validador (mas > 9,999 já passa do DDL `numeric(5,3)`) | 🟢 🟡 |
| Séries/anos duplicados em `serie_ano` | sem unique no DDL — inconsistência possível | 🟡 |
| Exclusão de regra/série-ano | linha copiada para `*_excluidos` (soft delete/audit) | 🟡 |

## Pontos de Fail-silente (coleta para o Revisor)

- `RegraRecuperacaoMes.php` citado no inventário mas ausente — qualquer fluxo que o usasse não existe hoje. 🔴
- `RegraAvaliacaoValidator` (Validators/) sem chamador: regras notaMáx > notaMín / faltas só existem mortas. 🟡
