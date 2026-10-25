# SchoolClass (i-Educar legado), Design Técnico

> Descreve o **COMO** o módulo de turmas legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Turma | `cod_turma` | escola, série, curso, nome, sigla, ano, lotação máxima, multisseriada, ativo, visível, tipo de turma, horário de início, de fim, de início e de fim de intervalo, regente, instituição, tipo de boletim, tipo de boletim diferenciado, turno, tipo de atendimento, turma mais educação, seis atividades complementares, onze sinalizadores de AEE, curso profissional, eixo de curso profissional, carga horária total, etapa do Censo Escolar, disciplina dispensada, quatro pareceres, não informar no Censo Escolar, mediação didático-pedagógica, dias da semana, atividades complementares, atividades de AEE, local de funcionamento diferenciado, organização curricular, formas de organização da turma, classe com língua brasileira de sinais, horários matutinos, horários vespertinos, etapa agregada, classe especial, formação em alternância, área de itinerário, tipo de curso de itinerário e curso profissional de itinerário | `app/Models/LegacySchoolClass.php:86-163` |
| Série da turma | `turma_id`, `escola_id`, `serie_id` | boletim, boletim diferenciado | `app/Models/LegacySchoolClassGrade.php:9-16` |
| Corpo docente na turma | `turma_id`, `servidor_id` | ano, instituição, função exercida, tipo de vínculo, permissão de lançamento de faltas, data inicial, data final, área de itinerário, leciona itinerário técnico profissional, turno | `app/Models/LegacySchoolClassTeacher.php:11-28` |
| Disciplina do docente na turma | `professor_turma_id`, `componente_curricular_id` | vínculo | `app/Models/LegacySchoolClassTeacherDiscipline.php` |
| Código INEP da turma | `cod_turma`, `turma_turno_id` | código INEP, nome no INEP, fonte | `app/Models/SchoolClassInep.php:11-22` |
| Etapa do calendário próprio | `ref_cod_turma` | data de início, data de fim, sequencial | `app/Models/LegacySchoolClassStage.php` |
| Tipo de turma | `cod_turma_tipo` | nome, sigla, ativo | `app/Models/LegacySchoolClassType.php:11-20` |

### Domínio de turno

| Valor | Constante | Rótulo | Sigla |
|-------|-----------|--------|-------|
| 1 | `MORNING` | Matutino | M |
| 2 | `AFTERNOON` | Vespertino | V |
| 3 | `NIGTH` | Noturno | N |
| 4 | `FULLTIME` | Integral | I |

