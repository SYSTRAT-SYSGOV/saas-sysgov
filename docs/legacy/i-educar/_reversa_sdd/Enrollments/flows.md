# Enrollments (i-Educar legado), Fluxos

> Fluxos da unit de matrículas e enturmações que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de enturmação individual

**Gatilho:** a secretaria escolar abre a tela de enturmação de uma matrícula em uma turma.

1. A tela verifica se já existe enturmação ativa na turma e, conforme o caso, exige a permissão de desenturmar ou a de enturmar. 🟢 `app/Http/Controllers/EnrollmentController.php:34-45`
2. A tela lista as enturmações ativas da matrícula e as enturmações em outras turmas. 🟢 `EnrollmentController.php:34` e `:49`
3. O usuário informa a data de enturmação e confirma. 🟢 `EnrollmentController.php:82`
4. O serviço valida a vaga, os limites do ano letivo, a ordem cronológica, o conflito de horário e a duplicidade na turma. 🟢 `app/Services/EnrollmentService.php:193-232`
5. O serviço de sequenciamento calcula a posição de chamada e desloca os sequenciais posteriores da turma. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:42-80`
6. A enturmação é gravada com sequencial, sequencial de fechamento, usuário de cadastro e data de entrada. 🟢 `EnrollmentService.php:235-243`
7. O usuário é redirecionado ao detalhe da matrícula, com a mensagem de sucesso. 🟢 `EnrollmentController.php:99-100`

---

## 2. Fluxo de remanejamento entre turmas

**Gatilho:** a secretaria escolar remaneja o estudante para outra turma.

1. A tela exige a permissão de remanejar e mostra as enturmações ativas e as enturmações em outras turmas. 🟢 `EnrollmentController.php:123-138`
2. O remanejamento exige a indicação da enturmação de origem, e a ausência dessa indicação interrompe a operação antes de qualquer alteração. 🟢 `EnrollmentController.php:159-163`
3. A enturmação de origem é cancelada, com a data informada e as validações de ano letivo. 🟢 `EnrollmentController.php:168-170`
4. A enturmação anterior é marcada como remanejada, e a turma de origem é reordenada conforme a data base de remanejamento. 🟢 `EnrollmentController.php:181-184`
5. Uma nova enturmação é criada na turma de destino, com o cálculo de sequencial. 🟢 `EnrollmentController.php:186-187`
6. A matrícula não é alterada: permanece ativa e é ela que conserva as notas e faltas. 🟢 `EnrollmentController.php:168-187`
7. Toda a operação roda dentro de transação, com rollback em caso de falha. 🟢 `EnrollmentController.php:156-197`

---

## 3. Fluxo de remanejamento para a mesma turma

**Gatilho:** a secretaria escolar reenturma o estudante na mesma turma.

1. O fluxo é idêntico ao remanejamento, exceto pela detecção de que a turma de destino é a mesma da origem. 🟢 `EnrollmentController.php:174-175`
2. A enturmação anterior recebe o marcador de remanejamento na mesma turma, e não o marcador de remanejamento. 🟢 `EnrollmentController.php:175-178`
3. A turma de origem não é reordenada, porque a turma não muda. 🟢 `EnrollmentController.php:181-184`
4. A nova enturmação é criada com a marcação de mesma turma, o que reduz o sequencial de fechamento anterior e desloca os posteriores. 🟢 `app/Services/EnrollmentService.php:242` e `SequencialEnturmacao.php:45-49`

---

## 4. Fluxo de enturmação em lote

**Gatilho:** a secretaria escolar abre a tela de enturmação em lote de uma turma.

1. A tela lista as matrículas elegíveis, que são as da escola, do ano, da série da turma ou das séries vinculadas em turma multisseriada, ativas, última matrícula e com situação aprovada, retida ou cursando, sem enturmação ativa na escola. 🟢 `app/Services/RegistrationService.php:47-79`
2. A listagem é ordenada pelo nome do estudante. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:133-135`
3. O usuário informa a data e seleciona as matrículas. 🟢 `BatchEnrollmentController.php:149-150`
4. Cada matrícula é processada em bloco próprio, e o resultado é registrado como sucesso ou falha indexado pelo identificador da matrícula. 🟢 `BatchEnrollmentController.php:157-166`
5. A matrícula que falhou por enturmação existente é devolvida à listagem, para nova tentativa. 🟢 `BatchEnrollmentController.php:161-163`
6. A sessão recebe a mensagem agregada de sucesso e a de erro. 🟢 `BatchEnrollmentController.php:311-333`
7. As matrículas já enturmadas permanecem gravadas; a falha individual não desfaz o lote. 🟢 `BatchEnrollmentController.php:157-166`

