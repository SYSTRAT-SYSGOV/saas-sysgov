# EvaluationRules (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Camada de domínio/contrato das regras de avaliação: entidade `RegraAvaliacao_Model_Regra` e mapeadores, regras de recuperação, vínculo série/ano, validações e enums — mais o módulo novo `src/Modules/EvaluationRules` (exceções e enum de cálculo da recuperação paralela).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Recorte (evitar duplicação)

- A **unit `RegraAvaliacao`** (já escrita) cobre as telas legadas de CRUD/config (`Views`) e o fluxo de configuração, além de `LegacyEvaluationRule` (Eloquent).
- As **units `FormulaMedia` e `TabelaArredondamento`** (a fazer) cobrem fórmulas e tabelas de arredondamento em detalhe; aqui são só referências (FK/validação de compatibilidade).
- Esta unit documenta o **modelo de dados, contratos de validação, mapeadores, enums, DDL/migrações e integrações** das regras (consumo por Avaliacao/DiarioClasse). 🟢 `ieducar/modules/RegraAvaliacao/Model/*`, `src/Modules/EvaluationRules/*`

---

## Visão Geral

As regras de avaliação vivem em `modules.regra_avaliacao` (34 campos mapeados, por instituição), com três tabelas complementares: `modules.regra_avaliacao_recuperacao` (exames por etapa), `modules.regra_avaliacao_serie_ano` (vínculo série+ano→regra e regra diferenciada) e as tabelas de auditoria `*_excluidos` (com soft delete/triggers). 🟢 `RegraDataMapper.php:15-55`, DDL `2020_01_01_110000_create_modules_regra_avaliacao*`

A evolução do legado adicionou colunas em ondas: `desconsiderar_lancamento_frequencia` (2020-12), `falta_minima_geral`/`falta_maxima_geral` (2021-06), `aprovar_pela_frequencia_apos_exame` (2024-09), `reprovar_automaticamente_apos_dependencias` (2024-12) e `pontos` (string CSV de multiplicadores por etapa, 2025-04). 🟢 migrações correspondentes

> ⚠️ Contra o módulo descrito pelo Archaeologist: `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacaoMes.php` aparece como arquivo principal no inventário, mas **não existe no snapshot** — referência obsoleta. 🔴

---

## Responsabilidades

- Definir o contrato completo da regra: sistema de nota (`tipoNota`), progressão (`tipoProgressao`), fórmulas (média/recuperação), tabelas de arredondamento (numérica e conceitual), parecer descritivo, apuração de presença, recuperação paralela, limites de nota/falta, dependências, pontos por etapa. 🟢 `Regra.php:12-62`
- Validar coerência da regra no cadastro: nome (5..50), fórmula de média obrigatória (exceto `tipoNota = NENHUM`), média 0..10 (mínimo 1 se progressão "Progressiva"/contínua), `mediaRecuperacao` até 14, `porcentagemPresenca` 1..100, tabelas de arredondamento compatíveis com o sistema de nota. 🟢 `Regra.php:143-247`
- Resolução dinâmica: regra por série+ano via `regra_avaliacao_serie_ano`, com regra inclusiva (diferenciada) para alunos com deficiência por auto-referência (`regra_diferenciada_id`). 🟢 `SerieAno.php`, DDL
- Recuperação específica: por etapas ("1;2") com substituição da menor nota, média de habilitação e nota máxima; `getNotaMaximaRecuperacao(etapa)` alterna entre máximo geral e máximo da etapa. 🟢 `RegraRecuperacao.php:25-88`
- Exceções de domínio no consumo: `EvaluationRuleNotDefinedInLevel` (série sem regra para o ano) e `EvaluationRuleNotAllowGeneralAbsence` (turma sem falta geral) — usadas por `IedFinder.getMatricula`, `Boletim` e `DiarioController`/`FaltasGeralController` (HTTP 422). 🟢 `src/Modules/EvaluationRules/Exceptions/*`
- Enum novo do cálculo da recuperação paralela: 1 subtrair? — não: 1=Substituir nota, 2=Média entre nota e recuperação, 3=Soma entre nota e recuperação. 🟢 `ParallelRemedialCalculationType.php`
- Dados default: 2 regras seed (quantitativa id 1, qualitativa id 2) via SQL de inserts. 🟢 `database/sqls/inserts/modules.regra_avaliacao.sql`

