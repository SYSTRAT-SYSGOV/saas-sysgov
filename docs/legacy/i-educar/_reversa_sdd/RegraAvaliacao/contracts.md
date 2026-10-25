# RegraAvaliacao (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de regras de avaliação. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: listagem de regras

| Elemento | Formato | Observação |
|----------|---------|------------|
| Título | "Listagem de regras de avaliação" | 🟢 `ieducar/modules/RegraAvaliacao/Views/IndexController.php:10` |
| Colunas | Nome, Sistema de nota, Progressão, Média aprovação, Média exame, Fórmula média, Fórmula recuperação, Recuperação paralela | 🟢 `IndexController.php:14-23` |
| Filtro por ano | Campo dinâmico `ano`, opcional | 🟢 `IndexController.php:29-35` |
| Filtro por série | Lista de séries ativas, ordenada por nome, opcional | 🟢 `IndexController.php:37-57` |
| Processo | 947 | 🟢 `IndexController.php:12` |

---

## 2. Contrato de tela: formulário de cadastro e edição

| Elemento | Formato | Observação |
|----------|---------|------------|
| Título | "Cadastrar regra de avaliação" ou "Editar regra de avaliação" | 🟢 `EditController.php:344-348` |
| Modo cópia | Parâmetro `copy=true`, com título de cadastro e ação `Novo` | 🟢 `EditController.php:344` e `:356-358` |
| Instituição | Lista das instituições da rede | 🟢 `EditController.php:362-370` |
| Nome | Texto de 50 caracteres | 🟢 `EditController.php:372-383` |
| Identificador | Campo oculto `id` | 🟢 `EditController.php:360` |
| Recurso JavaScript | `/vendor/legacy/RegraAvaliacao/Assets/Javascripts/RegraAvaliacao.js` | 🟢 `EditController.php:340-342` |
| Processo | 947, nível INSTITUCIONAL | 🟢 `EditController.php` (propriedades `_processoAp` e `_nivelAcessoOption`) |

---

## 3. Contrato de tela: detalhe da regra

| Elemento | Formato | Observação |
|----------|---------|------------|
| Título | "Detalhes da regra de avaliação" | 🟢 `ViewController.php:13` |
| Campos exibidos | Nome, Sistema de nota, Tabela de arredondamento, Progressão, Média para promoção, Média exame, Fórmulas, Porcentagem presença, Parecer, Tipo de presença, Regra diferenciada, Recuperação paralela, Nota máxima, Nota mínima, Falta máxima, Falta mínima, Nota máxima exame, Casas decimais | 🟢 `ViewController.php:23-43` |
| Botão extra | "Copiar regra", com destino `edit?id={id}&copy=true` | 🟢 `ViewController.php:54` |
| Enlaces | Tabela de arredondamento e fórmulas com enlace às telas de detalhe dos módulos de apoio | 🟢 `ViewController.php:57-83` |
| Processo | 947 | 🟢 `ViewController.php:18` |

---

## 4. Contratos HTTP legados

| Método | Rota | Entrada | Saída | Fonte |
|--------|------|---------|-------|-------|
| GET | `module/RegraAvaliacao/index` | `ano`, `cod_serie` (opcionais) | Listagem renderizada | 🟢 `IndexController.php:29-57` |
| GET/POST | `module/RegraAvaliacao/edit` | `id` (opcional), `copy` (opcional), campos do formulário | Formulário ou redirecionamento de sucesso | 🟢 `EditController.php:344-360` |
| GET | `module/RegraAvaliacao/view` | `id` | Detalhe renderizado | 🟢 `ViewController.php:1-84` |

Não há API REST JSON para a manutenção de regras no legado por esta extração; apenas o recurso `app/Http/Controllers/Api/Resource/EvaluationRule/ResourceEvaluationRuleController.php` de leitura. 🟡 `_reversa_sdd/Avaliacao/requirements.md`

---

## 5. Regras de validação (catálogo)