---

## 5. Fluxo de cancelamento de matrícula em lote

**Gatilho:** a secretaria escolar cancela matrículas de uma turma.

1. A tela lista as enturmações ativas da turma cuja matrícula é cancelável, e a autorização de acesso à turma é verificada para usuário de nível escola. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:208-214` e `:275-288`
2. No envio, o conjunto de matrículas é filtrado novamente pela listagem da turma, de modo que um identificador alheio não alcance outra turma. 🟢 `BatchEnrollmentController.php:236-243`
3. Cada matrícula é cancelada dentro de transação própria, com desativação das enturmações, reflagra da última matrícula da série de origem e reativação da solicitação de transferência. 🟢 `app/Services/RegistrationService.php:305-326`
4. A reordenação dos sequenciais é adiada e executada uma única vez por turma, ao final. 🟢 `BatchEnrollmentController.php:258-262`
5. A tela é redesenhada com as matrículas que foram canceladas, ainda visíveis, e com o resultado individual. 🟢 `BatchEnrollmentController.php:233-235` e `:264-269`

---

## 6. Fluxo de alteração da situação da matrícula

**Gatilho:** a secretaria escolar altera a situação de uma matrícula.

1. A API exige a matrícula e a nova situação. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:670`
2. As enturmações da matrícula são listadas. 🟢 `MatriculaController.php:679-680`
3. Para transferido, abandono ou falecido, todas as enturmações são encerradas e marcadas conforme a situação, e a situação da nota do aluno é atualizada. 🟢 `MatriculaController.php:682-721`
4. Para aprovado, cursando, retido, aprovado com dependência, aprovado pelo conselho ou reprovado por faltas, a enturmação de maior sequencial é reativada, os marcadores são limpos e a data de cancelamento da matrícula é anulada. 🟢 `MatriculaController.php:722-744`
5. A situação é gravada na matrícula. 🟢 `MatriculaController.php:746-748`
6. Quando a situação é a de falecido, o marcador é propagado para a pessoa física do aluno, e revertido se nenhuma outra matrícula do aluno estiver com a mesma situação. 🟢 `MatriculaController.php:749` e `:756-794`

---

## 7. Fluxo de desfeito do abandono

**Gatilho:** a secretaria escolar precisa desfazer um registro de abandono.

1. A permissão de exclusão de abandono é verificada. 🟢 `MatriculaController.php:522`
2. A matrícula volta para a situação de cursando, o motivo de abandono é limpo e a data de exclusão é anulada. 🟢 `MatriculaController.php:527-532`
3. A enturmação de maior sequencial da matrícula é reativada, com os marcadores de encerramento limpos. 🟢 `MatriculaController.php:534-552`
4. A promoção é refeita por chamada interna à API de promoção. 🟢 `MatriculaController.php:554-572`
5. O registro de busca ativa que apontava abandono volta para o estado em andamento, com a data de fim limpa. 🟢 `MatriculaController.php:574-581`

---

## 8. Fluxo de desfeito da reclassificação e da saída da escola

**Gatilho:** a secretaria escolar precisa desfazer uma reclassificação ou uma saída de escola.