---

## Regras de Negócio

### Contrato da `Regra` (validação no modelo)
| Campo | Validação | Evidência |
|---|---|---|
| `nome` | String min 5, max 50 | 🟢 `Regra.php:193-196` |
| `formulaMedia` | obrigatório, exceto `tipoNota = NENHUM` (aceita só null) | 🟢 `:169-190` |
| `media` | Numeric 0..10; **mínimo 1** quando `tipoProgressao = CONTINUADA` | 🟢 `:220-227` |
| `mediaRecuperacao` | Numeric 0..14; mínimo 1 com progressão contínua | 🟢 `:228-236` |
| `tabelaArredondamento(Conceitual)` | deve ser escolha das tabelas da instituição; mensagem "…não corresponde ao sistema de nota escolhido." | 🟢 `:198-215` |
| `porcentagemPresenca` | 1..100 | 🟢 `:238-241` |
| `mediaRecuperacaoParalela` | **String** min 1/max 10 (não numeric — inconsistência do modelo) | 🟢 `:242-245` |
| `regraDiferenciada` | escolha entre ids de regras (lioteca de auto-referência, null permitido) | 🟢 `:184-187` |

### Recuperação específica (`RegraRecuperacao`)
- `etapasRecuperadas` string com ponto e vírgula ("1;2"), validada como String 1..25; `getEtapas()` explode por `;`; `getLastEtapa()` = max. 🟢
- `substituiMenorNota` boolean; `media` e `notaMaxima` Numeric 0..100. 🟢
- `getRegraRecuperacaoByEtapa(etapa)` percorre as regras em ordem de etapas. 🟢
- `tipoRecuperacaoParalela`: 0=NÃO_USAR, 1=USAR_POR_ETAPA, 2=USAR_POR_ETAPAS_ESPECIFICAS (delegada ao enum novo `LegacyEvaluationRule` constants). 🟢 `TipoRecuperacaoParalela.php`
- Cálculo da média com recuperação: `tipoCalculoRecuperacaoParalela` 1=Substituir nota, 2=Média, 3=Soma (`ParallelRemedialCalculationType`), default 1 no DDL. 🟢

### Vínculo série/ano (`SerieAno`)
- Chave natural `(serie_id, ano_letivo)` sem PK autonumber (entidade sem campo id); aponta para regra normal e regra diferenciada. 🟢 DDL
- `IndexController` filtra a listagem por ano letivo e série via `LegacyEvaluationRule.gradeYears` (pontes Eloquent). 🟢 `Views/IndexController.php:66-88`

### Exceções no consumo
- Matrícula sem `serie_regra_avaliacao_id` → `EvaluationRuleNotDefinedInLevel` (mensagem "Regra de avaliação não informada na série…"). 🟢 `IedFinder.getMatricula`
- Lançamento de falta geral em turma com `tipoPresenca != GERAL` → `EvaluationRuleNotAllowGeneralAbsence` (código `EVALUATION_RULE_NOT_ALLOW_GENERAL_ABSENCE`, extra `school_class_id`), resposta HTTP 422. 🟢 `FaltasGeralController`, `DiarioController.postFaltasGeral`