| Campo | Regra | Mensagem | Fonte |
|-------|-------|----------|-------|
| `instituicao` | Choice entre as instituições da rede | padrão do validador | 🟢 `Regra.php:182-185` |
| `nome` | String de 5 a 50 caracteres | padrão do validador | 🟢 `Regra.php:186-188` |
| `formulaMedia` | Choice entre ids de fórmulas do tipo média final; obrigatória exceto quando `tipoNota == NENHUM`, em que só aceita `null` | padrão do validador | 🟢 `Regra.php:168-180` e `:189-192` |
| `formulaRecuperacao` | Choice entre ids de fórmulas do tipo média de recuperação, opcional | padrão do validador | 🟢 `Regra.php:193-196` |
| `regraDiferenciada` | Choice entre ids de regras, opcional | padrão do validador | 🟢 `Regra.php:197-200` |
| `tipoNota` | Choice sobre as chaves do enum: 0, 1, 2, 3 | padrão do validador | 🟢 `Regra.php:201-203` e `Nota/TipoValor.php` |
| `tipoProgressao` | Choice sobre as chaves do enum: 1 a 5 | padrão do validador | 🟢 `Regra.php:204-206` e `TipoProgressao.php` |
| `tabelaArredondamento` | Choice entre tabelas da instituição | "A tabela de arredondamento selecionada não corresponde ao sistema de nota escolhido." | 🟢 `Regra.php:207-211` |
| `tabelaArredondamentoConceitual` | Choice entre tabelas da instituição | mesma mensagem | 🟢 `Regra.php:212-216` |
| `parecerDescritivo` | Choice: 0 a 6 | padrão do validador | 🟢 `Regra.php:217-219` e `TipoParecerDescritivo.php` |
| `tipoPresenca` | Choice: 1 ou 2 | padrão do validador | 🟢 `Regra.php:220-222` e `TipoPresenca.php` |
| `media` | Numérico: 1 a 10 com progressão continuada; 0 a 10 sem; obrigatória exceto tipo de nota nenhum | padrão do validador | 🟢 `Regra.php:223-229` |
| `porcentagemPresenca` | Numérico: 1 a 100 | padrão do validador | 🟢 `Regra.php:230-232` |
| `mediaRecuperacao` | Numérico: 1 a 14 com progressão continuada; 0 a 14 sem | padrão do validador | 🟢 `Regra.php:233-239` |
| `tipoRecuperacaoParalela` | Choice: 0, 1, 2 | padrão do validador | 🟢 `Regra.php:240-242` e `TipoRecuperacaoParalela.php` |
| `mediaRecuperacaoParalela` | String de 1 a 10 caracteres | padrão do validador | 🟢 `Regra.php:243-245` |
| Nota máxima e mínima | Nota máxima maior que a mínima | mensagem do validador | 🟢 `Validators/RegraAvaliacaoValidator.php` |
| Faltas máxima e mínima | Falta máxima maior que a mínima | mensagem do validador | 🟢 `Validators/RegraAvaliacaoValidator.php` |
| Presença | Entre 0 e 100 | mensagem do validador | 🟢 `Validators/RegraAvaliacaoValidator.php` |
| Frequência da regra inclusiva | Tipo de presença igual ao da regra diferenciada | "A regra inclusiva selecionada possuí apuração de frequência incompatível, verifique a configuração e tente novamente." | 🟢 `EditController.php:1021-1025` e `:1136-1149` |
| Pontos | Regex `^(|\d+(,\d+)*)$` | "A configuração de pontos possuí valor inválido, verifique a configuração e tente novamente." | 🟢 `EditController.php:1027-1031` e `:1154-1156` |

---

## 6. Contrato de persistência

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `modules.regra_avaliacao` | `id` | instituição, nome, tipo de nota, progressão, média, fórmulas, presença, parecer, recuperação paralela, tabelas, regra diferenciada, pontos, dependências | 🟢 `app/Models/LegacyEvaluationRule.php:43-65` e `Regra.php:5-41` |
| `modules.regra_avaliacao_serie_ano` | `serie_id` + `ano_letivo` | regra, regra diferenciada, ano letivo | 🟢 `app/Models/LegacyEvaluationRuleGradeYear.php:10-24` |
| `modules.regra_avaliacao_recuperacao` | `id` | regra de avaliação, descrição, etapas recuperadas, substituição da menor nota, média, nota máxima | 🟢 `app/Models/LegacyRemedialRule.php:22-29` |
| `modules.formula_media` | `id` | nome, expressão, tipo de fórmula, substituição da menor nota | 🟢 `app/Models/LegacyAverageFormula.php` |
| `modules.tabela_arredondamento` | `id` | instituição, nome, tipo de nota | 🟢 `app/Models/LegacyRoundingTable.php` |
| `modules.tabela_arredondamento_valor` | `id` | tabela, valor mínimo, valor máximo, ação, casa decimal | 🟢 `app/Models/LegacyValueRoundingTable.php` |

A gravação da regra e das recuperações ocorre em transação única, com rollback. 🟢 `EditController.php:1081-1122`

---

## 7. Contrato de domínio da regra de avaliação

Campos declarados em `Regra.php:5-41`, agrupados por papel:

