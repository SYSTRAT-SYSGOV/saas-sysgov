# Avaliacao (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de avaliação legado faz: regras de avaliação, lançamento de notas e faltas, médias, recuperação e promoção, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema Avaliacao do i-Educar é o motor pedagógico do sistema: recebe as **regras de avaliação** da rede, recebe os **lançamentos** de notas, faltas e pareceres descritivos, e produz a **situação final do estudante** em cada etapa, com as médias, as reprovações, as dependências, a recuperação e a promoção. 🟢

Problema que resolve: apurar, de forma determinística e auditável, se cada estudante foi aprovado, reprovado, retido ou promovido em cada etapa do ano letivo, aplicando a mesma regra a toda a rede e a cada série, e registradas as justificativas de cada lançamento. 🟢

A arquitetura é dual: uma **camada moderna**, com modelos Eloquent sobre `modules.nota_*` e `modules.regra_avaliacao`, e uma **camada legada**, com o serviço `Avaliacao_Service_Boletim` de 3.541 linhas, que concentra acesso a banco, cache, regras de regime, montagem de arrays de exibição e escrita de estado. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php`

Observação estrutural: existem **três eixos de granularidade** para notas e faltas — por aluno, por componente curricular e por etapa — e cada combinação tem sua própria entidade de lançamento. 🟢 `ieducar/modules/Avaliacao/Model/`

---

## Responsabilidades

- Manter a regra de avaliação da rede, com tipo de nota, tipo de progressão, tipo de presença, média de aprovação, média de recuperação, porcentagem de presença, fórmula de média, fórmula de recuperação e tabelas de arredondamento. 🟢 `app/Models/LegacyEvaluationRule.php:55-65`
- Vincular a regra de avaliação à série e ao ano letivo, com a regra padrão e a diferenciada. 🟢 `app/Models/LegacyEvaluationRuleGradeYear.php:10-24`
- Manter as regras de recuperação paralela, com o tipo e o modo de cálculo. 🟢 `app/Models/LegacyEvaluationRule.php:64` e `:110-124`
- Lançar a nota por componente e por etapa, com a nota original, a arredondada, a de recuperação e a de recuperação específica. 🟢 `app/Models/LegacyDisciplineScore.php:12-24`
- Lançar a nota geral por etapa, sem componente. 🟢 `app/Models/LegacyGeneralScore.php:11-18`
- Lançar a nota de exame final, por matrícula e por componente. 🟢 `app/Models/LegacyScoreExam.php:11-20`
- Lançar a falta por aluno, por componente e geral, com a quantidade apurada. 🟢 `ieducar/modules/Avaliacao/Model/FaltaAluno.php` e `FaltaComponente.php` e `FaltaGeral.php`
- Lançar o parecer descritivo por aluno, por componente e geral. 🟢 `ieducar/modules/Avaliacao/Model/ParecerDescritivoAluno.php` e `ParecerDescritivoComponente.php`
- Manter a média por componente e por etapa, com a média arredondada, a situação e a trava de edição. 🟢 `app/Models/LegacyDisciplineScoreAverage.php:12-21`
- Calcular a média do componente, a média geral e a situação do estudante. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:110` e `:129` e `:829`
- Calcular a situação por nota e por falta, combinando as duas. 🟢 `Boletim.php:625` e `:936` e `:1214`
- Arredondar a nota e a média conforme a tabela de arredondamento da regra. 🟢 `Boletim.php:2272` e `:2335`
- Calcular a recuperação paralela por média entre a nota e a recuperação, por soma ou pelo maior valor. 🟢 `app/Services/StageScoreCalculationService.php:4-30`
- Prever a nota de recuperação do componente. 🟢 `Boletim.php:2374`
- Alterar a situação da matrícula a partir da apuração. 🟢 `Boletim.php:2904`
- Promover o estudante, criando a matrícula do ano seguinte. 🟢 `Boletim.php:2715`

---

## Regras de Negócio

