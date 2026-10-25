# EvaluationRules (i-Educar legado) — Design

> Estrutura de dados, contratos, fluxos, dependências e riscos do domínio de regras de avaliação.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelo relacional (schema `modules`)

| Tabela | Chaves | Colunas essenciais | Confiança |
|---|---|---|---|
| `regra_avaliacao` | id (integer, PK) | `instituicao_id`, `nome varchar(50)`, `tipo_nota smallint`, `tipo_progressao smallint`, `media numeric(5,3)`, `porcentagem_presenca numeric(6,3)`, `parecer_descritivo smallint`, `tipo_presenca smallint`, `media_recuperacao numeric(5,3)`, `tipo_recuperacao_paralela`, `tipo_calculo_recuperacao_paralela int4 default 1`, `calcula_media_rec_paralela int2`, `nota_maxima_geral`, `nota_minima_geral`, `nota_maxima_exame_final`, `qtd_casas_decimais`, `qtd_disciplinas_dependencia`, `qtd_matriculas_dependencia`, `definir_componente_etapa`, `aprova_media_disciplina`, `reprovacao_automatica`, `tabela_arredondamento_id`, `tabela_arredondamento_id_conceitual`, `formula_media_id`, `formula_recuperacao_id`, `regra_diferenciada_id`, `disciplinas_aglutinadas varchar(191)`, `pontos varchar` (2025), `desconsiderar_lancamento_frequencia` (2020), `falta_min/max_geral` (2021), `aprovar_pela_frequencia_apos_exame` (2024), `reprovar_automaticamente_apos_dependencias` (2024) | 🟢 |
| `regra_avaliacao_recuperacao` | id serial | `regra_avaliacao_id`, `descricao varchar(25)`, `etapas_recuperadas varchar(25)`, `substitui_menor_nota boolean`, `media numeric(8,4)`, `nota_maxima numeric(8,4)`, `updated_at` | 🟢 |
| `regra_avaliacao_serie_ano` | sem PK id! | `serie_id`, `regra_avaliacao_id`, `regra_avaliacao_diferenciada_id nullable`, `ano_letivo smallint` | 🟢 |
| `regra_avaliacao_recuperacao_excluidos` / `regra_avaliacao_serie_ano_excluidos` | audit | cópia das colunas + timestamps + softDeletes | 🟢 |

### Classes do domínio (CoreExt)

| Classe | Papel | Fonte |
|---|---|---|
| `RegraAvaliacao_Model_Regra` | entidade com `_data`, `_dataTypes` (numeric), `_references` (enums + mappers externos) | 🟢 `Model/Regra.php` |
| `RegraAvaliacao_Model_RegraDataMapper` | CRUD `regra_avaliacao`; finders de fórmulas (MEDIA_FINAL/MEDIA_RECUPERACAO), tabelas por instituição e regras de recuperação | 🟢 `Model/RegraDataMapper.php` |
| `RegraAvaliacao_Model_RegraRecuperacao` + DataMapper | vetor de recuperações da regra | 🟢 |
| `RegraAvaliacao_Model_SerieAno` + DataMapper | mapeamento da tabela `serie_ano` (override `_createIdentityField()` — sem id) | 🟢 |
| Enums: `Nota/TipoValor` (0/1/2/3), `TipoProgressao` (1..5), `TipoParecerDescritivo` (0..6), `TipoPresenca` (1/2), `TipoRecuperacaoParalela` (0/1/2) | domínios fechados | 🟢 |
| `RegraAvaliacao_Validators_RegraAvaliacaoValidator` | validação máxima/mínima (sem chamador) | 🟡 |

### Módulo novo (Laravel/namespace `iEducar`)

| Classe | Papel | Fonte |
|---|---|---|
| `EvaluationRuleNotDefinedInLevel` | erro tipado (código em `Error::EVALUATION_RULE_NOT_DEFINED_IN_LEVEL`) com `level_code` | 🟢 |
| `EvaluationRuleNotAllowGeneralAbsence` | erro tipado com `school_class_id` | 🟢 |
| `ParallelRemedialCalculationType` | 1=Substituir nota, 2=Média, 3=Soma | 🟢 |

---

## Fluxo Principal — resolução da regra no diário