### Validador adicional (sem chamador)
- `RegraAvaliacao_Validators_RegraAvaliacaoValidator` (notaMáx > notaMín, porcentagem 0..100, faltaMáx > faltaMín) não é referenciado por ninguém no snapshot. 🟡

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| ER-01 | Regra de avaliação completa por instituição com os 34 atributos mapeados ao DDL. | Must | 🟢 `RegraDataMapper` attributeMap. |
| ER-02 | Validações de coerência (fórmula, médias, porcentagem, tabelas compatíveis). | Must | 🟢 validators do modelo. |
| ER-03 | Vínculo único de regra por série+ano, com regra inclusiva opcional. | Must | 🟢 `serie_ano` + auto-FK. |
| ER-04 | Recuperação por etapas com substituição de menor nota e nota máxima por etapa. | Must | 🟢 `RegraRecuperacao`. |
| ER-05 | Cálculo de média com recuperação paralela (substituir/média/soma). | Must | 🟢 enum + default 1. |
| ER-06 | Exceções de domínio tipadas no consumo (422 no diário). | Must | 🟢 exceptions. |
| ER-07 | Auditoria de exclusões (`*_excluidos`) e `updated_at` por trigger. | Should | 🟢 migrações legacy. |
| ER-08 | Regras default pré-carregadas (quantitativa/qualitativa). | Must | 🟢 seeder SQL. |
| ER-09 | Pontos (multiplicadores) por etapa em string CSV. | Should | 🟢 coluna `pontos`. |
| ER-10 | Dependências: limites de disciplina/matricula para dependência e reprovação automática. | Should | 🟢 campos `qtdDisciplinasDependencia`, `qtdMatriculasDependencia` e `reprovacaoAutomatica`. |
| ER-11 | Faltas mín/máx gerais como limites de frequência. | Should | 🟢 colunas 2021. |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Precisão | `media` `numeric(5,3)`; recuperação `numeric(8,4)`; notas máx como `integer` | DDL | 🟢 |
| Consistência | teto **14** do validador de `mediaRecuperacao` vs `numeric(5,3)` do DDL — teto do validador acima do máximo 9,999 do campo | validação × DDL | 🟡 |
| Auditoria | Tabelas `*_excluidos` + triggers created/updated (padrão transversal) | migrações | 🟢 |
| Legacy/Eloquent coexistência | Modelo CoreExt + DataMapper convivem com Eloquent (LegacyEvaluationRule/LegacyRemedialRule) nas Views | Views | 🟢 |
| Sem FK obrigatória no código | vínculo de série→regra depende de dados (exceção em runtime) | IedFinder | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado série sem regra para o ano letivo
Quando aluno abrir diário
Então EvaluationRuleNotDefinedInLevel ("Regra de avaliação não informada na série para o ano letivo informado.") 🟢

Dado regra com tipoPresenca = POR_COMPONENTE
Quando professor lançar falta geral
Então HTTP 422 com mensagem da exceção + school_class_id 🟢

Dado tipoNota = NENHUM
Quando salvar regra sem fórmula
Então aceito (fórmula/média deixam de ser obrigatórios) 🟢

Dado progressão CONTINUADA
Quando média informada menor que 1
Então bloqueada pela validação 🟢

Dado tabela de arredondamento de outra instituição/sistema
Quando salvar
Então mensagem "…não corresponde ao sistema de nota escolhido." 🟢

Dado regra com recuperação por etapas "1;2"
Quando lançar recuperação na etapa 3
Então getRegraRecuperacaoByEtapa retorna null (sem nota máxima modificada — usa máximo geral) 🟢
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Contrato completo da regra + validações | Must | coração da avaliação 🟢 |
| Vínculo serie/ano + regra inclusiva | Must | resolução por matrícula 🟢 |
| Recuperações (geral/por etapa) | Must | 🟢 |
| Exceções tipadas no consumo (422) | Must | contrato do diário 🟢 |
| Auditoria `*_excluidos` | Should | padrão do legado 🟢 |
| Teto do validador de `mediaRecuperacao` (14) acima do DDL | Should→Alvo | corrigir teto no alvo 🟡 |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `ieducar/modules/RegraAvaliacao/Model/Regra.php` | Entidade + validações | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/RegraDataMapper.php` | `modules.regra_avaliacao` (34 colunas) + finders | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacao(.DataMapper).php` | `…_recuperacao` | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/SerieAno(.DataMapper).php` | `…_serie_ano` | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/Tipo*.php`, `Nota/TipoValor.php` | Enums | 🟢 |
| `ieducar/modules/RegraAvaliacao/Validators/RegraAvaliacaoValidator.php` | Validador adicional sem chamador | 🟡 |
| `ieducar/modules/RegraAvaliacao/Views/{Index,Edit,View}Controller.php` | Telas (processo 947) — detalhado na unit `RegraAvaliacao` | 🟢 (referência) |
| `src/Modules/EvaluationRules/Exceptions/*.php` | Exceções de consumo | 🟢 |
| `src/Modules/EvaluationRules/Models/ParallelRemedialCalculationType.php` | Enum de cálculo | 🟢 |
| `database/migrations/legacy/2020_01_01_*regra_avaliacao*` | DDL + triggers + auditoria | 🟢 |
| `database/migrations/*add_field*regra*` | Evolução 2020-2025 | 🟢 |
| `database/sqls/inserts/modules.regra_avaliacao.sql` + `DefaultModulesRegraAvaliacaoTableSeeder` | Seeds | 🟢 |