Fonte: `src/Modules/SchoolClass/Period.php:8-26`. 🟢

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/school-class` | payload completo da turma | `{ "msg": "Edição efetuada com sucesso." }` | 🟢 `app/Http/Controllers/SchoolClassController.php:22-137` |
| DELETE | `/school-class` | `cod_turma` | `{ "msg": "Exclusão efetuada com sucesso." }` | 🟢 `SchoolClassController.php:139-159` |
| GET | `/api/school-classes` | filtros de paginação | Coleção paginada de turmas | Processo 586 🟢 `app/Http/Controllers/Api/SchoolClassController.php:16-21` |
| GET | `/api/school-classes/calendars` | `ref_cod_turma`, `ano`, `ref_cod_escola`, `ref_cod_serie`, `ref_cod_curso` | Calendários das turmas | 🟢 `SchoolClassController.php:22-48` |
| GET | `/api/school-classes/{id}/stages` | — | Etapas da turma | 🟢 `SchoolClassController.php:50-53` |
| GET | `/api/resource/school-classes` | filtros | Coleção simples de turma | 🟢 `app/Http/Controllers/Api/Resource/SchoolClass/ResourceSchoolClassController.php` |
| GET | `/module/Api/Turma?turma` | `id` | Dados da turma | 🟢 `ieducar/modules/Api/Views/TurmaController.php:42-60` |
| GET | `/module/Api/Turma?tipo-boletim` | `turma_id` | Tipo de boletim e sua diferenciação | 🟢 `TurmaController.php:164-207` |
| GET | `/module/Api/Turma?ordena-matriculas-data-base` | `turma_id` | Matrículas ordenadas pela data base | 🟢 `TurmaController.php:62-128` |
| GET | `/module/Api/Turma?ordena-turma-alfabetica` | `turma_id` | Alunos ordenados alfabeticamente | 🟢 `TurmaController.php:130-157` |
| GET | `/module/Api/Turma?turmas-por-escola` | `instituicao_id`, `ano`, `escola[]`, `turno_id`, `modified` | `{ "turmas": [...] }` | 🟢 `TurmaController.php:209-291` |
| GET | `/module/Api/Turma?alunos-exame-turma` | `instituicao_id`, `turma_id`, `disciplina_id` | `{ "alunos": [...] }` | 🟢 `TurmaController.php:293-327` |
| GET | `/module/Api/Turma?series-da-turma` | `turma_id` | `{ "series_turma": [...] }` | 🟢 `TurmaController.php:329-341` |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `LegacySchoolClass::getTotalEnrolled` | `()` | `int` | Lotação efetiva, sem as matrículas de dependência 🟢 `app/Models/LegacySchoolClass.php:269-276` |
| `LegacySchoolClass::vacancies` | `()` | `int` | Vagas da turma, sem resultado negativo 🟢 `LegacySchoolClass.php:254-263` |
| `LegacySchoolClass::denyEnrollmentsWhenNoVacancy` | `()` | `bool` | Trava de enturmação lida na oferta de série 🟢 `LegacySchoolClass.php:534-545` |
| `LegacySchoolClass::getActiveEnrollments` | `()` | `Collection` | Enturmações ativas do ano da turma 🟢 `LegacySchoolClass.php:471-489` |
| `LegacySchoolClass::getActiveEnrollmentsWithCancellableRegistration` | `()` | `Collection` | Enturmações com matrícula cancelável 🟢 `LegacySchoolClass.php:503-517` |
| `LegacySchoolClass::getDisciplines` | `()` | `Collection` | Disciplinas por três caminhos de resolução 🟢 `LegacySchoolClass.php:612-640` |
| `LegacySchoolClass::getEvaluationRule` | `(?int $gradeId = null)` | `LegacyEvaluationRule` | Regra da série e do ano, com a diferenciação da escola 🟢 `LegacySchoolClass.php:648-661` |
| `LegacySchoolClass::permiteCargaHorariaIntegralizada` | `()` | `bool` | IFTP ou etapa que admite a carga 🟢 `LegacySchoolClass.php:686-693` |
| `LegacySchoolClass::getClassTime` | `()` | `int` | Carga horária em horas 🟢 `LegacySchoolClass.php:552-561` |
| `SchoolClassService::storeSchoolClass` | `(LegacySchoolClass)` | `LegacySchoolClass` | Valida e grava a turma 🟢 `app/Services/SchoolClass/SchoolClassService.php:106-113` |
| `SchoolClassService::deleteSchoolClass` | `(LegacySchoolClass)` | `void` | Valida e exclui logicamente a turma 🟢 `SchoolClassService.php:115-130` |
| `SchoolClassService::hasStudentsPartials` | `(int $schoolClassId)` | `bool` | Detecta estudantes parciais, com cache de cinco minutos 🟢 `SchoolClassService.php:151-158` |
| `SchoolClassService::getStudentsPeriods` | `(int $schoolClassId)` | `Collection` | Turnos dos estudantes, lidos do Registro 60 🟢 `SchoolClassService.php:165-181` |
| `SchoolClassService::getCalendars` | `(array $schoolClassId)` | `Collection` | Início e fim do calendário das turmas 🟢 `SchoolClassService.php:89-99` |
| `MultiGradesService::storeSchoolClassGrade` | `(LegacySchoolClass, array)` | `void` | Valida e grava as séries da multisseriada 🟢 `app/Services/SchoolClass/MultiGradesService.php:60-65` |
| `MultiGradesService::deleteAllGradesOfSchoolClass` | `(LegacySchoolClass)` | `void` | Remove as séries, preservando a principal 🟢 `MultiGradesService.php:67-80` |
| `SchoolClassInepService::save` | `($codTurma, $codInep, $codInepMat, $codInepVesp, $turnoId)` | `void` | Grava os três códigos INEP da turma 🟢 `app/Services/SchoolClassInepService.php:44-92` |
| `SchoolClassInepService::store` | `($codTurma, $codigoInep, $turnoId)` | `mixed` | Grava um código, removendo os conflitantes 🟢 `SchoolClassInepService.php:13-28` |
| `CanCreateSchoolClass::passes` | `($attribute, $value)` | `bool` | Trava de criação com vagas em aberto 🟢 `app/Rules/CanCreateSchoolClass.php:18-61` |
| `CanDeleteTurma::passes` | `($attribute, $value)` | `bool` | Trava de exclusão com enturmações ativas 🟢 `app/Rules/CanDeleteTurma.php:16-24` |
| `CanAlterSchoolClassGrade::passes` | `($attribute, $value)` | `bool` | Trava de alteração da série 🟢 `app/Rules/CanAlterSchoolClassGrade.php` |
| `CheckSchoolClassExistsByName::passes` | `($attribute, $value)` | `bool` | Unicidade do nome 🟢 `app/Rules/CheckSchoolClassExistsByName.php` |
| `DuplicateMultiGrades::passes` | `($attribute, $value)` | `bool` | Recusa de séries repetidas 🟢 `app/Rules/DuplicateMultiGrades.php` |
| `ExistsEnrollmentsInSchoolClassGrades::passes` | `($attribute, $value)` | `bool` | Recusa de remoção de série com matrícula 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php` |
| `IncompatibleChangeToMultiGrades::passes` | `($attribute, $value)` | `bool` | Recusa da conversão para multisseriada 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php` |
| `LegacySchoolClassBuilder::whereGrade` | `(int $grade)` | `self` | Filtro por série, com as séries da multisseriada 🟢 `app/Models/Builders/LegacySchoolClassBuilder.php:56-64` |
| `LegacySchoolClassBuilder::whereCourse` | `(int $course)` | `self` | Filtro por curso, com as séries da multisseriada 🟢 `LegacySchoolClassBuilder.php:117-127` |
| `LegacySchoolClassBuilder::whereName` | `(string $name)` | `self` | Busca sem acento, com remoção de trechos entre parênteses 🟢 `LegacySchoolClassBuilder.php:192-197` |

---

## Fluxo Principal

1. A secretaria abre a tela de cadastro da turma e informa escola, série, curso, ano, nome, turno, horários e lotação. 🟢 `ieducar/intranet/educar_turma_cad.php`
2. A requisição é normalizada: os arrays viram string entre chaves, a carga horária é convertida em inteiro e os campos dependentes da etapa são anulados. 🟢 `app/Http/Controllers/SchoolClassController.php:164-294`
3. As cinco regras de validação são aplicadas: criação com vagas, alteração de série, campos obrigatórios do Censo, unicidade do nome e boletim alternativo. 🟢 `app/Services/SchoolClass/SchoolClassService.php:135-149`
4. A turma é gravada dentro da transação. 🟢 `SchoolClassController.php:65` e `:126`
5. Quando a turma é multisseriada, as séries são gravadas com o boletim individual e os componentes da turma são removidos. 🟢 `SchoolClassController.php:73-91`
6. Quando não é multisseriada, os componentes curriculares são regravados em lote e as séries vinculadas são removidas. 🟢 `SchoolClassController.php:92-106`
7. Os códigos INEP da turma são gravados, com o código geral e os dos turnos parciais. 🟢 `SchoolClassController.php:108-114`
8. Quando o curso não segue o calendário padrão, as etapas próprias da turma são gravadas. 🟢 `SchoolClassController.php:116-124`
9. A transação é confirmada e a mensagem de sucesso é devolvida. 🟢 `SchoolClassController.php:126-136`

---

## Fluxos Alternativos

- **Turma sem vaga:** a enturmação é recusada quando a oferta de série define a trava de bloqueio. 🟢 `app/Models/LegacySchoolClass.php:534-545`
- **Vagas em aberto no turno:** a criação é recusada com a quantidade de vagas e o nome da turma que as contém. 🟢 `app/Rules/CanCreateSchoolClass.php:48-57`
- **Exclusão com enturmações ativas:** a exclusão é recusada antes de qualquer alteração. 🟢 `app/Rules/CanDeleteTurma.php:18-21`
- **Exclusão sem enturmações:** a turma é desligada, ocultada e datada. 🟢 `app/Services/SchoolClass/SchoolClassService.php:126-129`
- **Nome já utilizado:** a gravação é recusada com mensagem que cita escola, curso, série e ano. 🟢 `app/Rules/CheckSchoolClassExistsByName.php:45`
- **Alteração de série com matrícula:** a gravação é recusada. 🟢 `app/Rules/CanAlterSchoolClassGrade.php`
- **Série repetida na multisseriada:** a gravação é recusada. 🟢 `app/Rules/DuplicateMultiGrades.php`
- **Menos de duas séries na multisseriada:** a gravação é recusada com mensagem específica. 🟢 `app/Services/SchoolClass/MultiGradesService.php:36`
- **Remoção de série com matrícula:** a gravação é recusada nomeando as séries com matrícula. 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
- **Conversão para multisseriada:** a gravação é recusada quando a série original tem matrículas e não está entre as novas. 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php`
- **Alteração do turno de turma integral:** a gravação é recusada antes da validação, com o nome do turno atual. 🟢 `app/Http/Controllers/SchoolClassController.php:51-62`
- **Etapa sem eixo de curso profissional:** o eixo é anulado. 🟢 `SchoolClassController.php:203-211`
- **Etapa sem curso técnico:** o curso profissional é anulado. 🟢 `SchoolClassController.php:250-255`
- **Tipo de atendimento sem atividade complementar:** as atividades complementares são anuladas. 🟢 `SchoolClassController.php:227-232`
- **Tipo de atendimento não curricular:** a marcação de classe especial é anulada. 🟢 `SchoolClassController.php:234-236`
- **Falha na gravação:** a transação é revertida e a mensagem da exceção é devolvida com status 500. 🟢 `SchoolClassController.php:131-133`
- **Falha de validação:** a transação é revertida e a primeira mensagem de erro é devolvida com status 422. 🟢 `SchoolClassController.php:127-130`