- A regra de avaliação pertence à instituição, e é aplicada à série por ano letivo, com uma regra padrão e uma regra diferenciada. 🟢 `app/Models/LegacyEvaluationRule.php:56-57` e `app/Models/LegacyEvaluationRuleGradeYear.php:13-16`
- A regra de avaliação é lida de cache por cinco minutos, indexada pelo identificador da regra. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3377-3386`
- A recuperação paralela admite três tipos: nenhuma, por etapa e em etapa específica. 🟢 `app/Models/LegacyEvaluationRule.php:31-35`
- A recuperação por etapa admite três modos de cálculo: substituir a nota, tirar a média e somar as notas. 🟢 `LegacyEvaluationRule.php:37-41`
- A média entre a nota e a recuperação é a média aritmética das duas, e o resultado passa pela regra de maior valor. 🟢 `app/Services/StageScoreCalculationService.php:5-11`
- A soma de notas devolve a soma quando há recuperação e o dobro da nota quando não há. 🟢 `StageScoreCalculationService.php:13-20`
- A recuperação por maior valor devolve o maior entre a nota e a recuperação. 🟢 `StageScoreCalculationService.php:22-29`
- A nota de exame final, identificada pela etapa `Rc`, nunca sofre recuperação paralela. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3394-3398`
- A recuperação em etapa específica mantém a nota original, sem aplicar a recuperação paralela. 🟢 `Boletim.php:3402-3404`
- A média de aprovação e a média de recuperação são parâmetros da regra, e a aprovação pela frequência após exame só é possível quando há fórmula de recuperação. 🟢 `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:110-113` e `:151-169`
- A aprovação por média geral de todas as disciplinas é uma opção da regra. 🟢 `RegraAvaliacao.php:298-301`
- A reprovação automática após dependências é opcional e tem quantidade máxima de disciplinas. 🟢 `RegraAvaliacao.php:121-135`
- A quantidade de disciplinas que podem entrar em dependência é um parâmetro da regra. 🟢 `RegraAvaliacao.php:183-186`
- A porcentagem de presença exigida é um parâmetro da regra. 🟢 `RegraAvaliacao.php:193-196`
- A regra pode determinar que o lançamento de frequência seja desconsiderado na aprovação e na reprovação. 🟢 `RegraAvaliacao.php:309-312`
- A regra pode determinar a nota geral por etapa, sem componente curricular. 🟢 `RegraAvaliacao.php:141-144`
- A regra pode determinar o parecer descritivo, e o parecer por etapa e por componente é uma das modalidades. 🟢 `app/Models/LegacyEvaluationRule.php:131-134` e `ieducar/modules/Avaliacao/Views/NotaController.php:96-98`
- A regra pode determinar o tipo de presença, e a presença por componente habilita o lançamento de falta junto com a nota. 🟢 `NotaController.php:99-102` e `:117-125`
- A nota é arredondada conforme a tabela de arredondamento da regra, e o conceito pode ter tabela própria. 🟢 `Boletim.php:2272` e `:2324` e `:2335`
- As casas decimais de armazenamento da nota são definidas pela regra. 🟢 `RegraAvaliacao.php:244-248`
- A nota máxima possível do exame final é definida pela regra. 🟢 `RegraAvaliacao.php:233-238`
- O regime cíclico é uma modalidade de progressão da regra, e nele a carga horária apurada é a soma das cargas horárias de todas as matrículas do ciclo. 🟢 `RegraAvaliacao.php:319-322` e `Boletim.php:3471-3487`
- A carga horária da apuração é a da série, exceto no regime cíclico, em que é a soma do ciclo. 🟢 `Boletim.php:3471-3487`
- A aprovação com dependência é recusada quando a série é concluinte e a instituição reprova dependência em ano concluinte, quando o estudante já tem dependência, quando a nova situação não é reprovado, quando a regra não admite dependência, ou quando as disciplinas reprovadas excedem o limite. 🟢 `Boletim.php:3427-3468`
- A promoção cria a matrícula do ano seguinte, com a série de destino apurada pela sequência de séries. 🟢 `Boletim.php:2715`
- A situação do estudante é apurada a partir da combinação da situação por nota e da situação por falta. 🟢 `Boletim.php:625` e `:829`
- A exibição da situação de um componente depende de ele ser componente avaliável no contexto. 🟢 `Boletim.php:1472`
- A nota é armazenada em três campos: original, arredondada e de recuperação, mais a recuperação específica. 🟢 `app/Models/LegacyDisciplineScore.php:12-21`
- A média por componente é armazenada por etapa, com a situação e a trava de edição. 🟢 `app/Models/LegacyDisciplineScoreAverage.php:12-19`
- O lançamento de nota exige a permissão de processo 642 e o nível de acesso somente escola. 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:11-12`
- O lançamento de falta exige a permissão de processo 642 e o nível de acesso somente escola. 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:11-13`
- A etapa de lançamento é determinada pela quantidade de notas já lançadas para o componente, quando a etapa não é informada. 🟢 `NotaController.php:51-61`
- O parecer descritivo só é gravado quando o texto é não vazio e a regra admite parecer por etapa e por componente. 🟢 `NotaController.php:126-135`
- A exclusão de nota, de falta e de parecer é verify-before-act sobre as etapas anteriores. 🟢 `Boletim.php:3104` e `:3124` e `:3137` e `:3171` e `:3285`
- A falta é lançada com quantidade não negativa, e a ausência do campo resulta em zero. 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:146-165`
- Não existe, no legado, trilha de auditoria de lançamento: a alteração de nota sobrescreve a anterior sem preservar o valor anterior nem a justificativa. 🔴
- Não existe, no legado, justificativa obrigatória para o lançamento de nota, de falta ou de parecer. 🔴
- Não existe, no legado, notificação de alerta precoce por média em queda ou por excesso de faltas. 🔴
- Não existe, no legado, diary offline-first: todo lançamento depende de conexão e é síncrono. 🔴
- As fórmulas de média são interpretadas em tempo de execução, com risco de desempenho e de segurança. 🟢 `ieducar/modules/RegraAvaliacao/Model/Regra.php` e `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve manter a regra de avaliação da rede, com tipo de nota, de progressão e de presença, médias, fórmulas e tabelas de arredondamento. | Must | Dado uma regra, quando consultada, então todos os parâmetros são devolvidos e a regra é aplicável à série e ao ano. |
| RF-02 | O sistema deve permitir duas regras por série e por ano, uma padrão e outra diferenciada. | Must | Dado uma série com regra padrão e diferenciada, quando consultada, então as duas regras são devolvidas. |
| RF-03 | O sistema deve lançar a nota por componente e por etapa, com nota original, arredondada e de recuperação. | Must | Dado um lançamento, quando for salvo, então os campos de nota original, arredondada e de recuperação ficam gravados. |
| RF-04 | O sistema deve lançar a nota geral por etapa, sem componente curricular. | Must | Dado uma regra de nota geral por etapa, quando a nota for lançada, então ela fica registrada sem componente. |
| RF-05 | O sistema deve lançar a nota de exame final, por matrícula e por componente. | Must | Dado um exame final, quando for lançado, então a nota fica vinculada à matrícula e ao componente. |
| RF-06 | O sistema deve lançar a falta por aluno, por componente e geral, conforme o tipo de presença da regra. | Must | Dado uma regra de presença por componente, quando a nota for lançada com falta, então a falta é gravada junto. |
| RF-07 | O sistema deve lançar o parecer descritivo por aluno, por componente e geral, conforme a regra. | Must | Dado uma regra de parecer por etapa e por componente, quando o parecer for lançado, então ele é gravado. |
| RF-08 | O sistema deve calcular a média do componente, a média geral e a situação do estudante. | Must | Dado um conjunto de notas lançadas, quando a apuração for feita, então a média e a situação são apuradas. |
| RF-09 | O sistema deve arredondar a nota e a média conforme a tabela de arredondamento da regra. | Must | Dado uma nota de 7,4 e uma tabela que arredonda para 7,5, quando a nota for arredondada, então o valor armazenado é o da tabela. |
| RF-10 | O sistema deve aplicar a recuperação paralela conforme o tipo e o modo de cálculo da regra. | Must | Dado uma regra de soma de notas, quando a recuperação for calculada, então o resultado é a soma das duas. |
| RF-11 | O sistema deve manter a nota original quando a recuperação for em etapa específica. | Must | Dado uma regra de recuperação em etapa específica, quando a recuperação for aplicada, então a nota original é preservada. |
| RF-12 | O sistema deve não aplicar recuperação paralela à nota de exame final. | Must | Dado um lançamento de exame final, quando a recuperação for avaliada, então a nota permanece a original. |
| RF-13 | O sistema deve apurar a situação por nota e a situação por falta, e combiná-las na situação do estudante. | Must | Dado um estudante com média suficiente e frequência insuficiente, quando a apuração for feita, então a situação final é a reprovação por falta. |
| RF-14 | O sistema deve exigir a frequência mínima definida pela regra. | Must | Dado um estudante abaixo da porcentagem de presença exigida, quando a apuração for feita, então a situação é afetada. |
| RF-15 | O sistema deve permitir que o lançamento de frequência seja desconsiderado na apuração, conforme a regra. | Must | Dado uma regra que desconsidera a frequência, quando a apuração for feita, então a falta não interfere na situação. |
| RF-16 | O sistema deve aprovar com dependência quando as disciplinas reprovadas não excederem o limite da regra. | Must | Dado um limite de duas dependências e uma disciplina reprovada, quando a promoção for avaliada, então a aprovação com dependência é permitida. |
| RF-17 | O sistema deve recusar a aprovação com dependência em série concluinte quando a instituição assim o determinar. | Must | Dado uma série concluinte e a instituição com reprovação em ano concluinte, quando a aprovação com dependência for avaliada, então ela é recusada. |
| RF-18 | O sistema deve apurar a carga horária do regime cíclico como a soma das cargas horárias do ciclo. | Must | Dado um ciclo de três séries, quando a carga horária for apurada, então o resultado é a soma das três. |
| RF-19 | O sistema deve promover o estudante, criando a matrícula do ano seguinte na série de destino. | Must | Dado um estudante aprovado, quando a promoção for executada, então a matrícula do ano seguinte é criada. |
| RF-20 | O sistema deve alterar a situação da matrícula a partir da apuração, propagando o efeito às enturmações e à nota. | Must | Dado uma apuração com reprovação, quando a situação for alterada, então a matrícula é atualizada e as enturmações são marcadas. |
| RF-21 | O sistema deve determinar a etapa de lançamento a partir das notas já lançadas do componente. | Must | Dado um componente com duas notas lançadas, quando a etapa for omitida, então a próxima etapa proposta é a terceira. |
| RF-22 | O sistema deve exigir a permissão de processo 642 e o nível de acesso de escola para lançar notas e faltas. | Must | Dado um usuário sem a permissão, quando a tela de lançamento for acessada, então o acesso é negado. |
| RF-23 | O sistema deve impedir a exclusão de nota, de falta e de parecer quando há lançamentos em etapas anteriores. | Must | Dado um lançamento em etapa anterior, quando a exclusão for tentada, então a operação é recusada. |
| RF-24 | O sistema deve registrar a média por componente com a situação e a trava de edição. | Must | Dado uma média calculada, quando for consultada, então a situação e a trava de edição são devolvidas. |
| RF-25 | O sistema deve registrar a justificativa de cada lançamento, com o valor anterior e o novo valor. | Must | Dado um lançamento alterado, quando o log for consultado, então o valor anterior, o novo valor e a justificativa são devolvidos. |
| RF-26 | O sistema deve alertar o coordenador e a família quando o estudante atingir o limite de faltas ou ficar abaixo da média de corte. | Must | Dado um estudante com 15% de faltas, quando a apuração for feita, então o alerta é emitido. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | O lançamento de nota e de falta exige a permissão de processo 642 e o nível de acesso somente escola. | `ieducar/modules/Avaliacao/Views/NotaController.php:11-12` e `FaltaController.php:11-13` | 🟢 |
| Integridade | A regra de avaliação é resolvida por série e por ano, com a regra diferenciada prevalecendo quando a escola a utiliza. | `app/Models/LegacySchoolClass.php:648-661` | 🟢 |
| Integridade | O lançamento de nota grava a nota original junto da arredondada e da de recuperação, o que preserva o valor bruto. | `app/Models/LegacyDisciplineScore.php:12-21` | 🟢 |
| Performance | A regra de avaliação é lida de cache por cinco minutos, indexada pelo identificador. | `ieducar/modules/Avaliacao/Service/Boletim.php:3381-3385` | 🟢 |
| Performance | O serviço de boletim concentra acesso a banco, cache e montagem de arrays de exibição em uma única classe de 3.541 linhas. | `ieducar/modules/Avaliacao/Service/Boletim.php` | 🟢 |
| Manutenibilidade | Coexistem a camada legada procedural e a camada Eloquent para os mesmos dados, o que gera consultas divergentes. | `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2 | 🟢 |
| Manutenibilidade | As fórmulas de média são interpretadas em tempo de execução, com risco de desempenho e de segurança. | `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2 | 🟢 |
| Integridade | A promoção é acionada por uma requisição sintética contra a API legada, com a exceção silenciada. | `app/Services/PromotionService.php:44-46` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em regras, notas, faltas e pareceres. | `database/migrations/legacy/2020_01_01_110000_create_modules_regra_avaliacao_table.php` | 🟡 |
| Observabilidade | A apuração expõe a situação por componente, a situação geral e a indicação de componente avaliável. | `ieducar/modules/Avaliacao/Service/Boletim.php:1472` e `:1541` e `:829` | 🟢 |
| Auditabilidade | Não há trilha de lançamento: a alteração de nota sobrescreve a anterior, sem valor anterior nem justificativa. | `ieducar/modules/Avaliacao/Service/Boletim.php:1830-1935` | 🔴 |
| Disponibilidade | Todo lançamento é síncrono e depende de conexão, sem alternativa offline. | ausência de evidência no código lido | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado uma regra de avaliação vinculada a uma série e a um ano letivo
Quando a regra for resolvida
Então a regra padrão é devolvida, ou a diferenciada quando a escola a utiliza

