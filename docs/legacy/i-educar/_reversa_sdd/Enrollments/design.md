# Enrollments (i-Educar legado), Design Técnico

> Descreve o **COMO** o módulo de matrículas e enturmações legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Matrícula | `cod_matricula` | escola, série, curso, aluno, ano, situação `aprovado`, `ativo`, `ultima_matricula`, `dependencia`, `data_matricula`, `data_cancel`, `data_exclusao`, `ref_cod_abandono_tipo`, `matricula_reclassificacao`, `matricula_transferencia`, `saida_escola`, `observacao`, `bloquear_troca_de_situacao`, `formando`, `turno_pre_matricula`, `modulo` | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:19-49` |
| Enturmação | `id` | matrícula, turma, `sequencial`, `sequencial_fechamento`, `data_enturmacao`, `data_exclusao`, `ativo`, `turno_id`, `tipo_atendimento`, `etapa_educacenso`, `transferido`, `remanejado`, `remanejado_mesma_turma`, `reclassificado`, `abandono`, `falecido`, `tipo_itinerario`, `composicao_itinerario`, `curso_itinerario`, `itinerario_concomitante`, `cod_curso_profissional`, `carga_horaria_integralizada`, `desconsiderar_educacenso`, `turma_unificada` | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_table.php:13-41` e `app/Models/LegacyEnrollment.php:48-71` |
| Enturmação excluída | `id` | cópia da enturmação com `deleted_at` | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_excluidos_table.php` |
| Solicitação de transferência | `ref_cod_matricula_saida` | tipo de transferência, usuário de cadastro, data de transferência, observação, `ativo` | `app/Services/RegistrationService.php:184-195` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_transferencia_solicitacao_table.php` |
| Tipo de transferência | `ref_cod_transferencia_tipo` | catálogo de motivos | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_transferencia_tipo_table.php` |
| Motivo de abandono | `ref_cod_abandono_tipo` | catálogo de motivos de evasão | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_abandono_tipo_table.php` |
| Matrícula INEP da enturmação | `matricula_turma_id` | `matricula_inep` | `app/Models/EnrollmentInep.php` |

### Domínio de situações da matrícula

| Valor | Constante | Rótulo | Final | Inativa |
|-------|-----------|--------|-------|---------|
| 1 | `APPROVED` | Aprovado | Sim | Não |
| 2 | `REPROVED` | Retido / Reprovado | Sim | Não |
| 3 | `ONGOING` | Cursando | Não | Não |
| 4 | `TRANSFERRED` | Transferido | Não | Sim |
| 5 | `RECLASSIFIED` | Reclassificado | Não | Não |
| 6 | `ABANDONED` | Deixou de Frequentar | Não | Sim |
| 7 | `IN_EXAM` | Em exame | Não | Não |
| 8 | `APPROVED_PAST_EXAM` | Aprovado após exame | Sim | Não |
| 10 | `APPROVED_WITHOUT_EXAM` | Aprovado sem exame | Não | Não |
| 11 | `PRE_REGISTRATION` | Pré-matrícula | Não | Não |
| 12 | `APPROVED_WITH_DEPENDENCY` | Aprovado com dependência | Sim | Não |
| 13 | `APPROVED_BY_BOARD` | Aprovado pelo conselho | Sim | Não |
| 14 | `REPROVED_BY_ABSENCE` | Reprovado por faltas | Sim | Não |
| 15 | `DECEASED` | Falecido | Não | Sim |

