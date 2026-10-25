# EvaluationRules (i-Educar legado) — Contratos

> Superfícies observáveis do domínio. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tabela `modules.regra_avaliacao` (contrato fonte)

| Coluna | Tipo | Default | Campo do modelo |
|---|---|---|---|
| `id` | integer | — | id |
| `instituicao_id` | integer NOT NULL | — | instituicao |
| `formula_media_id` / `formula_recuperacao_id` | integer NULL | — | formulaMedia / formulaRecuperacao |
| `tabela_arredondamento_id` / `…_id_conceitual` | integer NULL | — | tabelaArredondamento(Conceitual) |
| `nome` | varchar(50) NOT NULL | — | nome |
| `tipo_nota` | smallint NOT NULL | — | tipoNota (0/1/2/3) |
| `tipo_progressao` | smallint NOT NULL | — | tipoProgressao (1..5) |
| `media` | numeric(5,3) | 0.000 | media |
| `porcentagem_presenca` | numeric(6,3) | 0.000 | porcentagemPresenca |
| `parecer_descritivo` | smallint | 0 | parecerDescritivo (0..6) |
| `tipo_presenca` | smallint NOT NULL | — | tipoPresenca (1/2) |
| `media_recuperacao` | numeric(5,3) | 0.000 | mediaRecuperacao |
| `tipo_recuperacao_paralela` | smallint | 0 | tipoRecuperacaoParalela (0/1/2) |
| `tipo_calculo_recuperacao_paralela` | int4 | 1 | tipoCalculoRecuperacaoParalela (1/2/3) |
| `calcula_media_rec_paralela` | int2 | 0 | calculaMediaRecParalela |
| `media_recuperacao_paralela` | numeric(5,3) | NULL | mediaRecuperacaoParalela |
| `nota_maxima_geral` | integer | 10 | notaMaximaGeral |
| `nota_minima_geral` | integer | 0 | notaMinimaGeral |
| `nota_maxima_exame_final` | integer | 10 | notaMaximaExameFinal |
| `qtd_casas_decimais` | integer | 2 | qtdCasasDecimais |
| `nota_geral_por_etapa` | smallint | 0 | notaGeralPorEtapa |
| `definir_componente_etapa` | smallint | NULL | definirComponentePorEtapa |
| `qtd_disciplinas_dependencia` / `qtd_matriculas_dependencia` | smallint | 0 | qtdDisciplinas/MatriculasDependencia |
| `aprova_media_disciplina` / `reprovacao_automatica` | smallint | 0 | aprovaMediaDisciplina / reprovacaoAutomatica |
| `regra_diferenciada_id` | integer NULL | — | regraDiferenciada (auto-FK) |
| `disciplinas_aglutinadas` | varchar(191) NULL | — | disciplinasAglutinadas |
| `desconsiderar_lancamento_frequencia` | boolean | false (2020-12) | desconsiderarLancamentoFrequencia |
| `falta_minima_geral` / `falta_maxima_geral` | integer | 0/100 (2021-06) | faltaMinima/MáximaGeral |
| `aprovar_pela_frequencia_apos_exame` | boolean | false (2024-09) | aprovarPelaFrequenciaAposExame |
| `reprovar_automaticamente_apos_dependencias` | smallint | 0 (2024-12) | reprovarAutomaticamenteAposDependencias |
| `pontos` | varchar NULL (2025-04) | — | pontos (CSV "2,3,4") |
| `updated_at` | timestamp | now() (trigger) | — |

🟢 DDL + `RegraDataMapper::$attributeMap`

## `modules.regra_avaliacao_recuperacao`

| Coluna | Tipo | Nota |
|---|---|---|
| `regra_avaliacao_id` | integer NOT NULL | FK à regra. 🟢 |
| `descricao` | varchar(25) | rótulo do exame. 🟢 |
| `etapas_recuperadas` | varchar(25) | CSV de etapas ";" ("1;2"). 🟢 |
| `substitui_menor_nota` | boolean NULL | 🟢 |
| `media` / `nota_maxima` | numeric(8,4) NOT NULL | 🟢 |
| `updated_at` | timestamp | trigger. 🟢 |

## `modules.regra_avaliacao_serie_ano` (sem PK)

| Coluna | Tipo | Nota |
|---|---|---|
| `serie_id` + `ano_letivo` | integer + smallint NOT NULL | par natural (sem unique no DDL). 🟡 |
| `regra_avaliacao_id` | integer NOT NULL | regra principal. 🟢 |
| `regra_avaliacao_diferenciada_id` | integer NULL | regra inclusiva. 🟢 |

## Módulo novo (`iEducar\Modules\EvaluationRules`)

```php
// Exceções (uso em FaltasGeralController/DiarioController/Boletim/IedFinder)
EvaluationRuleNotDefinedInLevel(levelId)      // código EVALUATION_RULE_NOT_DEFINED_IN_LEVEL, extra level_code
EvaluationRuleNotAllowGeneralAbsence(schoolClassId) // código EVALUATION_RULE_NOT_ALLOW_GENERAL_ABSENCE, extra school_class_id

// Enum do cálculo da recuperação paralela
ParallelRemedialCalculationType: REPLACE_SCORE=1, AVERAGE_SCORE=2, SUM_SCORE=3
```
🟢

## Endpoints afetados (contrato do diário)

| Rota (diário HTTP) | Regra aplicada | Resposta |
|---|---|---|
| `POST faltas gerais` (`FaltasGeralController`, `DiarioController::postFaltasGeral`) | `tipoPresenca != GERAL` → 422 `{message: "A regra da turma N não permite lançamento de faltas geral."}` | 🟢 |
| Calendário de lançamentos/diário com matrícula sem regra | `EvaluationRuleNotDefinedInLevel` ("Regra de avaliação não informada na série para o ano letivo informado.") | 🟢 🟡 |

## Dados default

```sql
-- modules.regra_avaliacao.sql (seed), regra 1 (quantitativa) e 2 (qualitativa):
(1, 1, 1, 2, 1, 'Regra de avaliação quantitativa', tipo_nota=1, progressão=2, media=6.000, porcentagem=75.000, presença=2, mediaRecuperacao=6.000, ...);
(2, 1, 1, NULL, 2, 'Regra de avaliação qualitativa', tipo_nota=2, progressão=1, media=6.000, porcentagem=80.000, casas=5, ...);
```
🟢 `database/sqls/inserts/modules.regra_avaliacao.sql`

## Integrações

| Integração | Uso | Confiança |
|---|---|---|
| `FormulaMedia_Model_FormulaDataMapper` | finders de fórmulas por tipo | 🟢 (unit FormulaMedia) |
| `TabelaArredondamento_Model_TabelaDataMapper` | tabelas por instituição | 🟢 (unit TabelaArredondamento) |
| `LegacyEvaluationRule` / `LegacyRemedialRule` (Eloquent) | pontes View/índices | 🟢 |
| `App_Model_IedFinder::getMatricula` | resolução por matrícula com exceção | 🟢 |
| `Boletim` (unit Avaliacao) | consumo para cálculo/promoção | 🟢 |