Dado uma nota de 7,4 e uma tabela de arredondamento que transforma 7,4 em 7,5
Quando a nota for salva
Então a nota arredondada vale 7,5 e a nota original vale 7,4

Dado uma regra de recuperação por soma de notas
Quando a recuperação for calculada para uma nota 6 e uma recuperação 8
Então o resultado é 14

Dado uma regra de recuperação por média entre nota e recuperação
Quando a recuperação for calculada para uma nota 6 e uma recuperação 8
Então o resultado é 7

Dado uma nota de exame final
Quando a recuperação paralela for avaliada
Então a nota permanece a original

Dado um estudante com média 8 e frequência de 50 por cento, e uma regra que exige 75 por cento de presença
Quando a apuração for feita
Então a situação final é reprovação por falta

Dado uma regra que desconsidera o lançamento de frequência
Quando a apuração for feita
Então a falta não interfere na situação

Dado um limite de duas dependências na regra e uma disciplina reprovada
Quando a aprovação com dependência for avaliada
Então ela é permitida

Dado uma série concluinte e uma instituição que reprova dependência em ano concluinte
Quando a aprovação com dependência for avaliada
Então ela é recusada

Dado um componente com duas notas lançadas
Quando o lançamento for aberto sem informar a etapa
Então a etapa proposta é a terceira