Fonte: `app/Models/RegistrationStatus.php:8-71` e `ieducar/lib/App_Model/MatriculaSituacao.php:5-76`. O valor 9 não é usado. 🟢

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Permissão |
|--------|---------|---------|-------|-----------|
| GET | `/matricula/{registration}/enturmar/{schoolClass}` | matrícula, turma | Página de enturmação | Leitura |
| POST | `/matricula/{registration}/enturmar/{schoolClass}` | `enrollment_date` | Redirecionamento com sucesso ou erro | `can:modify:683` |
| GET | `/matricula/{registration}/remanejar/{schoolClass}` | matrícula, turma | Página de remanejamento | `can:view:695` |
| POST | `/matricula/{registration}/remanejar/{schoolClass}` | `enrollment_date`, `enrollment_from_id` | Redirecionamento com sucesso ou erro | `can:modify:695` |
| GET | `/enturmacao-em-lote/{schoolClass}` | turma | Página de enturmação em lote | Leitura |
| POST | `/enturmacao-em-lote/{schoolClass}` | `date`, `registrations[]` | Página com sucesso e falha por aluno | Leitura |
| GET | `/cancelar-enturmacao-em-lote/{schoolClass}` | turma | Página de desenturmação em lote | Leitura |
| POST | `/cancelar-enturmacao-em-lote/{schoolClass}` | `date`, `enrollments[]` | Página com sucesso e falha por aluno | Leitura |
| GET | `/cancelar-matricula-em-lote/{schoolClass}` | turma | Página de cancelamento em lote | `can:modify:578` e `can:remove:627` |
| POST | `/cancelar-matricula-em-lote/{schoolClass}` | `registrations[]` | Página com sucesso e falha por aluno | `can:modify:578` e `can:remove:627` |
| GET | `/enrollment-history/{id}` | matrícula | Página de histórico de enturmações | Leitura |
| GET | `/enrollment-inep/{enrollment}` | enturmação | Página de carga horária integralizada e matrícula INEP | Leitura |
| POST | `/enrollment-inep/{enrollment}` | `carga_horaria_integralizada`, `matricula_inep`, `desconsiderar_educacenso` | Redirecionamento para o histórico | Leitura |
| GET | `/module/Api/Matricula?matricula` | `id` | Dados da matrícula | Leitura |
| GET | `/module/Api/Matricula?matriculas` | filtros | Lista de matrículas | Leitura |
| GET | `/module/Api/Matricula?matriculas-escola` | `escola`, `ano` | Matrículas da escola | Leitura |
| GET | `/module/Api/Matricula?matricula-transferida` | `aluno` | Matrículas transferidas | Leitura |
| GET | `/module/Api/Matricula?movimentacao-enturmacao` | `ano`, `escola[]`, `modified` | Movimentação de enturmação | Leitura |
| GET | `/module/Api/Matricula?enturmacoes-excluidas` | `ano`, `escola` | Enturmações excluídas | Leitura |
| GET | `/module/Api/Matricula?busca-ativa` | `ano`, `escola` | Registros de busca ativa | Leitura |
| GET | `/module/Api/Matricula?frequencia` | `id` | Frequência da matrícula | Leitura |
| GET | `/module/Api/Matricula?matriculas-dependencia` | `ano`, `escola` | Matrículas de dependência | Leitura |
| GET | `/module/Api/Matricula?dispensa-disciplina` | `matricula_id` | Dispensa de disciplina | Leitura |
| POST | `/module/Api/Matricula?data-entrada` | `matricula_id`, `data_entrada` | Mensagem de sucesso | Leitura |
| POST | `/module/Api/Matricula?data-saida` | `matricula_id`, `data_saida` | Mensagem de sucesso ou erro | Leitura |
| POST | `/module/Api/Matricula?situacao` | `matricula_id`, `nova_situacao` | Mensagem de sucesso | Leitura |
| DELETE | `/module/Api/Matricula?abandono` | `id` | Mensagem de sucesso | Leitura |
| DELETE | `/module/Api/Matricula?reclassificacao` | `id` | `aluno_id` | Leitura |
| DELETE | `/module/Api/Matricula?saidaEscola` | `id` | Mensagem de sucesso | Leitura |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `EnrollmentService::enroll` | `(LegacyRegistration, LegacySchoolClass, DateTime, bool $isRelocatedSameClassGroup = false)` | `LegacyEnrollment` | Aplica as quatro validações e grava a enturmação 🟢 `app/Services/EnrollmentService.php:187-246` |
| `EnrollmentService::cancelEnrollment` | `(LegacyEnrollment, DateTime)` | `bool` | Valida as datas, desativa a enturmação e reordena a turma 🟢 `EnrollmentService.php:131-177` |
| `EnrollmentService::reorderSchoolClass` | `(LegacyEnrollment)` | `void` | Renumera a turma e marca 9999 na enturmação que saiu 🟢 `EnrollmentService.php:374-392` |
| `EnrollmentService::reorder` | `(LegacyRegistration)` | `bool` | Renumera o sequencial das enturmações da matrícula 🟢 `EnrollmentService.php:355-363` |
| `EnrollmentService::markWithSituation` | `(LegacyEnrollment, string)` | `void` | Escreve o marcador de encerramento conforme a situação 🟢 `EnrollmentService.php:317-325` |
| `EnrollmentService::updateExitDate` | `(LegacyEnrollment, DateTime)` | `void` | Valida pela regra de alteração de data de saída 🟢 `EnrollmentService.php:425-442` |
| `EnrollmentService::isEnrolled` | `(LegacySchoolClass, LegacyRegistration)` | `bool` | Verifica enturmação ativa na turma 🟢 `EnrollmentService.php:87-93` |
| `EnrollmentService::anotherClassroomEnrollments` | `(LegacySchoolClass, LegacyRegistration)` | `Collection` | Enturmações da matrícula em outras turmas 🟢 `EnrollmentService.php:102-108` |
| `RegistrationService::updateStatus` | `(LegacyRegistration, array)` | `void` | Grava a situação e dispara a ação associada 🟢 `app/Services/RegistrationService.php:86-94` |
| `RegistrationService::cancelRegistration` | `(LegacyRegistration, bool $reorderSchoolClasses = true)` | `void` | Cancela a matrícula dentro de transação 🟢 `RegistrationService.php:305-326` |
| `RegistrationService::getRegistrationsNotEnrolled` | `(LegacySchoolClass)` | `Collection` | Matrículas elegíveis para a enturmação em lote 🟢 `RegistrationService.php:47-79` |
| `RegistrationService::reorderSchoolClassesForRegistrations` | `(array $registrationIds)` | `void` | Reordena uma vez por turma 🟢 `RegistrationService.php:339-358` |
| `AvailableTimeService::isAvailable` | `(int $studentId, int $schoolClassId, ?int $turnoId = null)` | `bool` | Verifica conflito de horário 🟢 `app/Services/SchoolClass/AvailableTimeService.php:32-68` |
| `AvailableTimeService::onlySchoolClassesInformedOnCensus` | `()` | `$this` | Restringe a comparação às turmas do Censo 🟢 `AvailableTimeService.php:89-95` |
| `SequencialEnturmacao::ordenaSequencialNovaMatricula` | `()` | `int` | Calcula a posição de chamada do novo aluno 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:42-80` |
| `RelocationDateService::getRelocationDate` | `(string $enrolmentDate)` | `string\|null` | Compõe a data base de remanejamento do ano 🟢 `app/Services/RelocationDate/RelocationDateService.php:16-35` |
| `LegacyEnrollmentBuilder::whereValid` | `()` | `LegacyBuilder` | Enturmações ativas ou encerradas por marcadores 🟢 `app/Models/Builders/LegacyEnrollmentBuilder.php:40-51` |
| `LegacyEnrollmentBuilder::activeBySituation` | `(?int $situation)` | `self` | Filtra por atividade conforme a situação 🟢 `LegacyEnrollmentBuilder.php:20-27` |
| `RegistrationStatus::getStatusInactive` | `()` | `array<int,int>` | Situações que encerram a matrícula 🟢 `app/Models/RegistrationStatus.php:64-71` |
| `App_Model_MatriculaSituacao::getSituacoesFinais` | `()` | `array<int,int>` | Situações de resultado pedagógico 🟢 `ieducar/lib/App_Model/MatriculaSituacao.php:66-76` |

---

## Fluxo Principal

1. A secretaria escolar escolhe a turma e abre a tela de enturmação, que verifica a permissão de enturmar ou de desenturmar conforme já exista enturmação ativa na turma. 🟢 `app/Http/Controllers/EnrollmentController.php:25-60`
2. O usuário informa a data de enturmação e confirma a operação. 🟢 `app/Http/Controllers/EnrollmentController.php:82` e `app/Http/Requests/EnrollmentRequest.php:16-18`
3. O serviço valida a vaga, os limites do ano letivo, a ordem cronológica, o conflito de horário e a duplicidade na turma. 🟢 `app/Services/EnrollmentService.php:193-232`
4. O serviço de sequenciamento calcula a posição de chamada do novo aluno e desloca os sequenciais posteriores. 🟢 `app/Services/EnrollmentService.php:238` e `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:42-80`
5. A enturmação é gravada com sequencial, sequencial de fechamento, usuário de cadastro e data de entrada. 🟢 `app/Services/EnrollmentService.php:235-243`
6. O usuário é redirecionado ao detalhe da matrícula, com a mensagem de sucesso. 🟢 `app/Http/Controllers/EnrollmentController.php:99-100`

---

## Fluxos Alternativos

- **Turma sem vaga:** a enturmação é recusada com a exceção de falta de vaga, e nada é gravado. 🟢 `app/Services/EnrollmentService.php:193-195`
- **Data fora do ano letivo:** a data anterior ao início é tolerada quando a instituição permite registro fora do ano letivo; a data posterior ao fim nunca é tolerada. 🟢 `app/Services/EnrollmentService.php:197-205`
- **Conflito de horário:** a enturmação é recusada apenas quando a instituição exige os campos obrigatórios do Censo e a turma de destino é presencial. 🟢 `app/Services/EnrollmentService.php:219-223` e `app/Services/SchoolClass/AvailableTimeService.php:36-38`
- **Escolarização com AEE:** o conflito de horário é ignorado quando uma das turmas é de escolarização e a outra é de AEE. 🟢 `AvailableTimeService.php:102-111`
- **Cancelamento de enturmação:** a data é validada contra o ano letivo, contra a data de entrada e contra a data de matrícula, antes da desativação. 🟢 `app/Services/EnrollmentService.php:135-151`
- **Reordenação após cancelamento:** a renumeração ocorre só quando não há data base de remanejamento ou quando a data de saída é anterior a ela. 🟢 `app/Services/EnrollmentService.php:161-167`
- **Remanejamento sem turma de origem:** a operação é recusada antes de qualquer alteração. 🟢 `app/Http/Controllers/EnrollmentController.php:159-163`
- **Remanejamento para a mesma turma:** a enturmação anterior recebe o marcador de mesma turma, em vez do marcador de remanejamento. 🟢 `EnrollmentController.php:172-178`
- **Falha em lote:** cada matrícula é processada em bloco próprio, com o resultado registrado por identificador, e as já concluídas permanecem gravadas. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:157-166`
- **Cancelamento de matrícula já cancelada:** a operação é recusada com a mensagem de que a matrícula já está cancelada. 🟢 `app/Services/RegistrationService.php:307-309`
- **Desfazimento do abandono:** a matrícula volta para cursando, a enturmação de maior sequencial é reativada, a promoção é refeita e a busca ativa volta ao estado em andamento. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:520-585`
- **Desfazimento da reclassificação:** todas as enturmações da matrícula são reativadas e a matrícula volta para cursando. 🟢 `MatriculaController.php:587-603`
- **Bloqueio de enturmação em turma não informada no Censo:** o conflito de horário não é avaliado. 🟢 `AvailableTimeService.php:36-38` e `:55-57`

---

## Dependências

- **Cadastro de aluno (`pmieducar.aluno`):** origem do estudante das matrículas e das enturmações. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:24`
- **Cadastro de pessoa (`cadastro.pessoa`):** origem do nome usado na ordenação alfabética da chamada. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:231-239`
- **Turma (`pmieducar.turma`):** destino da enturmação, com ano letivo, turno, horários, dias da semana, tipo de atendimento e mediação. 🟢 `app/Services/SchoolClass/AvailableTimeService.php:34-58`
- **Série (`pmieducar.serie`):** origem da série da matrícula, usada na sequência de progressão e na elegibilidade da enturmação em lote. 🟢 `app/Services/RegistrationService.php:49-68`
- **Escola e instituição (`pmieducar.escola`, `pmieducar.instituicao`):** fornecem o ano letivo, a data base de remanejamento, a data de fechamento e a data base de transferência. 🟢 `app/Services/EnrollmentService.php:161` e `SequencialEnturmacao.php:303-333`
- **Ano letivo por módulo (`pmieducar.ano_letivo_modulo`):** define o início e o fim do ano letivo usados nas validações de data. 🟢 `app/Services/EnrollmentService.php:135-143` e `:197-205`
- **Módulo de avaliação (`Avaliacao_Model_NotaAlunoDataMapper`):** a situação da nota do aluno acompanha a situação da matrícula. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:715-721`
- **Busca ativa (`LegacyActiveLooking`):** o desfeito do abandono devolve o registro de busca ativa ao estado em andamento. 🟢 `MatriculaController.php:574-581`
- **Promoção (`PromocaoApiController`):** a promoção é refeita ao desfazer o abandono. 🟢 `MatriculaController.php:558-572`
- **Sequência de séries (`LegacyGradeSequence`):** define a série de origem a ser reflagrada no cancelamento da matrícula. 🟢 `app/Services/RegistrationService.php:419-441`
- **Censo Escolar (`src/Modules/Educacenso/`):** consome a matrícula e a enturmação no Registro 60 e na auditoria de campos obrigatórios. 🟢 `database/sqls/views/public.educacenso_record60.sql` e `app/Services/EnrollmentService.php:219-223`
- **Permissões (`App\Process` e `Gate`):** controlam enturmar, desenturmar, remanejar e cancelar matrícula. 🟢 `app/Http/Controllers/EnrollmentController.php:36-45`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Separação entre matrícula e enturmação, com a matrícula preservada no remanejamento | `app/Http/Controllers/EnrollmentController.php:168-187` | 🟢 |
| Situação da matrícula armazenada em coluna numérica com catálogo de quinze valores | `app/Models/RegistrationStatus.php:8-60` | 🟢 |
| Marcadores booleanos de encerramento na enturmação, independentes da situação da matrícula | `app/Models/LegacyEnrollment.php:65-69` | 🟢 |
| Dois sequenciais: o de cadastro e o de fechamento, este último recalculado pela ordem alfabética | `app/Models/LegacyEnrollment.php:51` e `:54` | 🟢 |
| Cálculo do sequencial de fechamento em SQL cru, fora do serviço de enturmação | `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:84-239` | 🟢 |
| Data base de remanejamento anual, composta a partir do dia e do mês fixos da instituição | `app/Services/RelocationDate/RelocationDateService.php:16-35` | 🟢 |
| Reordenação da turma condicionada à data base de remanejamento | `app/Services/EnrollmentService.php:161-167` | 🟢 |
| Validação de conflito de horário feita por comparação de dias da semana, período de ano letivo e horários | `app/Services/SchoolClass/AvailableTimeService.php:113-198` | 🟢 |
| Exceção legal de AEE no conflito de horário, declarada dentro do comparador | `AvailableTimeService.php:102-111` | 🟢 |
| Enturmação em lote tolerante a falhas individuais, com resultado por aluno | `app/Http/Controllers/BatchEnrollmentController.php:157-166` | 🟢 |
| Reordenação adiada e executada uma vez por turma no cancelamento em lote | `BatchEnrollmentController.php:258-262` e `app/Services/RegistrationService.php:339-358` | 🟢 |
| Desativação das enturmações no cancelamento da matrícula sem validação de ano letivo | `app/Services/RegistrationService.php:368-387` | 🟢 |
| Cancelamento em lote restrito às matrículas listadas para a turma | `BatchEnrollmentController.php:236-243` | 🟢 |
| Autorização de acesso à turma para usuário de nível escola | `BatchEnrollmentController.php:275-288` | 🟢 |
| Arquivo das enturmações excluídas, consultado em separado da movimentação | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_excluidos_table.php` e `ieducar/modules/Api/Views/MatriculaController.php:436-468` | 🟢 |
| Manutenção da carga horária integralizada e da matrícula INEP na própria enturmação | `app/Http/Controllers/EnrollmentInepController.php:36-46` | 🟢 |

---

## Estado Interno

O módulo é **com estado próprio**, sustentado por três mecanismos: a coluna numérica de situação da matrícula, os marcadores booleanos de encerramento na enturmação e o par de sequenciais. 🟢

Campos de estado observados:

- `aprovado` na matrícula, que é a situação no domínio de quinze valores. 🟢 `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:25`
- `ativo` e `ultima_matricula` na matrícula, que marcam a vigência e a posição na sequência de séries. 🟢 `pmieducar.matricula:26` e `:27`
- `dependencia` na matrícula, que separa a matrícula de dependência na ordenação de chamada. 🟢 `pmieducar.matricula:38`
- `bloquear_troca_de_situacao` na matrícula, que impede a alteração da situação. 🟢 `app/Models/LegacyRegistration.php:109-112`
- `transferido`, `remanejado`, `remanejado_mesma_turma`, `reclassificado`, `abandono` e `falecido` na enturmação, que registram a causa do encerramento. 🟢 `app/Models/LegacyEnrollment.php:55` e `:65-69`
- `ativo` na enturmação, que indica vigência. 🟢 `pmieducar.matricula_turma:23`
- `sequencial_fechamento` na enturmação, que é a posição de chamada e assume 9999 para a enturmação que saiu. 🟢 `app/Services/EnrollmentService.php:390`
- `data_exclusao` na enturmação, que é a data de saída. 🟢 `app/Models/LegacyEnrollment.php:70`
- `data_cancel` na matrícula, que é a data de cancelamento. 🟢 `pmieducar.matricula:41`
- `desconsiderar_educacenso` na enturmação, que exclui o registro do Censo Escolar. 🟢 `app/Models/LegacyEnrollment.php:64`
- `data_base_transferencia` e `data_base_remanejamento` na instituição, que são as datas base do ciclo. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:400-409`
- `data_fechamento` na instituição, que define o corte da ordenação de chamada. 🟢 `SequencialEnturmacao.php:305`

