# Avaliacao (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de avaliação a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: série, matrícula, componente curricular, turma, tabela de arredondamento, fórmula de média, regra de recuperação paralela, escola, instituição, diário de classe, regime cíclico e sequência de séries.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_evaluation_rules`, `educa_scores`, `educa_attendances` e `educa_descriptive_opinions` descritas em `_reversa_sdd/Avaliacao/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Taxonomia dos três eixos de granularidade de lançamento preservada: por aluno, por componente e geral, para notas, faltas e pareceres.
- [ ] Catálogo de regras de avaliação da rede configurado, com as tabelas de arredondamento e as fórmulas resolvidas.
- [ ] Definição do motor de cálculo: se será uma biblioteca em PHP, um serviço isolado ou um motor funcional, conforme o desenho do modelo novo.
- [ ] Contrato do pacote `@sysgov/sdk` definido para regra, lançamento, média e apuração.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar a regra de avaliação, com tenant, nome, tipo de nota, de progressão e de presença, médias, porcentagem de presença e limites pedagógicos
  - Origem no legado: `app/Models/LegacyEvaluationRule.php:43-65`
  - Critério de pronto: tabela `educa_evaluation_rules` criada, com o tipo de recuperação paralela normalizado e os limites como colunas tipadas
  - Confiança: 🟡

- [ ] T-02, Modelar o vínculo da regra com a série e o ano letivo, com a regra padrão e a diferenciada
  - Origem no legado: `app/Models/LegacyEvaluationRuleGradeYear.php:10-24`
  - Critério de pronto: tabela `educa_evaluation_rule_grade_years` criada, com unicidade por tenant, por série e por ano
  - Confiança: 🟡

- [ ] T-03, Modelar a tabela de arredondamento e seus valores, com nome, valor máximo e descrição
  - Origem no legado: `app/Models/LegacyRoundingTable.php` e `app/Models/LegacyValueRoundingTable.php`
  - Critério de pronto: tabelas `educa_rounding_tables` e `educa_rounding_values` criadas, com a regra de arredondamento normalizada
  - Confiança: 🟡

- [ ] T-04, Modelar a fórmula de média e a de recuperação, com o de/para da regra
  - Origem no legado: `app/Models/LegacyAverageFormula.php` e `app/Models/LegacyEvaluationRule.php:162-175`
  - Critério de pronto: tabelas `educa_average_formulas` criadas, e a expressão da fórmula validada no momento da gravação
  - Confiança: 🟡

- [ ] T-05, Modelar a regra de recuperação paralela, com o componente e o tipo
  - Origem no legado: `app/Models/LegacyRemedialRule.php` e `app/Models/LegacyEvaluationRule.php:70-73`
  - Critério de pronto: tabela `educa_remedial_rules` criada, com o tipo e o modo de cálculo normalizados
  - Confiança: 🟡

- [ ] T-06, Modelar o lançamento de nota por componente, com nota original, arredondada, de recuperação e de recuperação específica
  - Origem no legado: `app/Models/LegacyDisciplineScore.php:12-24`
  - Critério de pronto: tabela `educa_scores` criada, com os quatro campos de nota e o vínculo com a etapa
  - Confiança: 🟡

- [ ] T-07, Modelar o lançamento de nota geral por etapa, de nota de exame e de falta, por aluno, por componente e geral
  - Origem no legado: `ieducar/modules/Avaliacao/Model/NotaGeral.php` e `FaltaAluno.php` e `FaltaComponente.php` e `FaltaGeral.php`
  - Critério de pronto: a tabela de lançamentos comporta os três eixos por discriminador, com unicidade por aluno, por componente e por etapa
  - Confiança: 🟡

- [ ] T-08, Modelar o lançamento de parecer descritivo, por aluno, por componente e geral
  - Origem no legado: `ieducar/modules/Avaliacao/Model/ParecerDescritivoAluno.php` e `ParecerDescritivoComponente.php` e `ParecerDescritivoGeral.php`
  - Critério de pronto: o parecer é gravado na mesma estrutura de lançamento, com o vínculo da etapa
  - Confiança: 🟡

- [ ] T-09, Modelar a média por componente e por etapa, com a média arredondada, a situação e a trava de edição
  - Origem no legado: `app/Models/LegacyDisciplineScoreAverage.php:12-19`
  - Critério de pronto: tabela `educa_score_averages` criada, com a situação e a trava persistidas
  - Confiança: 🟡