---

## Dependências

- **Escola (`pmieducar.escola`):** origem da unidade escolar da turma e da série habilitada. 🟢 `app/Models/LegacySchoolClass.php:355-358`
- **Série (`pmieducar.serie`) e curso (`pmieducar.curso`):** origem da série principal, do curso e do calendário padrão. 🟢 `LegacySchoolClass.php:339-348` e `:394`
- **Oferta de série da escola (`pmieducar.escola_serie`):** origem da trava de enturmação e do boletim. 🟢 `LegacySchoolClass.php:519-527`
- **Série da turma (`pmieducar.turma_serie`):** origem das séries da multisseriada e dos boletins individuais. 🟢 `LegacySchoolClass.php:318-321`
- **Enrolamento (`pmieducar.matricula_turma`):** origem da lotação efetiva e das enturmações ativas. 🟢 `LegacySchoolClass.php:373-376`
- **Matrícula (`pmieducar.matricula`):** origem do ano, da situação e da série da enturmação. 🟢 `LegacySchoolClass.php:475-482`
- **Componente curricular da turma (`modules.componente_curricular_turma`):** origem dos componentes alocados. 🟢 `LegacySchoolClass.php:566-581`
- **Oferta de disciplina da série (`pmieducar.escola_serie_disciplina`):** origem das disciplinas por série e por ano. 🟢 `LegacySchoolClass.php:632-639`
- **Corpo docente (`modules.professor_turma`):** origem da alocação docente. 🟢 `LegacySchoolClass.php:383-386`
- **Código INEP da turma (`modules.educacenso_cod_turma`):** identificação oficial da turma e dos turnos parciais. 🟢 `app/Models/SchoolClassInep.php:11-14`
- **Etapas do ano letivo (`pmieducar.escola_ano_letivo` e `pmieducar.turma_modulo`):** origem do calendário da turma. 🟢 `app/Services/SchoolClass/SchoolClassService.php:89-99`
- **Regra de avaliação (`modules.regra_avaliacao_serie_ano`):** origem da regra por série e por ano. 🟢 `ieducar/modules/Api/Views/TurmaController.php:261-265`
- **Censo Escolar (`src/Modules/Educacenso/`):** consome a turma no Registro 20 e o turno no Registro 60. 🟢 `src/Modules/Educacenso/Data/Registro20.php:62-137`
- **Diário de classe (`iDiarioService`):** sincroniza os componentes da turma com o diário. 🟢 `app/Http/Controllers/SchoolClassController.php:335-337`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Multisseriada como vínculo de séries com boletim individual, e não como coluna de lista | `app/Models/LegacySchoolClassGrade.php:9-16` | 🟢 |
| Regra de validação isolada por operação, com contrato próprio do Laravel | `app/Rules/` e `app/Services/SchoolClass/SchoolClassService.php:135-149` | 🟢 |
| Exclusão lógica com desligamento de atividade, de visibilidade e datagem | `app/Services/SchoolClass/SchoolClassService.php:126-129` | 🟢 |
| Contagem de matrículas de dependência excluída da lotação efetiva | `app/Models/LegacySchoolClass.php:269-276` | 🟢 |
| Trava de criação avaliada apenas na criação, e não na edição | `app/Rules/CanCreateSchoolClass.php:24` | 🟢 |
| Trava de criação restrita às turmas do mesmo turno e com ano letivo em andamento | `CanCreateSchoolClass.php:32-46` | 🟢 |
| Código INEP da turma com turno, permitindo três códigos na turma integral | `app/Services/SchoolClassInepService.php:44-92` | 🟢 |
| Detecção de estudante parcial a partir da visão do Censo Escolar, com cache curto | `app/Services/SchoolClass/SchoolClassService.php:151-181` | 🟢 |
| Calendário letivo resolvido conforme o curso seguir ou não o calendário padrão | `app/Models/LegacySchoolClass.php:278-311` | 🟢 |
| Regra de avaliação resolvida por série explícita, para suportar a multisseriada | `LegacySchoolClass.php:648-661` | 🟢 |
| Disciplinas resolvidas por três caminhos em cascata, da multisseriada à oferta da série | `LegacySchoolClass.php:612-640` | 🟢 |
| Arrays de PostgreSQL transportados como string entre chaves na borda | `app/Http/Controllers/SchoolClassController.php:186-195` e `LegacySchoolClass.php:445-468` | 🟢 |
| Filtro de série e de curso que consideram as séries vinculadas da multisseriada | `app/Models/Builders/LegacySchoolClassBuilder.php:56-64` e `:117-127` | 🟢 |
| Normalização dos campos dependentes da etapa do Censo Escolar na preparação do payload | `app/Http/Controllers/SchoolClassController.php:203-269` | 🟢 |
| Regra de exclusão de série preservando a série principal da turma | `app/Services/SchoolClass/MultiGradesService.php:67-80` | 🟢 |