| Grupo | Campos | Fonte |
|-------|--------|-------|
| Identificação | `instituicao`, `nome`, `regraDiferenciada` | 🟢 `Regra.php:6-8` e `:35` |
| Sistema de nota | `tipoNota`, `tabelaArredondamento`, `tabelaArredondamentoConceitual`, `qtdCasasDecimais`, `notaMaximaGeral`, `notaMinimaGeral`, `notaMaximaExameFinal` | 🟢 `Regra.php:8` e `:10-11` e `:21` e `:25-26` |
| Progressão | `tipoProgressao`, `media`, `mediaRecuperacao`, `qtdDisciplinasDependencia`, `qtdMatriculasDependencia`, `aprovaMediaDisciplina`, `reprovacaoAutomatica`, `reprovarAutomaticamenteAposDependencias` | 🟢 `Regra.php:9` e `:12` e `:18` e `:29` e `:32-34` e `:40` |
| Presença | `tipoPresenca`, `porcentagemPresenca`, `faltaMaximaGeral`, `faltaMinimaGeral`, `desconsiderarLancamentoFrequencia` | 🟢 `Regra.php:15` e `:17` e `:23-24` e `:38` |
| Parecer | `parecerDescritivo` | 🟢 `Regra.php:16` |
| Recuperação | `formulaRecuperacao`, `tipoRecuperacaoParalela`, `mediaRecuperacaoParalela`, `calculaMediaRecParalela`, `tipoCalculoRecuperacaoParalela`, `aprovarPelaFrequenciaAposExame` | 🟢 `Regra.php:14` e `:19-20` e `:36-37` e `:39` |
| Média | `formulaMedia` | 🟢 `Regra.php:13` |
| Regimes especiais | `notaGeralPorEtapa`, `definirComponentePorEtapa`, `disciplinasAglutinadas`, `pontos` | 🟢 `Regra.php:27-28` e `:30-31` |

---

## 8. Enumerações do domínio (com fonte)

### Sistema de nota (`Nota/TipoValor.php:1-33`)

| Valor | Significado |
|-------|-------------|
| 0 | Nenhum |
| 1 | Numérica |
| 2 | Conceitual |
| 3 | Numérica e conceitual |

### Regime de progressão (`TipoProgressao.php:1-27`)

| Valor | Significado |
|-------|-------------|
| 1 | Continuada |
| 2 | Não continuada com média e presença |
| 3 | Não continuada somente média |
| 4 | Não continuada manual |
| 5 | Não continuada manual por ciclo |

### Parecer descritivo (`TipoParecerDescritivo.php:1-31`)

| Valor | Significado |
|-------|-------------|
| 0 | Nenhum |
| 1 | Por etapa com descritor |
| 2 | Por etapa com componente |
| 3 | Por etapa geral |
| 4 | Anual com descritor |
| 5 | Anual com componente |
| 6 | Anual geral |

### Tipo de presença (`TipoPresenca.php:1-18`)

| Valor | Significado |
|-------|-------------|
| 1 | Geral unificada |
| 2 | Por componente curricular |

### Recuperação paralela (`TipoRecuperacaoParalela.php:1-23`)

| Valor | Significado |
|-------|-------------|
| 0 | Não usar |
| 1 | Por etapa |
| 2 | Por etapas específicas |

---

## 9. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seções 2, 4, 5 e 6:

### Endpoints REST (Laravel 13, prefixo `/api/v1/educa/evaluation-rules`)

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/evaluation-rules` | Listagem de regras da instituição 🟢 `IndexController.php:69-98` |
| POST | `/api/v1/educa/evaluation-rules` | Cadastro de regra 🟢 `EditController.php:959-1129` |
| GET | `/api/v1/educa/evaluation-rules/{id}` | Detalhe com recuperações e fórmulas 🟢 `ViewController.php:23-43` |
| PUT | `/api/v1/educa/evaluation-rules/{id}` | Atualização de parâmetros 🟢 `EditController.php:959-1129` |
| DELETE | `/api/v1/educa/evaluation-rules/{id}` | Soft-delete com proteção de vínculos 🔴 |
| POST | `/api/v1/educa/evaluation-rules/simulate` | Simulador de médias 🔴 |
| GET/POST | `/api/v1/educa/formula-averages` | Fórmulas de média 🟢 `RegraDataMapper.php:124-141` |
| GET/POST | `/api/v1/educa/rounding-tables` | Tabelas de arredondamento 🟢 `RegraDataMapper.php:161-168` |
| POST | `/api/v1/educa/evaluation-rules/assign-series` | Vínculo com séries e ano letivo 🟢 `SerieAno.php` |

### Tipos TypeScript (`packages/sdk/src/types/educa/evaluation-rules.ts`)

Tipos previstos: `NoteType`, `ProgressionType`, `PresenceType`, `DescriptiveOpinionType`, `ParallelRemedialType`, `ParallelRemedialCalculationType`, `RoundingActionType`, `RoundingTableValue`, `RoundingTable`, `FormulaAverage`, `EvaluationRule`, `SimulationRequest` e `SimulationResponse`. 🟢 `legacy-mapping.md`, seção 6

De/para das tabelas: `modules.regra_avaliacao` a `educa_evaluation_rules`, `modules.regra_avaliacao_recuperacao` a `educa_evaluation_rule_remedials`, `modules.regra_avaliacao_serie_ano` a `educa_evaluation_rule_series`, `modules.formula_media` a `educa_formula_averages`, `modules.tabela_arredondamento` a `educa_rounding_tables` e `modules.tabela_arredondamento_valor` a `educa_rounding_table_values`. 🟢 `legacy-mapping.md`, seção 3
