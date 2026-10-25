# Enrollments (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o módulo de matrículas e enturmações legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O módulo Enrollments do i-Educar administra o ciclo de vida escolar do estudante na rede municipal, articulado em dois registros distintos: a **matrícula** (`pmieducar.matricula`), que é o vínculo acadêmico do estudante com a escola no ano letivo e a série, com a sua situação final; e a **enturmação** (`pmieducar.matricula_turma`), que é a alocação do estudante em uma turma concreta, com data de entrada, data de saída e número de chamada. 🟢

Problema que resolve: controlar quem está matriculado, em qual série e em qual turma, em que período do ano letivo, e garantir que nenhuma matrícula fique em estado inconsistente quando o estudante é transferido, remanejado, reclassificado, abandona ou vem a falecer. 🟢

O módulo é exclusivamente responsável por: validar as regras de enturmação, numerar a chamada na ordem de fechamento, fechar e reabrir a matrícula conforme a situação, registrar a transferência com a sua solicitação, e expor a movimentação de enturmação para as telas de conferência e para o Censo Escolar. 🟢

Observação estrutural: o módulo opera sobre tabelas legadas PostgreSQL em base municipal única, com o núcleo de regra concentrado em `app/Services/EnrollmentService.php` e `app/Services/RegistrationService.php`, e com SQL de sequenciamento em `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php`, que ainda interpola identificadores diretamente na consulta. 🟢

---

## Responsabilidades

- Manter a matrícula do estudante, com escola, série, curso, ano letivo, data de matrícula, data de cancelamento, situação e indicação de última matrícula da série. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:19-49`
- Manter a enturmação do estudante na turma, com data de entrada, data de saída, sequencial, sequencial de fechamento, turno e marcadores de encerramento. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_table.php:13-41`
- Validar a enturmação contra vaga disponível, limites do ano letivo, ordem cronológica e conflito de horário. 🟢 `app/Services/EnrollmentService.php:187-246`
- Cancelar a enturmação, com validação de data e reordenação do sequencial da turma de origem. 🟢 `app/Services/EnrollmentService.php:131-177`
- Remanejar o estudante entre turmas, preservando a matrícula original. 🟢 `app/Http/Controllers/EnrollmentController.php:146-199`
- Atribuir o número de chamada da chamada na ordem de fechamento, respeitando a data base de remanejamento, a data de fechamento e a ordenação alfabética. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:42-80`
- Alterar a situação da matrícula entre as quinze situações do domínio, propagando o efeito para as enturmações e para a nota do aluno. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:668-754`
- Registrar a solicitação de transferência com tipo, data e observações. 🟢 `app/Services/RegistrationService.php:184-195`
- Cancelar a matrícula, desativando enturmações, reflagando a última matrícula da série de origem e reabilitando a transferência. 🟢 `app/Services/RegistrationService.php:305-326`
- Executar enturmação, desenturmação e cancelamento de matrícula em lote, com relatório de sucesso e de falha por aluno. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:99-270`
- Expor a movimentação de enturmação da rede, para conferência e para o Censo Escolar. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:364-495`
- Manter a carga horária integralizada e a matrícula INEP da enturmação, com a opção de desconsiderar o registro no Censo. 🟢 `app/Http/Controllers/EnrollmentInepController.php:25-46`

---

## Regras de Negócio

