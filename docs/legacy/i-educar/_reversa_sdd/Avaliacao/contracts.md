# Avaliacao (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de avaliação. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de lançamento de nota (legado)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Matrícula | Identificador da matrícula avaliada | 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:36` |
| Componente curricular | Identificador do componente | 🟢 `NotaController.php:37` |
| Etapa | Inteiro da etapa, ou `Rc` para o exame final | 🟢 `NotaController.php:38` e `:76` |
| Nota | Valor da tabela de arredondamento da regra | 🟢 `NotaController.php:93` |
| Falta | Quantidade de 0 a 100, exibida apenas com presença por componente | 🟢 `NotaController.php:99-102` |
| Parecer | Texto de até quarenta caracteres e dez linhas, exibido apenas com parecer por etapa e por componente | 🟢 `NotaController.php:96-98` e `:99` |

| Contexto | Valor | Fonte |
|----------|-------|-------|
| Identificador de processo | 642 | 🟢 `NotaController.php:11` |
| Nível de acesso | Somente escola | 🟢 `NotaController.php:12` |
| Opção de exclusão | Desabilitada | 🟢 `NotaController.php:14` |
| Destino após gravação | Tela de boletim da matrícula | 🟢 `NotaController.php:24-31` |

---

## 2. Contrato de lançamento de falta (legado)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Matrícula | Identificador da matrícula | 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:69` |
| Etapa | Inteiro da etapa | 🟢 `FaltaController.php:135` |
| Falta | Quantidade de 0 a 100, com a ausência valendo zero | 🟢 `FaltaController.php:146-165` |

| Contexto | Valor | Fonte |
|----------|-------|-------|
| Identificador de processo | 642 | 🟢 `FaltaController.php:11` |
| Nível de acesso | Somente escola | 🟢 `FaltaController.php:13` |

A tela de falta grava tanto a falta geral quanto a falta por componente, conforme o tipo de presença da regra. 🟢 `FaltaController.php:156-165`

---

## 3. Contrato de persistência dos lançamentos

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `modules.nota_aluno` | `matricula_id` | vínculo da matrícula | 🟢 `app/Models/LegacyStudentScore.php:11-18` |
| `modules.nota_componente_curricular` | `id` | nota do aluno, componente, nota, nota arredondada, etapa, nota de recuperação, nota original, nota de recuperação específica | 🟢 `app/Models/LegacyDisciplineScore.php:12-24` |
| `modules.nota_geral` | — | nota do aluno, nota, nota arredondada, etapa | 🟢 `app/Models/LegacyGeneralScore.php:11-18` |
| `modules.nota_exame` | `ref_cod_matricula` | matrícula, componente, nota de exame | 🟢 `app/Models/LegacyScoreExam.php:11-20` |
| `modules.nota_componente_curricular_media` | `nota_aluno_id` | componente, média, média arredondada, etapa, situação, bloqueada | 🟢 `app/Models/LegacyDisciplineScoreAverage.php:12-19` |
| `modules.regra_avaliacao` | `id` | instituição, nome, fórmulas, tipos, pontos, recuperação paralela, tabelas de arredondamento, regra diferenciada | 🟢 `app/Models/LegacyEvaluationRule.php:43-65` |
| `modules.regra_avaliacao_serie_ano` | `serie_id` | regra, regra diferenciada, ano letivo | 🟢 `app/Models/LegacyEvaluationRuleGradeYear.php:10-24` |
| `modules.regra_recuperacao_paralela` | — | regra de avaliação, componente, tipo | 🟢 `app/Models/LegacyRemedialRule.php` |
| `modules.formula_media` | — | expressão da fórmula | 🟢 `app/Models/LegacyAverageFormula.php` |
| `modules.tabela_arredondamento` | — | vínculo da regra e valores | 🟢 `app/Models/LegacyRoundingTable.php` |

---

## 4. Contrato de domínio da regra de avaliação