1. No desfeito da reclassificação, todas as enturmações da matrícula são reativadas, o marcador de reclassificação é limpo e a matrícula volta para cursando. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:587-601`
2. O desfeito devolve o identificador do aluno, para que a interface retorne à ficha do estudante. 🟢 `MatriculaController.php:602`
3. No desfeito da saída da escola, o indicador de saída e a observação da matrícula são limpos. 🟢 `MatriculaController.php:506-518`

---

## 9. Fluxo de cancelamento de matrícula individual

**Gatilho:** a secretaria escolar cancela uma matrícula pela tela de cadastro.

1. A matrícula já cancelada é recusada. 🟢 `app/Services/RegistrationService.php:307-309`
2. As enturmações ativas são desativadas, sem a validação de ano letivo, para permitir o cancelamento de matrículas de anos anteriores. 🟢 `RegistrationService.php:368-387`
3. A matrícula anterior da série de origem é reflagada como última matrícula, quando a série está em uma sequência. 🟢 `RegistrationService.php:419-441`
4. A solicitação de transferência é reativada, quando o aluno tem outra matrícula ativa transferida. 🟢 `RegistrationService.php:395-413`
5. A matrícula é desativada, a última matrícula é desmarcada e o usuário executor é registrado. 🟢 `RegistrationService.php:317-320`
6. Os sequenciais das turmas são reordenados. 🟢 `RegistrationService.php:322-324`

---

## 10. Fluxo de cálculo da posição de chamada

**Gatilho:** uma enturmação é criada ou reenturmada em uma turma.

1. Se o estudante já teve enturmação anterior na mesma turma, o sequencial de fechamento anterior é reduzido e os posteriores são deslocados em um. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:45-49`
2. Se a matrícula é de dependência, a posição é calculada entre as matrículas de dependência, com ordenação alfabética ou por data, e fica à frente das demais. 🟢 `SequencialEnturmacao.php:51-57` e `:141-226`
3. Se a enturmação é posterior à data de fechamento da instituição, à data base de transferência com matrícula transferida no ano, ou à data base de remanejamento, a posição é o maior sequencial mais um. 🟢 `SequencialEnturmacao.php:59-65` e `:299-336`
4. Se a enturmação é anterior à data base de remanejamento, a posição é calculada entre os alunos entrados antes dessa data, com ordenação alfabética. 🟢 `SequencialEnturmacao.php:67-72` e `:111-139`
5. Caso contrário, a posição é a ordem alfabética do nome, com comparação sem acento e em maiúsculas, e os sequenciais posteriores são deslocados. 🟢 `SequencialEnturmacao.php:74-78` e `:228-282`

---

## 11. Fluxo de verificação de conflito de horário

**Gatilho:** a enturmação é avaliada contra as demais enturmações do estudante.

1. Se a turma de destino não é de mediação presencial, ou está marcada como não informar no Censo, a verificação retorna disponibilidade imediatamente. 🟢 `app/Services/SchoolClass/AvailableTimeService.php:36-38`
2. São carregadas as turmas do mesmo ano, do mesmo ano letivo, com enturmação ativa do estudante em matrícula ativa, cursando e anterior à data limite, quando informada. 🟢 `AvailableTimeService.php:40-53`
3. Para cada turma candidata, a comparação verifica a exceção de AEE, a mediação presencial, a existência de dias da semana em ambas, a interseção de dias e a sobreposição do período de ano letivo. 🟢 `AvailableTimeService.php:102-144`
4. Se os períodos do ano letivo se sobrepõem, os horários são comparados, com o horário de turno parcial aplicado à turma integral quando a enturmação em curso é de manhã ou de tarde. 🟢 `AvailableTimeService.php:147-198`
5. A sobreposição é detectada quando o início de uma é anterior ou igual ao fim da outra e o fim é posterior ou igual ao início. 🟢 `AvailableTimeService.php:195-198`

---

## 12. Fluxo de manutenção dos dados de Censo da enturmação

**Gatilho:** a secretaria escolar abre a tela de dados do Censo da enturmação.

1. A tela informa se a turma permite carga horária integralizada. 🟢 `app/Http/Controllers/EnrollmentInepController.php:20`
2. A carga horária é gravada apenas quando a turma permite e o valor é numérico entre 0 e 9999. 🟢 `EnrollmentInepController.php:28-33`
3. A marcação de desconsiderar o Censo é gravada conforme a presença do campo na requisição. 🟢 `EnrollmentInepController.php:39`
4. A matrícula INEP é gravada apenas quando o valor informado é numérico. 🟢 `EnrollmentInepController.php:41-45`
5. O usuário é redirecionado ao histórico de enturmações. 🟢 `EnrollmentInepController.php:47`

---

## 13. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/Enrollments/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Verificação de capacidade máxima e de superlotação da turma. 🔴
- Bloqueio de enturmação por falta de vaga com contador de vagas persistido na turma. 🔴
- Portabilidade de notas, faltas e pareceres descritivos na transferência entre turmas ou escolas. 🔴
- Comparação das matrizes curriculares e abertura da tela de equivalência na adaptação curricular obrigatória. 🔴
- Linha do tempo da trajetória do estudante, com os eventos de matrícula, remanejamento e transferência. 🔴
- Rastreabilidade de quem executou cada transição de situação e cada operação de enturmação. 🔴
- Registro de auditoria das alterações de data de entrada e de data de saída. 🔴