- [ ] T-10, Implementar o motor de cálculo da recuperação paralela, isolado e sem acesso a banco
  - Origem no legado: `app/Services/StageScoreCalculationService.php:4-30`
  - Critério de pronto: as três operações de média, de soma e de maior valor são funções puras, com teste de propriedade sobre a comutatividade e a idempotência
  - Confiança: 🟢

- [ ] T-11, Implementar o arredondamento de nota e de média pela tabela de valores
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:2272` e `:2335`
  - Critério de pronto: o arredondamento devolve o valor da tabela e respeita as casas decimais da regra, com teste para o limite inferior e o superior
  - Confiança: 🟢

- [ ] T-12, Implementar a aplicação da recuperação paralela por etapa, com as três modalidades de regra
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:3394-3417`
  - Critério de pronto: a etapa de exame final nunca sofre recuperação, e a recuperação em etapa específica preserva a nota original
  - Confiança: 🟢

- [ ] T-13, Implementar o cálculo da média do componente e da média geral, com a fórmula da regra
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:110` e `:129` e `ieducar/modules/Avaliacao/Service/Boletim/Avaliacao.php`
  - Critério de pronto: a média é apurada a partir das notas da etapa, com a fórmula e o arredondamento da regra
  - Confiança: 🟡

- [ ] T-14, Implementar a apuração da situação por componente e a situação geral, combinando nota e falta
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:625` e `:936` e `:1214` e `:829`
  - Critério de pronto: a situação final é reprovação por falta quando a frequência é insuficiente, e a regra que desconsidera a frequência é respeitada
  - Confiança: 🟡

- [ ] T-15, Implementar a apuração da carga horária, com a soma do ciclo no regime cíclico
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:3471-3487`
  - Critério de pronto: a carga do regime cíclico é a soma das cargas das matrículas do ciclo, com teste para um ciclo de três séries
  - Confiança: 🟢

- [ ] T-16, Implementar a avaliação da aprovação com dependência, com os cinco critérios de recusa
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:3427-3468`
  - Critério de pronto: cada um dos cinco critérios de recusa é testado, e a contagem de reprovações respeita o limite da regra
  - Confiança: 🟢

- [ ] T-17, Implementar a resolução da regra aplicável à turma, com a regra diferenciada por escola
  - Origem no legado: `app/Models/LegacySchoolClass.php:648-661` e `app/Models/LegacyEvaluationRuleGradeYear.php:20-24`
  - Critério de pronto: a regra diferenciada prevalece quando a escola a utiliza e a série a possui, com teste para os dois regimes
  - Confiança: 🟢

- [ ] T-18, Implementar o registro de auditoria do lançamento, com o autor, o instante, o valor anterior, o novo valor e a justificativa
  - Origem no legado: ausência de auditoria no legado, evidenciada por `ieducar/modules/Avaliacao/Service/Boletim.php:1830-1935`
  - Critério de pronto: toda alteração de nota, de falta ou de parecer gera registro imutável, e a justificativa é obrigatória
  - Confiança: 🟡

- [ ] T-19, Implementar a verificação de lançamentos em etapas anteriores, para exclusão e para alteração
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:3171` e `:3285`
  - Critério de pronto: a exclusão é recusada quando há lançamento em etapa anterior, com a lista das etapas problemáticas
  - Confiança: 🟢

- [ ] T-20, Implementar a gravação do lançamento com nota, falta e parecer em uma única transação
  - Origem no legado: `ieducar/modules/Avaliacao/Views/NotaController.php:115-142`
  - Critério de pronto: a falta e o parecer só são gravados quando a regra os habilita, e a gravação é atômica
  - Confiança: 🟢

- [ ] T-21, Implementar a reordenação da etapa de lançamento a partir das notas já lançadas
  - Origem no legado: `ieducar/modules/Avaliacao/Views/NotaController.php:51-61`
  - Critério de pronto: a etapa proposta é a seguinte às existentes, com teste para componente sem lançamento
  - Confiança: 🟢

- [ ] T-22, Implementar a alteração da situação da matrícula a partir da apuração, com a propagação às enturmações e à nota
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:2904` e `ieducar/modules/Api/Views/MatriculaController.php:682-721`
  - Critério de pronto: a situação alterada encerra ou reactiva as enturmações, conforme o caso
  - Confiança: 🟡