Não há, no legado, histórico das transições de situação, registro de auditoria das operações de enturmação, nem contador de vagas da turma persistido. 🔴

---

## Observabilidade

- Cada operação em lote devolve um par de bags de mensagens, indexado pelo identificador da matrícula ou da enturmação, com a contagem total de sucessos e falhas. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:107-121`
- A sessão recebe a mensagem agregada de sucesso ou de erro, no plural e no singular. 🟢 `BatchEnrollmentController.php:319-362`
- As exceções de domínio traduzem cada regra violada em mensagem específica, com onze classes distintas. 🟢 `app/Exceptions/Enrollment/`
- A API de matrícula reporta sucesso ou erro na borda, com mensagem específica por operação. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:633` e `:665`
- A alteração de data de saída que viola a regra de alteração devolve a mensagem do validador, e a falha desconhecida devolve mensagem genérica de suporte. 🟢 `MatriculaController.php:654-662`
- O cancelamento em lote registra a exceção inesperada em log e mostra mensagem genérica ao usuário. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:251-255`
- Não há log estruturado, métrica ou rastreamento distribuído no módulo. 🔴

---

## Riscos e Lacunas

- 🔴 O serviço de sequenciamento interpola identificadores e datas diretamente no SQL, o que é caminho direto para injeção quando os valores vêm da requisição. 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:84-100` e `:115-130`
- 🔴 A API de matrícula monta o filtro de escola por concatenação de valores recebidos da requisição, sem parametrização. 🟢 `ieducar/modules/Api/Views/MatriculaController.php:433` e `:467`
- 🔴 A exportação do Censo Escolar depende da data de referência da instituição e do desempate por enturmação mais antiga, regra que está embutida na visão SQL e não no código do módulo. 🟢 `database/sqls/views/public.educacenso_record60.sql:70-95`
- 🔴 A desativação das enturmações no cancelamento da matrícula ignora a validação de ano letivo, o que permite cancelar matrículas de anos anteriores, mas também permite que uma data de saída inconsistente passe sem verificação. 🟢 `app/Services/RegistrationService.php:362-367`
- 🔴 O cancelamento em lote de enturmação e de matrícula não exige a autorização de acesso à turma, ao contrário do cancelamento de matrícula, que exige. 🟢 `app/Http/Controllers/BatchEnrollmentController.php:99-122` e `:275-288`
- 🔴 Não há no legado registro de capacidade máxima da turma, nem verificação de superlotação, nem de que a matrícula pertence à série da turma quando a turma é multisseriada. 🟡
- 🔴 Não há portabilidade de notas, faltas e pareceres na transferência, nem equivalência curricular entre turmas, embora o desenho do modelo novo descreva ambos como comportamento esperado. 🔴
- 🔴 A ordenação alfabética da chamada depende do nome da pessoa, e não de um identificador estável, o que produz reordenação silenciosa quando o nome é corrigido.
- 🟡 O marcador de remanejamento na mesma turma é gravado sobre a enturmação anterior, mas o registro de remanejamento entre turmas e o de mesma turma coexistem no mesmo par de campos, o que torna ambíguo o estado final.
- 🟡 A situação da matrícula e os marcadores da enturmação podem divergir, porque as duas escritas são feitas em rotinas distintas e por códigos diferentes, sem verificação de consistência.
- 🟡 O catálogo de situações é declarado em dois lugares, `app/Models/RegistrationStatus.php` e `ieducar/lib/App_Model/MatriculaSituacao.php`, com rótulos diferentes para o valor 2, Retido e Reprovado.
- 🟡 O sequencial de fechamento é recalculado por UPDATE massivo a cada enturmação, o que torna a operação proporcional ao tamanho da turma.
- 🟡 A carga horária integralizada é validada apenas por faixa numérica, sem verificação de coerência com a carga horária da turma.