---

## Estado Interno

O módulo é **sem estado próprio**, com o estado distribuído entre a turma, as suas séries, a sua alocação docente e o seu código INEP. 🟢

Campos de estado observados:

- `ativo` e `visivel` na turma, que controlam a existência operacional e a exibição. 🟢 `app/Models/LegacySchoolClass.php:95` e `:107`
- `data_exclusao` na turma, que registra a exclusão lógica. 🟢 `app/Models/LegacySchoolClass.php:119`
- `max_aluno` na turma, que é a lotação máxima declarada. 🟢 `LegacySchoolClass.php:93`
- `multiseriada` na turma, que habilita o caminho de séries vinculadas. 🟢 `LegacySchoolClass.php:94`
- `turma_turno_id` na turma, que é o turno da turma e distingue o integral. 🟢 `LegacySchoolClass.php:109`
- `dias_semana` na turma, que define os dias de funcionamento. 🟢 `LegacySchoolClass.php:142`
- `tipo_atendimento` na turma, que define os tipos de atendimento e habilita as marcações derivadas. 🟢 `LegacySchoolClass.php:111`
- `nao_informar_educacenso` na turma, que exclui a turma do Censo Escolar. 🟢 `LegacySchoolClass.php:139`
- `etapa_educacenso` na turma, que é a etapa do INEP e habilita o curso e o eixo profissionais. 🟢 `LegacySchoolClass.php:133`
- `carga_horaria_total` na turma, que alimenta a exportação da carga horária. 🟢 `LegacySchoolClass.php:132`
- `boletim_id` e `boletim_diferenciado_id` na série da turma, que permitem o boletim individual da multisseriada. 🟢 `app/Models/LegacySchoolClassGrade.php:14-15`
- `tipo_vinculo` e `funcao_exercida` na alocação docente, que definem a responsabilidade pela turma. 🟢 `app/Models/LegacySchoolClassTeacher.php:17-18`
- `permite_lancar_faltas_componente` na alocação docente, que delega o lançamento de notas e faltas. 🟢 `LegacySchoolClassTeacher.php:19`
- `turma_turno_id` no código INEP, que é nulo no código geral e preenchido nos códigos de turno parcial. 🟢 `app/Models/SchoolClassInep.php:15`

