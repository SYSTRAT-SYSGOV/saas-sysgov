# RegraAvaliacao (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema de configuração de regras de avaliação no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- ADR-002 (motor de regras de avaliação modular) lido e aprovado. 🟢 `_reversa_sdd/adrs/002-modular-evaluation-rules-engine.md`
- DDL do modelo novo revisado, com as tabelas `educa_evaluation_rules`, `educa_evaluation_rule_remedials`, `educa_evaluation_rule_series`, `educa_formula_averages`, `educa_rounding_tables` e `educa_rounding_table_values`. 🟢 `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 2
- Unit `Avaliacao` concluída, pois é o consumidor da regra. 🟢 `_reversa_sdd/Avaliacao/`
- Estratégia de tenant definida (ADR-001), pois a regra é isolada por instituição. 🟢 `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md`
- Validação do escopo das units de apoio: `FormulaMedia` (15) e `TabelaArredondamento` (19) planejadas, com sobreposição parcial confirmada antes de iniciar. 🟡

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar o modelo `EvaluationRule` com os campos do DDL, acesso por tenant e instituição | `ieducar/modules/RegraAvaliacao/Model/Regra.php:5-41` | Modelo criado, migrações aplicadas e CRUD básico acessível | 🟢 |
| T-02 | Implementar o motor seguro de avaliação de fórmulas, substituindo o `eval`, com a validação por AST no cadastro | `ieducar/modules/FormulaMedia/Model/Formula.php:122-128` e `:19-30` e `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 4 | Fórmula válida é avaliada em processo sandbox, sem acesso a sistema e a reflexão, e fórmula inválida é recusada no cadastro | 🟢 |
| T-03 | Implementar os enumerados: `NoteType`, `ProgressionType`, `PresenceType`, `DescriptiveOpinionType`, `ParallelRemedialType`, `ParallelRemedialCalculationType`, `RoundingActionType` | `Nota/TipoValor.php`, `TipoProgressao.php`, `TipoPresenca.php`, `TipoParecerDescritivo.php`, `TipoRecuperacaoParalela.php`, `TabelaArredondamento/Model/TipoArredondamentoMedia.php` | Enumerados publicados no SDK com os mesmos valores do legado | 🟢 |
| T-04 | Implementar o cadastro e a edição da regra, com a validação do domínio (nome, médias de 1 a 14 e de 0 a 14, presença de 1 a 100, fórmulas obrigatórias exceto sem nota, tabelas coerentes) | `Regra.php:138-247` e `Validators/RegraAvaliacaoValidator.php` | Todas as validações do legado reproduzidas, com mensagens equivalentes | 🟢 |
| T-05 | Implementar o vínculo regra, série e ano letivo, com a regra padrão e a regra diferenciada, e a unicidade por série e ano | `SerieAno.php` e `app/Models/LegacyEvaluationRuleGradeYear.php:10-24` | Vínculo criado, consultável e único por série e ano do tenant | 🟢 |
| T-06 | Implementar a compatibilidade de apuração de frequência entre a regra e a regra diferenciada na gravação | `EditController.php:1021-1025` e `:1136-1149` | Regra inclusiva com apuração divergente é recusada, com a mensagem do legado | 🟢 |
| T-07 | Implementar o padrão da configuração de pontos `^(|\d+(,\d+)*)$` na gravação | `EditController.php:1027-1031` e `:1154-1156` | Valor fora do padrão é recusado | 🟢 |
| T-08 | Implementar a consistência da regra de recuperação por etapa com a média, a substituição da menor nota e a nota máxima por etapa específica | `RegraRecuperacao.php` e `Regra.php:264-273` e `:281-290` e `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 1.3 | Recuperações gravadas em cascata, com a etapa e o corte corretos | 🟢 |
| T-09 | Gravar a regra e as recuperações em transação, com rollback consolidado | `EditController.php:1081-1122` | Falha em qualquer linha de recuperação reverte a regra e as recuperações | 🟢 |
| T-10 | Implementar a cópia da regra, com as recuperações recriadas apenas para a regra de destino | `EditController.php:1094-1104` | Cópia cria regra com recuperações, sem acumular linhas na regra de origem 🔴 | 🟡 |
| T-11 | Implementar listagem com filtro por ano letivo e por série, e o detalhe da regra | `IndexController.php:69-98` e `ViewController.php:23-43` | Listagem e detalhe exibem os campos do legado, com enlace à tabela e às fórmulas | 🟢 |
| T-12 | Implementar a proteção de exclusão de regra em uso por séries ativas | ausente no legado, previsto no modelo novo 🔴 | Exclusão recusada com a lista de vínculos | 🔴 |
| T-13 | Implementar a trilha de auditoria das mudanças de regra, com autor, instante, valor anterior e novo | ausente no legado, previsto no modelo novo 🔴 | Trilha consultável por regra | 🔴 |
| T-14 | Implementar o simulador de fórmulas e regras, com entrada de notas e recuperação | previsto no modelo novo 🔴 `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 5 | Simulação devolve média bruta, arredondada, conceito e situação | 🔴 |
| T-15 | Publicar os contratos TypeScript do SDK e os endpoints REST do modelo novo | `legacy-mapping.md`, seções 5 e 6 | SDK e rotas publicadas e consumíveis | 🟢 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | Fórmula com tipo de nota nenhum e fórmula de média não nula é recusada | `Regra.php:168-180` | Recusa com mensagem equivalente | 🟢 |
| TT-02 | Tipo de nota 3 mantém a tabela numérica e anula a conceitual | `EditController.php:963-967` | Estado gravado correto | 🟢 |
| TT-03 | Tabela não correspondente ao sistema de nota é recusada | `Regra.php:207-216` | Recusa com a mensagem do legado | 🟢 |
| TT-04 | Presença de regra inclusiva incompatível com a regra diferenciada é recusada | `EditController.php:1021-1025` | Recusa com a mensagem do legado | 🟢 |
| TT-05 | Pontos fora do padrão são recusados | `EditController.php:1027-1031` | Recusa com mensagem | 🟢 |
| TT-06 | Nota máxima menor que a mínima é recusada | `Validators/RegraAvaliacaoValidator.php` | Recusa com mensagem | 🟢 |
| TT-07 | Gravação transacional rollback em recuperação inválida | `EditController.php:1081-1122` | Nenhuma alteração persistida | 🟢 |
| TT-08 | Cópia recria as recuperações para a regra de destino sem duplicar na de origem | `EditController.php:1094-1104` | Contagem de recuperações correta nas duas regras 🔴 | 🟡 |
| TT-09 | Fórmula com tokens legados (Se, Et, Rc, E1 a E10, RSP1 a RSP10) avaliada com resultado equivalente ao do legado | `Formula.php:19-30` | Paridade de resultado em casos de teste do legado | 🟡 |
| TT-10 | Fórmula maliciosa (injeção de código) é recusada validação e não é executada | `Formula.php:122-128` 🔴 | Nenhuma execução de código, recusa por AST | 🔴 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `modules.regra_avaliacao` para `educa_evaluation_rules`, com UUID, `tenant_id` e `institution_id` derivados de `instituicao` | `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 3 | Regra migrada mantém os parâmetros, com contagem batendo | 🟢 |
| TM-02 | Migrar `modules.regra_avaliacao_recuperacao` para `educa_evaluation_rule_remedials`, convertendo as etapas separadas por `;` em lista | `app/Models/LegacyRemedialRule.php:31-34` | Etapas migradas com os grupos corretos | 🟢 |
| TM-03 | Migrar `modules.regra_avaliacao_serie_ano` para `educa_evaluation_rule_series`, respeitando a unicidade por série e ano | `SerieAno.php` | Vínculos migrados, sem duplicidade de série e ano | 🟢 |
| TM-04 | Migrar as fórmulas de `modules.formula_media` para `educa_formula_averages`, validando a sintaxe de cada fórmula contra o avaliador seguro | `Formula.php:19-30` | Todas as fórmulas válidas ou com a lista de recusa para ajuste pedagógico | 🟡 |
| TM-05 | Migrar `modules.tabela_arredondamento` e `modules.tabela_arredondamento_valor` para `educa_rounding_tables` e `educa_rounding_table_values` | `TabelaArredondamento/Model/Tabela.php` | Réguas migradas com as faixas e ações corretas | 🟢 |
| TM-06 | Reconciliar as recuperações criadas para a regra de origem pela cópia do legado | `EditController.php:1094-1104` 🔴 | Duplicidades identificadas e resolvidas com a área pedagógica | 🟡 |

---

## Ordem Sugerida

1. T-03 (enumerados)
2. T-01 (modelo da regra)
3. T-02 (motor seguro de fórmulas)
4. T-04 (validações do cadastro)
5. T-06 e T-07 (compatibilidade e pontos)
6. T-08 (recuperação por etapa)
7. T-09 (transação)
8. T-05 (vínculo série e ano)
9. T-11 (listagem e detalhe)
10. T-10 (cópia)
11. T-12, T-13 (exclusão protegida e auditoria)
12. T-15 (SDK e endpoints)
13. T-14 (simulador)
14. TM-01 a TM-06 (migração de dados)

**Bloqueios:**

- T-02 bloqueia T-04, T-14 e TM-04, pois o avaliador seguro assume a validação e a execução.
- T-01 bloqueia T-05, T-08 e TM-01.
- T-05 depende da tabela `educa_series` do modelo novo, fora desta unit.
- T-15 depende do SDK `@sysgov/sdk` do modelo novo.

---

## Lacunas Pendentes (🔴)

- Ausência de confirmação do consumo dos campos `faltaMaximaGeral`, `faltaMinimaGeral`, `qtdMatriculasDependencia` e `disciplinasAglutinadas`. 🟡
- Ausência de confirmação da semântica do regime de pontos (`pontos`) e da lista de componentes agrupados. 🟡
- Exclusão de regra com vínculos de série sem verificação localizada no legado. 🔴
- Recuperações recriadas para a regra de origem na cópia, com possível acumulação de duplicidades. 🟡
- Semântica pedagógica da regra inclusiva e da aprovação por frequência após exame a confirmar com o time pedagógico. 🟡