| Parâmetro | Tipo | Efeito na apuração | Fonte |
|-----------|------|--------------------|-------|
| `tipoNota` | inteiro | Numérica ou conceitual, e a lista de valores da tela 🟢 | `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:90-95` |
| `tipoProgressao` | inteiro | Contínua, manual ou cíclica 🟢 | `RegraAvaliacao.php:100-103` e `:319-322` |
| `tipoPresenca` | inteiro | Geral ou por componente, e a exibição do campo de falta 🟢 | `RegraAvaliacao.php:62-66` |
| `parecerDescritivo` | inteiro | Modalidade de parecer descritivo 🟢 | `RegraAvaliacao.php:72-75` |
| `notaGeralPorEtapa` | inteiro | Habilita a nota geral sem componente 🟢 | `RegraAvaliacao.php:141-144` |
| `media` | decimal | Média mínima de aprovação 🟢 | `RegraAvaliacao.php:151-155` |
| `mediaRecuperacao` | decimal | Média mínima na recuperação 🟢 | `RegraAvaliacao.php:162-169` |
| `porcentagemPresenca` | decimal | Frequência mínima exigida 🟢 | `RegraAvaliacao.php:193-196` |
| `qtdDisciplinasDependencia` | inteiro | Limite de dependências 🟢 | `RegraAvaliacao.php:183-186` |
| `reprovarAutomaticamenteAposDependencias` | inteiro | Reprova automaticamente acima do limite 🟢 | `RegraAvaliacao.php:121-135` |
| `aprovaMediaDisciplina` | inteiro | Aprova pela média geral das disciplinas 🟢 | `RegraAvaliacao.php:298-301` |
| `desconsiderarLancamentoFrequencia` | inteiro | Neutraliza a frequência na apuração 🟢 | `RegraAvaliacao.php:309-312` |
| `aprovarPelaFrequenciaAposExame` | inteiro | Aprova pela frequência após o exame, exige fórmula de recuperação 🟢 | `RegraAvaliacao.php:110-113` |
| `notaMaximaExameFinal` | decimal | Nota máxima do exame 🟢 | `RegraAvaliacao.php:233-238` |
| `qtdCasasDecimais` | inteiro | Casas decimais armazenadas 🟢 | `RegraAvaliacao.php:244-248` |
| `definirComponentePorEtapa` | inteiro | Define o componente por etapa 🟢 | `RegraAvaliacao.php:173-176` |
| `disciplinasAglutinadas` | texto | Lista de componentes agrupados para a apuração 🟢 | `RegraAvaliacao.php:15-26` |

---

## 5. Contrato de domínio do regime de progressão

| Valor | Constante | Significado | Fonte |
|-------|-----------|-------------|-------|
| — | `NAO_CONTINUADA_MANUAL_CICLO` | Progressão manual, regime cíclico 🟢 | `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:319-322` |

Os demais valores do regime de progressão não foram lidos nesta extração. 🟡

---

## 6. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 3, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/evaluation-rules` | listagem de regras, com filtro por instituição 🟢 `app/Models/Builders/LegacyEvaluationRuleBuilder.php` |
| POST | `/api/v1/educa/evaluation-rules` | criação de regra 🟢 `app/Models/LegacyEvaluationRule.php` |
| GET | `/api/v1/educa/evaluation-rules/{id}` | detalhe da regra, com as tabelas e as fórmulas 🟢 `LegacyEvaluationRule.php` |
| GET | `/api/v1/educa/school-classes/{id}/evaluation-rule` | regra aplicável à turma, com a regra diferenciada 🟢 `app/Models/LegacySchoolClass.php:648-661` |
| POST | `/api/v1/educa/enrollments/{id}/scores` | lançamento de nota, de falta e de parecer 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:115-142` |
| GET | `/api/v1/educa/enrollments/{id}/scores` | lançamentos da matrícula, por etapa e por componente 🟢 `app/Models/LegacyDisciplineScore.php` |
| DELETE | `/api/v1/educa/enrollments/{id}/scores/{scoreId}` | exclusão de lançamento, com verificação de etapas anteriores 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3104` e `:3171` |
| GET | `/api/v1/educa/enrollments/{id}/report-card` | boletim apurado da matrícula 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:829` |
| POST | `/api/v1/educa/enrollments/{id}/calculate` | apuração sob demanda, sem persistência 🟡 |
| GET | `/api/v1/educa/enrollments/{id}/promotion-preview` | prévia da promoção, com a série de destino 🟡 |
| POST | `/api/v1/educa/enrollments/{id}/promote` | promoção, com registro de falha reprocessável 🟢 `app/Services/PromotionService.php` |
| GET | `/api/v1/educa/score-averages` | médias por componente, com a situação e a trava 🟢 `app/Models/LegacyDisciplineScoreAverage.php` |
| GET | `/api/v1/educa/score-audits` | trilha de auditoria dos lançamentos, ausente no legado 🔴 |
| GET | `/api/v1/educa/early-warnings` | alertas precoces, ausentes no legado 🔴 |