Não há, no legado, contador de vagas persistido, motivo de exclusão de turma, nem trilha de auditoria das alterações. 🔴

---

## Observabilidade

- A gravação e a exclusão devolvem a mensagem de sucesso na resposta e a duplicam na sessão. 🟢 `app/Http/Controllers/SchoolClassController.php:134-136`
- As recusas de validação devolvem a primeira mensagem de erro com status 422. 🟢 `SchoolClassController.php:127-130`
- A falha inesperada devolve a mensagem da exceção com status 500, sem gravar a transação. 🟢 `SchoolClassController.php:131-133`
- Cada regra de validação tem a sua própria mensagem, específica da condição violada. 🟢 `app/Rules/`
- A mensagem de bloqueio de criação detalha a quantidade de vagas e a turma que as contém. 🟢 `app/Rules/CanCreateSchoolClass.php:53`
- A mensagem de recusa de remoção de série nomeia as séries com matrícula vinculada. 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php`
- Não há log estruturado, métrica ou rastreamento distribuído no módulo. 🔴

---

## Riscos e Lacunas

- 🔴 A listagem de turmas por escola interpola a lista de escolas e o identificador do turno diretamente no SQL, sem parametrização. 🟢 `ieducar/modules/Api/Views/TurmaController.php:221` e `:268`
- 🔴 A API de recurso de turma dispensa a autorização na indexação, expondo a listagem de turmas da rede. 🟢 `app/Http/Controllers/Api/SchoolClassController.php:20-24`
- 🔴 A verificação de vagas em aberto percorre as turmas do turno e executa uma contagem de matrículas para cada uma, o que torna a criação da turma proporcional ao tamanho do turno. 🟢 `app/Rules/CanCreateSchoolClass.php:48-57`
- 🔴 O cache de estudantes parciais tem cinco minutos de validade, o que pode permitir a alteração do turno de uma turma que passou a ter estudantes parciais. 🟢 `app/Services/SchoolClass/SchoolClassService.php:153`
- 🔴 A exclusão lógica não registra o motivo nem o usuário responsável pela exclusão, e não há trilha do que foi removido. 🟢 `app/Services/SchoolClass/SchoolClassService.php:126-129`
- 🔴 A regra de validação da gravação de turma não verifica se a série está habilitada na escola, nem se a escola tem o curso habilitado.
- 🔴 A regra de exclusão de série usa uma busca que devolve as séries com matrícula, mas a comparação é feita pela contagem do array, e não pela presença de itens.
- 🟡 A carga horária em horas é a diferença bruta entre o início e o fim, sem descontar o intervalo nem as horas noturnas.
- 🟡 Os arrays de PostgreSQL são transportados como string entre chaves, o que impede a tipagem forte no contrato da API.
- 🟡 A regra de incompatibilidade de tipo de ausência, de parecer descritivo e de tipo de recuperação depende das séries comparadas entre a regra padrão e a diferenciada, o que acopla a turma ao modelo de avaliação.
- 🟡 O nome da turma no recurso inclui o ano entre parênteses, o que impede a busca por fragmento que contenha o ano.
- 🟡 O turno da turma é um código numérico sem entidade própria na aplicação, e a tabela de turnos do legado não foi localizada no código lido.