1. `IedFinder.getMatricula(codMatricula)` carrega a matrícula com `serie_regra_avaliacao_id`; se vazio → `EvaluationRuleNotDefinedInLevel`. 🟢
2. `Boletim` instancia serviço de avaliação com `RegraAvaliacao_Model_Regra` via `RegraDataMapper`; carrega `RegraRecuperacao(s)` (por etapa se `USAR_POR_ETAPAS_ESPECIFICAS`). 🟢 (consumo detalhado por referência: unit `Avaliacao`)
3. Lançamento de falta geral valida `tipoPresenca = GERAL`; caso contrário 422 com `EvaluationRuleNotAllowGeneralAbsence`. 🟢
4. Cálculo de média/limiares usa `notaMaximaGeral`, `notaMaximaExameFinal`, `qtdCasasDecimais` e `pontos` (multiplicadores por etapa). 🟡 (engine em `Avaliacao`)

## Fluxos Alternativos

- **Seleção de regra diferenciada:** matrícula com deficiência usa `regra_avaliacao_diferenciada_id` da tabela `serie_ano` (unit `RegraAvaliacao` para o fluxo admin). 🟡
- **Listagem nova (Legacy EvaluationRule):** filtros por ano e série via Eloquent com `averageFormula`/`recoveryFormula` e `gradeYears`. 🟢 `Views/IndexController.php:66-98`
- **Exclusão:** telas marcam soft delete; trigger copia linha para `*_excluidos`. 🟡

---

## Dependências

| Dependência | Papel | Fonte |
|-------------|-------|-------|
| `FormulaMedia` | ids de fórmulas válidas (MEDIA_FINAL/MEDIA_RECUPERACAO) | 🟢 (unit própria) |
| `TabelaArredondamento` | tabelas compatíveis por instituição (numérica/conceitual) | 🟢 (unit própria) |
| `Cadastro` (Série) | `serie_id` referenciado pelo vínculo `regra_avaliacao_serie_ano` | 🟢 |
| `Avaliacao` (Boletim) | consumo da regra nos cálculos e promoção | 🟢 |
| `DiarioClasse` | validação de presença/falta via `tipoPresenca` | 🟢 |
| `People` (`LegacyRemedialRule`) | regras de recuperação novas (Eloquent) na tela de edição | 🟢 |
| `Usuario` | processo 947 (nível institucional) nas telas | 🟢 (unit RegraAvaliacao) |

---

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| `serie_ano` sem PK autonumber (chave natural tabela) com override `_createIdentityField` | SerieAno | 🟢 |
| Auto-referência da regra para regra inclusiva (alunos com deficiência) | `regra_diferenciada_id` + label na tela | 🟢 |
| `pontos` como string CSV em vez de tabela filha (atalho de migração 2025) | migração + help da tela | 🟡 |
| Exceções de domínio novas replicando constantes de `LegacyEvaluationRule` (paralela) | `TipoRecuperacaoParalela` | 🟡 |
| Validador adicional solto (sem integração) | RegraAvaliacaoValidator | 🟡 |
| `attributeMap` duplica chaves `'serie'`/`'anoLetivo'` no SerieAnoDataMapper (sem efeito — a última vence) | SerieAnoDataMapper | 🟡 |

---

## Estado interno

- Nada persistido além das próprias tabelas; sem cache dedicado (o cache por matrícula é do `Boletim`). 🟢
- `_regraRecuperacoes` memoized dentro da instância da regra. 🟢

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Arquivo inventariado ausente | `RegraRecuperacaoMes.php` no modules.json não existe no snapshot (referência obsoleta do inventário) | glob | 🔴 |
| Teto de `mediaRecuperacao` divergente | validação admite até 14 mas DDL tem `numeric(5,3)` (max 9,999) — inconsistente | validação × DDL | 🟡 |
| `mediaRecuperacaoParalela` validado como String | min 1/max 10 em campo numeric do DDL | `Regra.php:242-245` | 🟡 |
| Validador sem chamador | `RegraAvaliacaoValidator` morto (regras máx/min só checarem no alvo) | grep | 🟡 |
| Sem FK rigorosa no consumo | exceção em runtime quando série sem regra (estado conflitante possível) | IedFinder | 🟡 |
| `pontos` CSV | parsing manual (fraqueza de formato), sem validação de quantidade de etapas | migração/help | 🟡 |

- Além disso, `qtdCasasDecimais` não tem validação no modelo (sem validador padrão); o valor é usado na exibição dos cálculos. 🟡