Dado um lançamento em etapa anterior
Quando a exclusão for tentada
Então a operação é recusada

Dado um estudante aprovado em um regime cíclico de três séries
Quando a carga horária for apurada
Então o resultado é a soma das cargas horárias das três séries
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Regra de avaliação por série e por ano | Must | Define toda a apuração e o boletim |
| Lançamento de nota por componente e por etapa | Must | Insumo primário do boletim |
| Lançamento de falta por componente e geral | Must | Insumo da apuração de presença |
| Cálculo da média e arredondamento | Must | Determina a aprovação |
| Apuração da situação do estudante | Must | Resultado que o conselho e o FUNDEB consomem |
| Recuperação paralela com seus modos | Must | Regra pedagógica essencial |
| Nota de exame final | Must | Parte do regime de progressão |
| Promoção com a série de destino | Must | Fim do ano letivo |
| Aprovação com dependência com o limite da regra | Must | Regra pedagógica essencial |
| Parecer descritivo por etapa e por componente | Must | Exigência legal do boletim |
| Verificação de lançamentos em etapas anteriores | Must | Impede a reescrita do histórico |
| Carga horária do regime cíclico | Should | Existe no legado e é usada em redes de ciclo |
| Nota geral por etapa | Should | Existe no legado e é usada por rede |
| Trilha de auditoria dos lançamentos | Should | Ausente no legado e previsto no modelo novo |
| Alerta precoce por média e por frequência | Could | Ausente no legado e previsto no modelo novo |
| Diário offline-first com sincronização idempotente | Could | Ausente no legado e previsto no modelo novo |
| Motor de cálculo funcional sem acesso a banco | Could | Redesenho do motor, previsto no modelo novo |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/Avaliacao/Service/Boletim.php` | Motor de apuração, com 3.541 linhas | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php` | Acesso à regra de avaliação e seus parâmetros | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/Avaliacao.php` | Cálculo das médias e das situações | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/Acessores.php` | Acessores das estruturas em memória do boletim | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/Validators.php` | Registro dos validadores do boletim | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/FaltaAluno.php` | Lançamento de falta por aluno | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/NotaAluno.php` | Lançamento de nota por aluno | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/ParecerDescritivoAluno.php` | Lançamento de parecer por aluno | 🟢 |
| `ieducar/modules/Avaliacao/Views/NotaController.php` | Tela de lançamento de nota | 🟢 |
| `ieducar/modules/Avaliacao/Views/FaltaController.php` | Tela de lançamento de falta | 🟢 |
| `ieducar/modules/Avaliacao/Views/ParecerController.php` | Tela de lançamento de parecer | 🟢 |
| `ieducar/modules/Avaliacao/Views/PromocaoApiController.php` | API de promoção, com 566 linhas | 🟢 |
| `ieducar/modules/Avaliacao/Views/DiarioApiController.php` | API do diário de classe, com 1.989 linhas | 🟡 |
| `app/Models/LegacyEvaluationRule.php` | Entidade da regra de avaliação | 🟢 |
| `app/Models/LegacyEvaluationRuleGradeYear.php` | Vínculo de regra, série e ano letivo | 🟢 |
| `app/Models/LegacyDisciplineScore.php` | Nota por componente e por etapa | 🟢 |
| `app/Models/LegacyGeneralScore.php` | Nota geral por etapa | 🟢 |
| `app/Models/LegacyScoreExam.php` | Nota de exame final | 🟢 |
| `app/Models/LegacyDisciplineScoreAverage.php` | Média por componente, com situação e trava | 🟢 |
| `app/Models/LegacyStudentScore.php` | Agregador de notas do estudante | 🟢 |
| `app/Models/LegacyRegistrationScore.php` | Agregador de notas da matrícula | 🟢 |
| `app/Models/LegacyRoundingTable.php` | Tabela de arredondamento | 🟢 |
| `app/Models/LegacyValueRoundingTable.php` | Valor da tabela de arredondamento | 🟢 |
| `app/Models/LegacyAverageFormula.php` | Fórmula de média e de recuperação | 🟢 |
| `app/Models/LegacyRemedialRule.php` | Regra de recuperação paralela | 🟢 |
| `app/Services/StageScoreCalculationService.php` | Cálculo da recuperação paralela por etapa | 🟢 |
| `app/Services/PromotionService.php` | Disparo da promoção | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/Regra.php` | Modelo legado da regra de avaliação | 🟢 |
| `ieducar/modules/Avaliacao/Model/` | Entidades de lançamento por eixo de granularidade | 🟢 |
| `app/Models/LegacySchoolClass.php` | Resolução da regra de avaliação da turma | 🟢 |
| `app/Http/Controllers/Api/Resource/EvaluationRule/ResourceEvaluationRuleController.php` | Recurso simples de regra de avaliação | 🟢 |
| `_reversa_sdd/Avaliacao/legacy-mapping.md` | Desenho do motor de avaliação do SYSGOV | 🟢 |