- A enturmação é recusada quando a turma não tem vaga e a rede está configurada para bloquear enturmações sem vagas. 🟢 `app/Services/EnrollmentService.php:193-195`
- A data de enturmação não pode ser anterior ao início do ano letivo da turma, salvo quando a instituição permite registro fora do ano letivo. 🟢 `app/Services/EnrollmentService.php:197-201`
- A data de enturmação não pode ser posterior ao fim do ano letivo da turma, sem exceção. 🟢 `app/Services/EnrollmentService.php:203-205`
- A data de enturmação não pode ser anterior à data de saída da última enturmação da matrícula, o que impede retorno a uma turma já deixada em data posterior. 🟢 `app/Services/EnrollmentService.php:207-213`
- A data de enturmação não pode ser anterior à data de matrícula. 🟢 `app/Services/EnrollmentService.php:215-217`
- Quando a instituição exige os campos obrigatórios do Censo, a enturmação é recusada quando existe outra enturmação ativa com horário sobreposto. 🟢 `app/Services/EnrollmentService.php:219-223`
- A enturmação é recusada quando já existe enturmação ativa do mesmo estudante na mesma turma. 🟢 `app/Services/EnrollmentService.php:225-232`
- O sequencial de chamada é o maior sequencial da matrícula mais um, e o sequencial de fechamento é calculado pelo serviço de sequenciamento. 🟢 `app/Services/EnrollmentService.php:235-243`
- A enturmação registra o usuário que a criou e a data de cadastro. 🟢 `app/Services/EnrollmentService.php:239-240`
- O cancelamento da enturmação grava a data de exclusão, desativa a enturmação e registra o usuário executor. 🟢 `app/Services/EnrollmentService.php:156-159`
- O cancelamento da enturmação é recusado quando a data é anterior ao início do ano letivo e a instituição não permite registro fora do ano letivo, ou quando a data é posterior ao fim do ano letivo. 🟢 `app/Services/EnrollmentService.php:135-143`
- O cancelamento da enturmação é recusado quando a data é anterior à data de entrada da enturmação ou anterior à data de matrícula. 🟢 `app/Services/EnrollmentService.php:145-151`
- A reordenação do sequencial de fechamento da turma de origem só ocorre quando a instituição não tem data base de remanejamento ou quando a data de saída é anterior a essa data base. 🟢 `app/Services/EnrollmentService.php:161-167`
- A reordenação da turma renumera as enturmações válidas a partir de 1 e atribui 9999 à enturmação que saiu. 🟢 `app/Services/EnrollmentService.php:374-392`
- O remanejamento exige a indicação da enturmação de origem, e a ausência dessa indicação impede a operação. 🟢 `app/Http/Controllers/EnrollmentController.php:159-163`
- No remanejamento para a mesma turma, a enturmação anterior é marcada como remanejada na mesma turma, em vez de remanejada. 🟢 `EnrollmentController.php:172-178`
- No remanejamento para turma diferente, a enturmação anterior é marcada como remanejada e a turma de origem é reordenada conforme a data base. 🟢 `EnrollmentController.php:181-184`
- O remanejamento não altera a matrícula: a enturmação antiga é cancelada e uma nova é criada na turma de destino. 🟢 `EnrollmentController.php:168-187`
- A enturmação aceita turno próprio, registrado em `turno_id`, que prevalece sobre o turno da turma. 🟢 `app/Models/Builders/LegacyEnrollmentBuilder.php:85-94`
- O conflito de horário não se aplica a turmas cuja mediação didático-pedagógica não é presencial, nem a turmas marcadas como não informar no Censo. 🟢 `app/Services/SchoolClass/AvailableTimeService.php:36-38`
- O conflito de horário é ignorado quando uma das turmas é de escolarização e a outra é de atendimento educacional especializado. 🟢 `AvailableTimeService.php:102-111` e `:207-225`
- O conflito de horário exige interseção de dias da semana, período de ano letivo sobreposto e sobreposição de horários. 🟢 `AvailableTimeService.php:113-144`
- Na comparação de horários de turma integral, o período de referência é o turno da enturmação em curso, com os horários matutinos ou vespertinos correspondentes. 🟢 `AvailableTimeService.php:147-193`
- O turno parcial de manhã ou de tarde só é considerado quando a turma de destino é integral e a enturmação é parcial. 🟢 `AvailableTimeService.php:155-172`
- A ordem de fechamento do novo aluno é alfabética pelo nome, com comparação sem acento e em maiúsculas. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:228-267`
- O novo aluno é enturmado ao final da lista quando a data de enturmação é posterior à data de fechamento da instituição, posterior à data base de transferência com matrícula transferida no ano, ou posterior à data base de remanejamento. 🟢 `SequencialEnturmacao.php:299-336`
- O novo aluno é colocado antes da data base de remanejamento quando a enturmação ocorre antes dessa data, com ordenação alfabética. 🟢 `SequencialEnturmacao.php:67-79` e `:111-139`
- A matrícula de dependência recebe sequencial próprio, antes dos demais, e os sequenciais posteriores são deslocados. 🟢 `SequencialEnturmacao.php:51-57` e `:141-226`
- A reenturmação na mesma turma reduz o sequencial de fechamento anterior e desloca os posteriores em um. 🟢 `SequencialEnturmacao.php:45-49` e `:284-296`
- A data base de remanejamento é anual: o dia e o mês vêm da data de enturmação e o ano é o da enturmação, com ajuste para 29 de fevereiro em ano bissexto. 🟢 `app/Services/RelocationDate/RelocationDateService.php:16-35`
- A situação da matrícula é uma das quinze do domínio: aprovado, retido, cursando, transferido, reclassificado, deixou de frequentar, em exame, aprovado após exame, aprovado sem exame, pré-matrícula, aprovado com dependência, aprovado pelo conselho, reprovado por faltas e falecido. 🟢 `app/Models/RegistrationStatus.php:8-60`
- As situações inativas são apenas abandonada, transferida e falecida. 🟢 `app/Models/RegistrationStatus.php:64-71`
- São consideradas finais as situações de aprovado, retido, aprovado após exame, aprovado com dependência, aprovado pelo conselho e reprovado por faltas. 🟢 `ieducar/lib/App_Model/MatriculaSituacao.php:66-76`
- A passagem para transferido, abandono ou falecido encerra as enturmações ativas e atualiza a situação da nota do aluno. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:682-721`
- A passagem para aprovado, cursando, retido, aprovado com dependência, aprovado pelo conselho ou reprovado por faltas reativa a enturmação de maior sequencial e limpa a data de cancelamento. 🟢 `MatriculaController.php:722-744`
- A situação da matrícula bloqueia a troca quando o campo `bloquear_troca_de_situacao` está marcado. 🟢 `app/Models/LegacyRegistration.php:109-112`
- A situação de falecimento propaga para a pessoa física quando alguma matrícula do aluno está com a situação de falecido, e é revertida quando nenhuma está. 🟢 `MatriculaController.php:756-794`
- O desfazimento do abandono devolve a matrícula para cursando, limpa a data de exclusão, reativa a enturmação de maior sequencial, refaz a promoção e devolve a busca ativa ao estado em andamento. 🟢 `MatriculaController.php:520-585`
- O desfazimento da reclassificação reativa todas as enturmações da matrícula e devolve a matrícula para cursando. 🟢 `MatriculaController.php:587-603`
- O desfazimento da saída da escola limpa o indicador de saída e a observação da matrícula. 🟢 `MatriculaController.php:506-518`
- A alteração da data de entrada da matrícula exige data válida e grava a data convertida. 🟢 `MatriculaController.php:605-636`
- A alteração da data de saída atualiza a data de cancelamento da matrícula e a data de exclusão da última enturmação, dentro de transação, e é validada pela regra de alteração de data de saída. 🟢 `MatriculaController.php:638-666` e `app/Services/EnrollmentService.php:425-442`
- A busca de matrículas não enturmadas para a enturmação em lote considera a série da turma ou, em turma multisseriada, todas as séries vinculadas à turma, e filtra por escola, ano, matrícula ativa, última matrícula e situação aprovada, retida ou cursando. 🟢 `app/Services/RegistrationService.php:47-79`
- A enturmação em lote processa cada matrícula individualmente e reporta sucesso ou falha por aluno, sem reverter as já concluídas. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:143-174`
- O cancelamento em lote reordena os sequenciais uma única vez por turma, ao final, e não a cada matrícula cancelada. 🟢 `BatchEnrollmentController.php:258-262`
- O cancelamento em lote de matrícula restringe a operação às matrículas efetivamente listadas para a turma, impedindo o alcance de matrículas de outra turma. 🟢 `BatchEnrollmentController.php:236-243`
- O cancelamento em lote de matrícula exige as permissões de modificar matrículas e de remover cancelamento de matrícula, as mesmas do cancelamento individual. 🟢 `BatchEnrollmentController.php:296-306` e `routes/web.php:91-96`
- O cancelamento em lote de matrícula exige a autorização de acesso à turma para usuário de nível escola. 🟢 `BatchEnrollmentController.php:275-288`
- O cancelamento da matrícula desativa as enturmações, reflagra a última matrícula da série de origem, reativa a solicitação de transferência e desativa a matrícula. 🟢 `app/Services/RegistrationService.php:305-326`
- A desativação das enturmações no cancelamento da matrícula é feita sem a validação de ano letivo, para permitir o cancelamento de matrículas de anos anteriores. 🟢 `app/Services/RegistrationService.php:368-387`
- A reordenação em lote atribui 9999 às enturmações que saíram e renumera a última de cada turma. 🟢 `app/Services/RegistrationService.php:339-358`
- A carga horária integralizada só é gravada quando a turma a permite e o valor é numérico entre 0 e 9999. 🟢 `app/Http/Controllers/EnrollmentInepController.php:28-33`
- A matrícula INEP é gravada apenas quando o valor informado é numérico, e a Enturmação aceita a marcação de desconsideração do Censo. 🟢 `EnrollmentInepController.php:38-46`
- A movimentação de enturmação concatena as enturmações ativas e as excluídas, e ordena por instante de atualização. 🟢 `MatriculaController.php:390-470`
- A movimentação de enturmação sinaliza a apresentação fora da data quando a matrícula foi transferida ou remanejada após a data base da instituição. 🟢 `MatriculaController.php:400-409`
- A consulta de enturmações excluídas é separada da movimentação e filtra por escola e ano. 🟢 `MatriculaController.php:927-961`
- Não existe, no legado, verificação de lotação da turma além do bloqueio por vaga vazia, nem registro de capacidade máxima da turma na enturmação. 🔴
- Não existe, no legado, portabilidade de notas, faltas e pareceres entre turmas ou escolas na transferência; a transferência apenas encerra a matrícula e abre a solicitação. 🔴
- Não existe, no legado, equivalência curricular entre a turma de origem e a de destino, nem a adaptação curricular obrigatória descrita no desenho do modelo novo. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve manter a matrícula do estudante com escola, série, curso, ano letivo, data de matrícula, data de cancelamento, situação e indicação de última matrícula. | Must | Dado um estudante matriculado, quando a matrícula for salva, então escola, série, ano, data e situação ficam gravados e recuperáveis. |
| RF-02 | O sistema deve manter a enturmação com turma, data de entrada, data de saída, sequencial, sequencial de fechamento, turno e marcadores de encerramento. | Must | Dado uma enturmação criada, quando for consultada, então a turma, a data de entrada e o sequencial de fechamento ficam gravados. |
| RF-03 | O sistema deve recusar a enturmação quando a turma não tiver vaga e a rede bloquear enturmações sem vagas. | Must | Dado uma turma sem vaga e a configuração ativa, quando a enturmação for tentada, então a operação é recusada com mensagem de falta de vaga. |
| RF-04 | O sistema deve recusar a enturmação com data anterior ao início do ano letivo, salvo autorização expressa da instituição. | Must | Dado uma turma com início em 1 de março e uma data de enturmação em 20 de fevereiro, quando a enturmação for tentada, então a operação é recusada. |
| RF-05 | O sistema deve recusar a enturmação com data posterior ao fim do ano letivo da turma. | Must | Dado uma turma que termina em 30 de novembro, quando a enturmação for tentada com data em 5 de dezembro, então a operação é recusada. |
| RF-06 | O sistema deve recusar a enturmação com data anterior à data de matrícula ou anterior à data de saída da última enturmação. | Must | Dado um estudante cuja última enturmação saiu em 10 de abril, quando a enturmação for tentada com data em 1 de abril, então a operação é recusada. |
| RF-07 | O sistema deve recusar a enturmação duplicada na mesma turma. | Must | Dado um estudante já enturmado e ativo na turma, quando a enturmação for repetida, então a operação é recusada. |
| RF-08 | O sistema deve recusar a enturmação quando houver outra enturmação ativa com horário sobreposto, para os registros que exigem os campos obrigatórios do Censo. | Must | Dado um estudante enturmado em turma presencial das 8 às 12 horas, quando for enturmado em outra turma das 10 às 14 horas do mesmo ano, então a operação é recusada. |
| RF-09 | O sistema deve permitir a enturmação em turma de AEE quando já existir enturmação em turma curricular no mesmo horário. | Must | Dado um estudante enturmado em turma curricular das 8 às 12 horas, quando for enturmado em turma de AEE no mesmo horário, então a operação é permitida. |
| RF-10 | O sistema deve atribuir o número de chamada da enturmação na ordem alfabética do nome, sem acento e em maiúsculas. | Must | Dado um estudante cujo nome ordena depois dos demais da turma, quando for enturmado, então o sequencial de fechamento é o da posição alfabética. |
| RF-11 | O sistema deve enturmar ao final da lista quando a enturmação ocorrer após a data de fechamento da instituição ou após a data base de remanejamento. | Must | Dado um estudante enturmado após a data base de remanejamento, quando for enturmado, então recebe o maior sequencial mais um. |
| RF-12 | O sistema deve manter a ordem original do estudante quando a turma já foi fechada para o Censo Escolar. | Must | Dado um estudante cuja data de saída é posterior à data base de remanejamento, quando a enturmação for cancelada, então o sequencial dos demais não é reordenado. |
| RF-13 | O sistema deve cancelar a enturmação com validação de data contra o ano letivo e contra a data de entrada e de matrícula. | Must | Dado uma enturmação com entrada em 10 de março, quando o cancelamento for tentado com data em 1 de março, então a operação é recusada. |
| RF-14 | O sistema deve renumerar a turma de origem quando uma enturmação é cancelada antes da data base de remanejamento. | Must | Dado uma turma com três chamadas e um estudante que cancela, quando a enturmação for cancelada antes da data base, então as chamadas são renumeradas de forma contígua. |
| RF-15 | O sistema deve remanejar o estudante entre turmas preservando a matrícula original. | Must | Dado um estudante enturmado na turma A, quando for remanejado para a turma B, então a matrícula permanece ativa e há uma enturmação ativa na turma B. |
| RF-16 | O sistema deve registrar a remanejamento para a mesma turma com marcador próprio, distinto do remanejamento entre turmas. | Must | Dado um remanejamento para a mesma turma, quando a operação for concluída, então a enturmação anterior fica marcada como remanejada na mesma turma. |
| RF-17 | O sistema deve alterar a situação da matrícula entre as situações do domínio, propagando o efeito às enturmações ativas. | Must | Dado uma matrícula cursando com enturmação ativa, quando a situação for alterada para transferido, então a enturmação é encerrada e marcada como transferida. |
| RF-18 | O sistema deve reativar a enturmação ao voltar a matrícula para uma situação de continuidade. | Must | Dado uma matrícula transferida, quando a situação voltar para cursando, então a enturmação de maior sequencial é reativada e a data de cancelamento é limpa. |
| RF-19 | O sistema deve registrar a solicitação de transferência com tipo, data e observações ao passar a matrícula para transferido. | Must | Dado uma matrícula cursando, quando a situação for alterada para transferido com tipo e observações, então a solicitação de transferência é criada com o usuário executor. |
| RF-20 | O sistema deve permitir desfazer o abandono, a reclassificação e a saída da escola. | Must | Dado uma matrícula com abandono registrado, quando o desfeito for solicitado, então a matrícula volta para cursando, a enturmação é reativada e a busca ativa volta ao estado em andamento. |
| RF-21 | O sistema deve permitir alterar a data de entrada e a data de saída da matrícula, com validação de formato e transação. | Must | Dado uma data de saída inválida, quando a alteração for tentada, então a operação é recusada e a matrícula permanece inalterada. |
| RF-22 | O sistema deve enturmar e desenturmar em lote, com resultado individual por aluno. | Must | Dado cinco matrículas selecionadas e uma com vaga indisponível, quando a enturmação em lote for executada, então quatro são enturmadas e a quinta é reportada como falha. |
| RF-23 | O sistema deve cancelar matrículas em lote, reordenando os sequenciais uma única vez por turma. | Must | Dado três matrículas da mesma turma, quando o cancelamento em lote for executado, então a reordenação da turma ocorre uma única vez ao final. |
| RF-24 | O sistema deve impedir que o cancelamento em lote alcance matrículas de outra turma. | Must | Dado um payload com identificador de matrícula de outra turma, quando o cancelamento em lote for enviado, então a matrícula alheia não é cancelada. |
| RF-25 | O sistema deve exigir as permissões de enturmar, desenturmar, remanejar e cancelar matrícula, conforme a operação. | Must | Dado um usuário sem permissão de enturmar, quando a rota de enturmação for acessada, então a operação é negada com mensagem de permissão. |
| RF-26 | O sistema deve expor a movimentação de enturmação da rede, com enturmações ativas e excluídas, ordenadas por instante de atualização. | Must | Dado uma escola com enturmações no ano, quando a movimentação for consultada, então as linhas trazem matrícula, turma, sequencial, datas e turno. |
| RF-27 | O sistema deve sinalizar as enturmações apresentadas fora da data base de transferência ou de remanejamento. | Must | Dado um estudante transferido após a data base, quando a movimentação for consultada, então a linha vem marcada como fora da data. |
| RF-28 | O sistema deve manter a carga horária integralizada e a matrícula INEP da enturmação, com a opção de desconsiderar o registro no Censo. | Must | Dado uma turma que não permite carga integralizada, quando o valor for informado, então a carga é gravada como nula. |
| RF-29 | O sistema deve bloquear a troca de situação da matrícula quando a matrícula estiver travada para essa operação. | Must | Dado uma matrícula com troca de situação bloqueada, quando a operação for tentada, então a alteração é recusada. |
| RF-30 | O sistema deve manter a última matrícula da série de origem ao cancelar a matrícula destino, para preservar a continuidade do percurso do estudante. | Must | Dado um estudante com matrícula na série anterior e na atual, quando a matrícula atual for cancelada, então a matrícula anterior passa a ser a última da série. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A enturmação exige a permissão de processo 683, a desenturmação a 696 e o remanejamento a 695, verificadas tanto na tela quanto na rota. | `routes/web.php:46-56` e `app/Http/Controllers/EnrollmentController.php:36-45` | 🟢 |
| Segurança | O cancelamento em lote de matrícula exige a permissão de processo 578 e a de 627, as mesmas do cancelamento individual. | `routes/web.php:91-96` e `app/Http/Controllers/BatchEnrollmentController.php:296-306` | 🟢 |
| Segurança | O usuário de nível escola só opera turmas das próprias escolas nas operações em lote. | `app/Http/Controllers/BatchEnrollmentController.php:275-288` | 🟢 |
| Integridade | Enturmação e cancelamento são executados dentro de transação, com rollback em caso de exceção. | `app/Http/Controllers/EnrollmentController.php:81-106` e `app/Services/EnrollmentService.php:153-176` | 🟢 |
| Integridade | As enturmações são gravadas com usuário de cadastro e o cancelamento grava o usuário executor. | `app/Services/EnrollmentService.php:156` e `:239` | 🟢 |
| Integridade | A enturmação é única por matrícula, turma e sequencial, garantida por índice único no banco. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_table.php:37` | 🟢 |
| Integridade | O cancelamento em lote restringe o alcance às matrículas listadas na turma. | `app/Http/Controllers/BatchEnrollmentController.php:236-243` | 🟢 |
| Performance | O cálculo do sequencial de fechamento executa várias consultas agregadas por enturmação. | `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:84-239` | 🟢 |
| Performance | A verificação de conflito de horário carrega todas as turmas do ano do estudante e compara uma a uma. | `app/Services/SchoolClass/AvailableTimeService.php:40-67` | 🟢 |
| Performance | A movimentação de enturmação usa consulta única com união entre ativas e excluídas, filtrável por instante de atualização. | `ieducar/modules/Api/Views/MatriculaController.php:384-388` | 🟢 |
| Integridade | O serviço de sequenciamento interpola identificadores e datas diretamente na consulta SQL, sem parametrização. | `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:84-100` e `:115-130` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em matrículas, enturmações e solicitações de transferência. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:19-49` | 🟡 |
| Compatibilidade | As datas trafegam no formato brasileiro `d/m/Y` e são convertidas para o formato do banco na borda. | `app/Http/Controllers/EnrollmentController.php:82` e `app/Http/Requests/EnrollmentRequest.php:16-18` | 🟢 |
| Observabilidade | O serviço de enturmação reportou falhas em lote por aluno, com mensagem de sucesso ou de erro indexada pelo identificador. | `app/Http/Controllers/BatchEnrollmentController.php:112-119` e `:157-166` | 🟢 |
| Auditabilidade | A trilha de autoria é limitada ao usuário executor; não há registro de histórico das transições de situação. | `app/Services/RegistrationService.php:319` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado um estudante matriculado e uma turma sem vaga
Quando a enturmação for tentada em uma rede que bloqueia enturmação sem vaga
Então a operação é recusada com mensagem de falta de vaga

Dado um estudante com última enturmação encerrada em 10 de abril
Quando a enturmação for tentada com data de 1 de abril
Então a operação é recusada por inversão cronológica

Dado um estudante já enturmado e ativo na turma
Quando a enturmação for repetida na mesma turma
Então a operação é recusada

Dado um estudante enturmado em turma presencial das 8 às 12 horas
Quando for enturmado em outra turma presencial das 10 às 14 horas do mesmo ano
Então a operação é recusada por conflito de horário

Dado um estudante enturmado em turma presencial das 8 às 12 horas
Quando for enturmado em turma de atendimento educacional especializado no mesmo horário
Então a operação é permitida

Dado um estudante com nome que ordena depois dos demais da turma
Quando for enturmado
Então o sequencial de fechamento corresponde à posição alfabética do nome

Dado uma enturmação com entrada em 10 de março
Quando o cancelamento for tentado com data de 1 de março
Então a operação é recusada

Dado um estudante enturmado na turma A
Quando for remanejado para a turma B
Então a matrícula permanece ativa e a enturmação ativa passa a ser a da turma B

Dado uma matrícula cursando com enturmação ativa
Quando a situação for alterada para transferido
Então a enturmação é encerrada, marcada como transferida e a solicitação de transferência é criada

Dado uma matrícula transferida
Quando a situação voltar para cursando
Então a enturmação de maior sequencial é reativada e a data de cancelamento é limpa

Dado uma matrícula com abandono registrado
Quando o desfeito do abandono for solicitado
Então a matrícula volta para cursando, a enturmação é reativada e a busca ativa volta ao estado em andamento

Dado cinco matrículas selecionadas para enturmação em lote
Quando uma delas não tiver vaga
Então as quatro restantes são enturmadas e a quinta é reportada como falha

Dado um payload de cancelamento em lote com matrícula de outra turma
Quando o cancelamento for enviado
Então a matrícula alheia não é cancelada

Dado um estudante transferido após a data base da instituição
Quando a movimentação de enturmação for consultada
Então a linha vem marcada como apresentada fora da data
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Matrícula e enturmação como registros distintos | Must | É a estrutura sobre a qual opera todo o resto do sistema |
| Validações de enturmação por vaga, data e duplicidade | Must | Protege a consistência da alocação do estudante |
| Validação de conflito de horário | Must | Impede a dupla alocação que o Censo Escolar reprova |
| Numeração de chamada com ordem de fechamento | Must | Define a lista de presença e o diário de classe |
| Transições de situação da matrícula | Must | Governa o resultado pedagógico e o repasse do FUNDEB |
| Cancelamento de enturmação e reordenação | Must | Necessário para remanejamento, transferência e abandono |
| Remanejamento preservando a matrícula | Must | Operação diária da secretaria escolar |
| Solicitação de transferência | Must | Instrumento legal do deslocamento do estudante |
| Cancelamento da matrícula | Must | Operação da secretaria e depende de regras de sequência de série |
| Enturmação e cancelamento em lote | Must | Volume operacional das redes municipais |
| Desfazimento de abandono, reclassificação e saída da escola | Must | Existe no legado e é usado para corrigir registro errado |
| Consulta da movimentação de enturmação | Should | Usada na conferência e na preparação do Censo |
| Manutenção da carga horária integralizada e da matrícula INEP | Should | Necessária ao Registro 60 do Censo Escolar |
| Trava de troca de situação por matrícula | Should | Existe no legado e protege registros consolidados |
| Bloqueio de enturmação sem vagas por configuração | Should | Existe no legado e é alternável pela rede |
| Verificação de lotação e de capacidade máxima da turma | Could | Ausente no legado e tratada como componente futuro no modelo novo |
| Portabilidade de notas, faltas e pareceres na transferência | Could | Ausente no legado e descrita apenas no desenho do modelo novo |
| Equivalência curricular e adaptação curricular obrigatória | Could | Ausente no legado e descrita apenas no desenho do modelo novo |
| Histórico de transições de situação | Could | Ausente no legado, com trilha de autoria limitada ao executor |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `app/Services/EnrollmentService.php` | `enroll`, `cancelEnrollment`, `reorderSchoolClass`, `reorder`, `markAs*`, `updateExitDate` | 🟢 |
| `app/Services/RegistrationService.php` | `updateStatus`, `cancelRegistration`, `reorderSchoolClassesForRegistrations`, `getRegistrationsNotEnrolled` | 🟢 |
| `app/Services/SchoolClass/AvailableTimeService.php` | `isAvailable`, `schedulesMatch`, `overlappingSchedules`, `hasEscolarizacaoAndAee` | 🟢 |
| `app/Services/RelocationDate/RelocationDateService.php` | `getRelocationDate` com ajuste de ano bissexto | 🟢 |
| `app/Models/LegacyEnrollment.php` | Entidade de enturmação, casts e relações | 🟢 |
| `app/Models/LegacyRegistration.php` | Entidade de matrícula, relações e trava de situação | 🟢 |
| `app/Models/RegistrationStatus.php` | Domínio de quinze situações da matrícula | 🟢 |
| `app/Models/Builders/LegacyEnrollmentBuilder.php` | Filtros `active`, `notActive`, `whereValid`, `wherePeriod` | 🟢 |
| `app/Models/EnrollmentInep.php` | Matrícula INEP da enturmação | 🟢 |
| `app/Http/Controllers/EnrollmentController.php` | `viewEnroll`, `enroll`, `viewRelocate`, `relocate` | 🟢 |
| `app/Http/Controllers/BatchEnrollmentController.php` | Enturmação, desenturmação e cancelamento em lote | 🟢 |
| `app/Http/Controllers/EnrollmentInepController.php` | `edit` e `update` da carga horária integralizada | 🟢 |
| `app/Http/Controllers/EnrollmentHistoryController.php` | Histórico de enturmações da matrícula | 🟢 |
| `app/Http/Requests/EnrollmentRequest.php` | Validação da data de enturmação | 🟢 |
| `ieducar/modules/Api/Views/MatriculaController.php` | API de matrícula: situação, datas, abandono, reclassificação, movimentação | 🟢 |
| `ieducar/lib/App/Model/MatriculaSituacao.php` | Domínio legado de situações e situações finais | 🟢 |
| `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php` | Cálculo da ordem de fechamento | 🟢 |
| `ieducar/intranet/include/pmieducar/clsPmieducarMatricula.inc.php` | Classe legada de matrícula | 🟡 |
| `ieducar/intranet/include/pmieducar/clsPmieducarMatriculaTurma.inc.php` | Classe legada de enturmação | 🟡 |
| `ieducar/intranet/educar_matricula_cad.php` | Tela de cadastro da matrícula e da transferência | 🟡 |
| `ieducar/intranet/educar_matricula_turma_cad.php` | Tela de enturmação | 🟡 |
| `ieducar/intranet/educar_matricula_abandono_cad.php` | Tela de registro do abandono | 🟡 |
| `ieducar/intranet/educar_matricula_reclassificar_cad.php` | Tela de reclassificação | 🟡 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php` | Estrutura da matrícula | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_table.php` | Estrutura da enturmação | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_excluidos_table.php` | Arquivo das enturmações excluídas | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_transferencia_solicitacao_table.php` | Solicitação de transferência | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_transferencia_tipo_table.php` | Catálogo de tipos de transferência | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_abandono_tipo_table.php` | Catálogo de motivos de abandono | 🟢 |
| `app/Exceptions/Enrollment/` | Onze exceções de domínio da enturmação | 🟢 |
| `app/Rules/CanChangeExitDate.php` | Regra de alteração da data de saída | 🟢 |
| `app/Http/Controllers/EnrollmentsPromotionController.php` | Promoção de enturmações do ano seguinte | 🟡 |
| `app/Http/Controllers/BlockEnrollmentController.php` | Configuração de bloqueio de enturmação | 🟡 |