- [ ] T-23, Implementar a promoção com a criação da matrícula do ano seguinte, com registro de falha
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php:2715` e `app/Services/PromotionService.php:22-51`
  - Critério de pronto: a falha da promoção é registrada e reprocessável, e não silenciada
  - Confiança: 🟡

- [ ] T-24, Implementar o motor de cálculo como biblioteca isolada, sem acesso a banco
  - Origem no legado: `ieducar/modules/Avaliacao/Service/Boletim.php`, que concentra acesso a banco, cache e escrita de estado
  - Critério de pronto: a apuração é uma função pura, com entrada de regras, de notas, de faltas e de carga horária, e saída de boletim imutável
  - Confiança: 🟡

- [ ] T-25, Implementar o sistema de alerta precoce, por média em queda e por excesso de faltas
  - Origem no legado: ausência de alerta no legado, evidenciada por `ieducar/modules/Avaliacao/Service/Boletim.php:829`
  - Critério de pronto: o alerta é emitido ao atingir 15% de faltas ou ao ficar abaixo da média de corte, antes do fechamento da etapa
  - Confiança: 🟡

- [ ] T-26, Implementar a API do módulo, com as rotas de lançamento, de apuração, de boletim e de promoção
  - Origem no legado: `ieducar/modules/Avaliacao/Views/DiarioApiController.php` e `PromocaoApiController.php`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-27, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/LegacyEvaluationRule.php:51-53` e `app/Models/LegacyDisciplineScore.php:12-21`
  - Critério de pronto: tipos `EvaluationRule`, `ScoreLaunch`, `AbsenceLaunch`, `OpinionLaunch`, `ScoreAverage` e `ReportCardResult` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de lançamento e apuração (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: reprovação por falta de frequência
- [ ] TT-03, Teste do arredondamento, com nota no limite inferior e no superior da tabela
- [ ] TT-04, Teste das três modalidades de recuperação paralela, com média, com soma e com substituição
- [ ] TT-05, Teste da recuperação em etapa específica, com a preservação da nota original
- [ ] TT-06, Teste da nota de exame final, sem recuperação paralela
- [ ] TT-07, Teste da apuração de carga horária no regime cíclico
- [ ] TT-08, Teste da aprovação com dependência, com os cinco critérios de recusa
- [ ] TT-09, Teste da regra que desconsidera o lançamento de frequência
- [ ] TT-10, Teste da exclusão de lançamento com histórico em etapas anteriores
- [ ] TT-11, Teste da gravação conjunta de nota, de falta e de parecer, e da omissão conforme a regra
- [ ] TT-12, Teste da promoção, com a série de destino apurada e com o registro de falha
- [ ] TT-13, Teste do registro de auditoria de lançamento, com o valor anterior e a justificativa
- [ ] TT-14, Teste de isolamento por tenant em todas as listagens e apurações
- [ ] TT-15, Teste da apuração com a regra em cache, verificando a consistência após a edição da regra

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar as regras de avaliação de `modules.regra_avaliacao` para `educa_evaluation_rules`, com o tipo de recuperação normalizado
- [ ] TM-02, Migrar os vínculos de regra de `modules.regra_avaliacao_serie_ano` para `educa_evaluation_rule_grade_years`
- [ ] TM-03, Migrar as tabelas de arredondamento de `modules.tabela_arredondamento` e seus valores para `educa_rounding_tables` e `educa_rounding_values`
- [ ] TM-04, Migrar as fórmulas de `modules.formula_media` para `educa_average_formulas`, com a validação da expressão
- [ ] TM-05, Migrar as notas por componente de `modules.nota_componente_curricular` para `educa_scores`, preservando a nota original, a arredondada e as de recuperação
- [ ] TM-06, Migrar as notas gerais de `modules.nota_geral` e as de exame de `modules.nota_exame` para `educa_scores`
- [ ] TM-07, Migrar as faltas e os pareceres das tabelas de `pmieducar` para `educa_attendances` e `educa_descriptive_opinions`
- [ ] TM-08, Migrar as médias de `modules.nota_componente_curricular_media` para `educa_score_averages`, com a situação e a trava
- [ ] TM-09, Migrar as regras de recuperação paralela de `modules.regra_recuperacao_paralela` para `educa_remedial_rules`
- [ ] TM-10, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-11, Reapurar o boletim de uma amostra de matrículas, comparando a situação apurada antes e depois da migração

---

## Ordem Sugerida

1. T-01, T-02, T-03, T-04 e T-05 primeiro, porque definem o esquema da regra de avaliação e de suas dependências.
2. T-06, T-07, T-08 e T-09 em seguida, porque definem a estrutura do lançamento e da média.
3. T-10, T-11 e T-12 logo após, porque são o núcleo de cálculo, isento de banco.
4. T-13, T-14 e T-15 depois, porque a apuração depende do cálculo.
5. T-16, T-17, T-19, T-20 e T-21 em seguida, porque são as regras de decisão e a gravação.
6. T-18 logo após T-20, porque a auditoria registra o que a gravação produz.
7. T-22 e T-23 depois, porque a promoção depende da apuração e da validação da dependência.
8. T-24 em seguida, porque a extração do motor de cálculo para uma biblioteca exige o núcleo já isolado.
9. T-25, T-26 e T-27 por último, porque adicionam alerta, contrato e API.
10. TM-01 a TM-11 somente depois de T-26 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
11. Bloqueios: T-02 depende de T-01; T-03 e T-04 e T-05 dependem de T-01; T-06 depende de T-01; T-09 depende de T-06; T-11 depende de T-03; T-12 depende de T-05 e T-10; T-13 depende de T-04 e T-11; T-14 depende de T-13 e da unit Enrollments; T-15 depende do modelo de ciclo, da unit Stages; T-16 depende de T-14; T-17 depende de T-02 e da unit SchoolClass; T-19 depende de T-06; T-20 depende de T-06 e T-07; T-22 depende de T-14 e da unit Enrollments; T-23 depende de T-16 e da unit Enrollments; T-24 depende de T-10, T-11, T-12, T-13, T-14 e T-15; T-25 depende de T-14; T-26 depende de T-20 e T-24.

---

## Lacunas Pendentes (🔴)

- As fórmulas de média e de recuperação são interpretadas em tempo de execução. É preciso decidir se o modelo novo mantém a expressão configurável, e, nesse caso, como limitá-la a um conjunto seguro de operações.
- Não existe trilha de auditoria dos lançamentos. É preciso decidir o que é retido, por quanto tempo e com que garantia de imutabilidade, e qual é o catálogo de justificativas aceito.
- A promoção é disparada por uma requisição sintética contra a API legada, com a exceção silenciada. É preciso decidir se a promoção passa a ser um processo explícito, com reprocessamento.
- O serviço de boletim é uma classe de 3.541 linhas que concentra acesso a banco, cache, regras de regime e escrita de estado. É preciso definir a estratégia de extração, com a fronteira do motor de cálculo e a do serviço de persistência.
- Coexistem a camada legada procedural e a camada Eloquent sobre as mesmas tabelas. É preciso definir a fonte de verdade da migração e o que se faz com a camada legada.
- O arredondamento depende de tabela de valores configurável, e não de regra numérica. É preciso confirmar se o INEP ou a rede mantêm essa configuração ou se o modelo novo adota arredondamento por regra.
- A regra de avaliação é lida de cache por cinco minutos, o que faz a apuração divergir da regra salva nesse intervalo. É preciso definir a consistência esperada entre a edição da regra e a apuração.
- A situação de dependência é avaliada por contagem de disciplinas reprovadas, e a reprovação automática tem limite próprio na regra. É preciso confirmar a regra pedagógica que rege a reprovação automática.
- O parecer descritivo é limitado a quarenta caracteres e dez linhas na tela, o que é mais restritivo que a prática pedagógica. É preciso definir o limite correto e se há curtailment por nível de ensino.
- A carga horária do regime cíclico é apurada por soma sobre as matrículas do ciclo. É preciso confirmar se a carga apurada inclui a carga das disciplines de apoio, que não são avaliadas.
- Não há notificação de alerta precoce no legado. É preciso definir o gatilho, o canal de comunicação e a quem a comunicação é dirigida, e se o familial está incluído.
- O boletim é montado em memória e devolvido em arrays de exibição, o que acopla o motor de cálculo à interface. É preciso definir o contrato de saída do motor, que deve ser serializável e independente do formato de tela.
