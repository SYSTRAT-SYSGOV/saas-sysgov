# SchoolClass (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de turmas. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de escrita da turma

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/school-class` | payload da turma | `{ "msg": "Edição efetuada com sucesso." }` | 🟢 `app/Http/Controllers/SchoolClassController.php:22-137` |
| DELETE | `/school-class` | `cod_turma` | `{ "msg": "Exclusão efetuada com sucesso." }` | 🟢 `SchoolClassController.php:139-159` |

| Status | Significado | Observação |
|--------|-------------|------------|
| 200 | Gravação ou exclusão concluída | 🟢 `SchoolClassController.php:136` e `:158` |
| 422 | Recusa de validação, com a primeira mensagem | 🟢 `SchoolClassController.php:127-130` e `:149-152` |
| 500 | Falha inesperada, com a mensagem da exceção | 🟢 `SchoolClassController.php:131-133` e `:153-155` |

### Campos do payload de gravação 🟢 `app/Http/Controllers/SchoolClassController.php:29-43`

| Campo | Papel | Observação |
|-------|-------|------------|
| `cod_turma` | Turma alvo; vazio indica criação | 🟢 `SchoolClassController.php:43` |
| `ref_cod_escola` | Escola da turma, na criação | 🟢 `SchoolClassController.php:277` |
| `ref_cod_serie` | Série da turma, na criação | 🟢 `SchoolClassController.php:276` |
| `ref_cod_curso` | Curso da turma, na edição | 🟢 `SchoolClassController.php:280` |
| `ano_letivo` | Ano letivo, na criação | 🟢 `SchoolClassController.php:275` |
| `nm_turma` | Nome da turma | 🟢 `app/Models/LegacySchoolClass.php:89` |
| `sgl_turma` | Sigla da turma | 🟢 `LegacySchoolClass.php:90` |
| `max_aluno` | Lotação máxima | 🟢 `LegacySchoolClass.php:93` |
| `multiseriada` | Marca de turma multisseriada | 🟢 `SchoolClassController.php:73` |
| `mult_serie_id` | Séries vinculadas, com o boletim indexado | 🟢 `SchoolClassController.php:74-78` |
| `mult_boletim_id` | Boletim de cada série | 🟢 `SchoolClassController.php:76` |
| `mult_boletim_diferenciado_id` | Boletim diferenciado de cada série | 🟢 `SchoolClassController.php:77` |
| `turma_turno_id` | Turno da turma | 🟢 `SchoolClassController.php:113` |
| `hora_inicial`, `hora_final` | Horários de funcionamento | 🟢 `LegacySchoolClass.php:98-99` |
| `hora_inicio_intervalo`, `hora_fim_intervalo` | Intervalo | 🟢 `LegacySchoolClass.php:100-101` |
| `dias_semana` | Lista de dias de funcionamento | 🟢 `SchoolClassController.php:186-190` |
| `tipo_atendimento` | Lista de tipos de atendimento | 🟢 `SchoolClassController.php:223-242` |
| `atividades_complementares` | Lista de atividades complementares | 🟢 `SchoolClassController.php:192-196` |
| `disciplinas` | Componentes curriculares da turma | 🟢 `SchoolClassController.php:34` |
| `carga_horaria` | Carga horária de cada componente | 🟢 `SchoolClassController.php:35` |
| `usar_componente` | Marcador de componente com carga do catálogo | 🟢 `SchoolClassController.php:36` |
| `docente_vinculado` | Marcador de docente vinculado por componente | 🟢 `SchoolClassController.php:37` |
| `etapas_utilizadas` | Etapas utilizadas por componente | 🟢 `SchoolClassController.php:38` |
| `etapas_especificas` | Marcador de etapas específicas | 🟢 `SchoolClassController.php:39` |
| `codigo_inep_educacenso` | Código INEP geral da turma | 🟢 `SchoolClassController.php:40` |
| `codigo_inep_matutino` | Código INEP do turno matutino | 🟢 `SchoolClassController.php:41` |
| `codigo_inep_vespertino` | Código INEP do turno vespertino | 🟢 `SchoolClassController.php:42` |
| `etapa_educacenso` | Etapa do Censo Escolar | 🟢 `SchoolClassController.php:206` |
| `carga_horaria_total` | Carga horária total da turma | 🟢 `SchoolClassController.php:198-201` |
| `cod_curso_profissional` | Curso profissional | 🟢 `SchoolClassController.php:244-248` |
| `cod_eixo_curso_profissional` | Eixo do curso profissional | 🟢 `SchoolClassController.php:204` |
| `organizacao_curricular` | Lista de organizações curriculares | 🟢 `SchoolClassController.php:213-217` |
| `area_itinerario` | Lista de áreas de itinerário | 🟢 `SchoolClassController.php:257-263` |
| `nao_informar_educacenso` | Marcador de exclusão do Censo Escolar | 🟢 `SchoolClassController.php:285-287` |
| `visivel` | Marcador de visibilidade | 🟢 `SchoolClassController.php:289` |
| `data_inicio`, `data_fim` | Datas das etapas do calendário próprio | 🟢 `SchoolClassController.php:31-32` |
| `dias_letivos` | Dias letivos de cada etapa | 🟢 `SchoolClassController.php:30` |
| `ref_cod_modulo` | Módulo referenciado nas etapas | 🟢 `SchoolClassController.php:29` |

---

## 2. Contrato das regras de validação

| Regra | Gatilho | Mensagem | Fonte |
|-------|---------|----------|-------|
| `CanCreateSchoolClass` | Vaga em aberto em turma do mesmo turno, com a trava ativa na série | `Não é possivel cadastrar turmas, pois ainda existem {vagas} vagas em aberto na turma '{nome}' desta serie e turno. Tal limitação ocorre devido definição feita para estae scola e série.` | 🟢 `app/Rules/CanCreateSchoolClass.php:53` |
| `CanDeleteTurma` | Enturmações ativas na turma | `A turma possui enturmações ativas.` | 🟢 `app/Rules/CanDeleteTurma.php:33` |
| `CanAlterSchoolClassGrade` | Matrícula vinculada à série antiga | `Não é possível alterar a série da turma pois a mesma possui matrículas vinculadas.` | 🟢 `app/Rules/CanAlterSchoolClassGrade.php` |
| `CheckSchoolClassExistsByName` | Nome repetido no mesmo contexto | `O nome da turma já está sendo utilizado nesta escola, para o curso, série e anos informados.` | 🟢 `app/Rules/CheckSchoolClassExistsByName.php:45` |
| `DuplicateMultiGrades` | Séries repetidas na multisseriada | `Não é possível adicionar séries iguais em turmas multisseriadas.` | 🟢 `app/Rules/DuplicateMultiGrades.php` |
| `ExistsEnrollmentsInSchoolClassGrades` | Remoção de série com matrícula | `Não é possível remover a(s) série(s): {séries}, pois existem matrículas vinculadas.` | 🟢 `app/Rules/ExistsEnrollmentsInSchoolClassGrades.php` |
| `IncompatibleChangeToMultiGrades` | Conversão para multisseriada com matrícula na série original | `Não foi possível alterar a turma para ser multisseriada, pois a série original possui matrículas vinculadas.` | 🟢 `app/Rules/IncompatibleChangeToMultiGrades.php` |
| Mínimo de séries na multisseriada | Menos de duas séries | `Você deve selecionar pelo menos 2 séries em turmas multisseriadas.` | 🟢 `app/Services/SchoolClass/MultiGradesService.php:36` |
| Turno de turma integral | Alteração de turno com estudantes parciais e códigos INEP | `Esta turma possui turno {turno} e contém os códigos INEP dos turnos parciais informados. Para atender as regras de importação do censo, não é possível alterar o turno da turma.` | 🟢 `app/Http/Controllers/SchoolClassController.php:60` |

---

## 3. Contrato da listagem de turmas por escola

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Turma?turmas-por-escola` | `instituicao_id`, `ano`, `escola[]`, `turno_id`, `modified` | `{ "turmas": [...] }` | 🟢 `ieducar/modules/Api/Views/TurmaController.php:209-291` |

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | inteiro | Identificador da turma 🟢 `TurmaController.php:235` |
| `nome` | texto | Nome da turma 🟢 `TurmaController.php:236` |
| `ano` | inteiro | Ano letivo 🟢 `TurmaController.php:237` |
| `escola_id` | inteiro | Escola da turma 🟢 `TurmaController.php:238` |
| `turno_id` | inteiro | Turno da turma 🟢 `TurmaController.php:239` |
| `ref_cod_regente` | inteiro | Regente da turma 🟢 `TurmaController.php:240` |
| `max_aluno` | inteiro | Lotação máxima 🟢 `TurmaController.php:241` |
| `series_regras` | array | Séries com a regra de avaliação aplicável 🟢 `TurmaController.php:242-247` |
| `updated_at` | data e hora | Instante da última alteração 🟢 `TurmaController.php:248` |
| `deleted_at` | data e hora | Data de exclusão, nula quando a turma está ativa 🟢 `TurmaController.php:249-255` |

A ordenação é por atualização, por escola e por nome da turma. 🟢 `TurmaController.php:277`

---

## 4. Contrato da API de recurso de turma

| Método | Caminho | Entrada | Saída | Processo | Observação |
|--------|---------|---------|-------|----------|------------|
| GET | `/api/school-classes` | filtros de paginação | Coleção paginada de turmas | 586 | 🟢 `app/Http/Controllers/Api/SchoolClassController.php:16-21` |
| GET | `/api/school-classes/calendars` | `ref_cod_turma` ou `ano`, `ref_cod_escola`, `ref_cod_serie`, `ref_cod_curso` | Início e fim do calendário das turmas | 586 | 🟢 `SchoolClassController.php:22-48` |
| GET | `/api/school-classes/{id}/stages` | — | Etapas da turma | 586 | 🟢 `SchoolClassController.php:50-53` |
| GET | `/api/resource/school-classes` | filtros | Coleção simples de turma | — | 🟢 `app/Http/Controllers/Api/Resource/SchoolClass/ResourceSchoolClassController.php` |

### Filtros aceitos pelo builder da turma 🟢 `app/Models/Builders/LegacySchoolClassBuilder.php`

| Filtro | Método | Observação |
|--------|--------|------------|
| `active` | `active` | Turmas ativas 🟢 `:35-38` |
| `visible` | `visible` | Turmas visíveis 🟢 `:42-45` |
| `grade` | `whereGrade` | Série principal ou série vinculada 🟢 `:56-64` |
| `school` | `whereSchool` | Escola da turma 🟢 `:69-72` |
| `period` | `wherePeriod` | Turno da turma 🟢 `:77-80` |
| `shift` | `whereShift` | Turno da turma, filtro equivalente 🟢 `:170-173` |
| `course` | `whereCourse` | Curso principal ou curso das séries vinculadas 🟢 `:117-127` |
| `main_course` | `whereMainCourse` | Apenas o curso principal 🟢 `:132-135` |
| `institution` | `whereInstitution` | Instituição da turma 🟢 `:147-150` |
| `year` | `whereYearEq` | Ano letivo da turma 🟢 `:159-162` |
| `name` | `whereName` | Busca sem acento 🟢 `:192-197` |
| `day_week` | `whereDayWeek` | Dia da semana 🟢 `:205-208` |
| `school_user` | `whereSchoolUser` | Escola vinculada ao usuário 🟢 `:88-93` |
| `in_progress_year` | `whereInProgressYear` | Ano com andamento ativo na escola 🟢 `:98-104` |
| `in_progress` | `whereInProgress` | Turma em ano letivo em andamento 🟢 `:109-114` |

---

## 5. Contrato de persistência das entidades do módulo

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.turma` | `cod_turma` | escola, série, curso, nome, sigla, ano, lotação, multisseriada, ativo, visível, turno, horários, intervalo, dias da semana, tipo de atendimento, carga horária, etapa do Censo Escolar, pareceres, código de disciplina dispensada, marcações de AEE, organização curricular, formas de organização, classe especial, área de itinerário | `app/Models/LegacySchoolClass.php:86-163` |
| `pmieducar.turma_serie` | turma, escola, série | boletim, boletim diferenciado | `app/Models/LegacySchoolClassGrade.php:9-16` |
| `modules.professor_turma` | turma, servidor | ano, instituição, função exercida, tipo de vínculo, permissão de lançamento, data inicial, data final, área de itinerário, leciona itinerário técnico profissional, turno | `app/Models/LegacySchoolClassTeacher.php:11-28` |
| `modules.professor_turma_disciplina` | alocação, componente | vínculo | `app/Models/LegacySchoolClassTeacherDiscipline.php` |
| `modules.educacenso_cod_turma` | turma, turno | código INEP, nome no INEP, fonte | `app/Models/SchoolClassInep.php:11-22` |
| `pmieducar.turma_modulo` | turma | data de início, data de fim, sequencial | `app/Models/LegacySchoolClassStage.php` |
| `pmieducar.turma_tipo` | `cod_turma_tipo` | nome, sigla, ativo | `app/Models/LegacySchoolClassType.php:11-20` |
| `modules.componente_curricular_turma` | turma, componente | ano escolar, escola, carga horária, docente vinculado, etapas específicas, etapas utilizadas | `app/Models/LegacySchoolClass.php:573-580` |

---

## 6. Contrato de domínio do turno

| Valor | Constante | Rótulo | Sigla | Uso | Fonte |
|-------|-----------|--------|-------|-----|-------|
| 1 | `MORNING` | Matutino | M | Turno de turma e de enturmação parcial | 🟢 `src/Modules/SchoolClass/Period.php:8` |
| 2 | `AFTERNOON` | Vespertino | V | Turno de turma e de enturmação parcial | 🟢 `Period.php:9` |
| 3 | `NIGTH` | Noturno | N | Turno de turma | 🟢 `Period.php:10` |
| 4 | `FULLTIME` | Integral | I | Turno de turma, com possível código INEP por turno parcial | 🟢 `Period.php:11` |

---

## 7. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/SchoolClass/legacy-mapping.md`, seção 5, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/school-classes` | listagem com filtros por escola, ano, curso, série, turno e multisseriada 🟢 `app/Models/Builders/LegacySchoolClassBuilder.php` |
| GET | `/api/v1/educa/school-classes/{id}` | detalhe da turma, com vagas, docentes e séries 🟢 `app/Models/LegacySchoolClass.php:254-263` e `:383-386` |
| POST | `/api/v1/educa/school-classes` | cadastro de turma, com a trava de vagas 🟢 `app/Rules/CanCreateSchoolClass.php` |
| PUT | `/api/v1/educa/school-classes/{id}` | edição de horários e de capacidade 🟢 `app/Http/Controllers/SchoolClassController.php:22-137` |
| DELETE | `/api/v1/educa/school-classes/{id}` | exclusão lógica, com a trava de enturmações 🟢 `app/Rules/CanDeleteTurma.php` |
| GET | `/api/v1/educa/school-classes/{id}/vacancies` | cálculo de vagas, ausente no legado como recurso 🔴 |
| POST | `/api/v1/educa/school-classes/{id}/teachers` | alocação docente com disciplinas e permissões 🟢 `app/Models/LegacySchoolClassTeacher.php:11-28` |
| DELETE | `/api/v1/educa/school-classes/{id}/teachers/{teacherId}` | desalocação docente, ausente no legado como recurso 🔴 |
| POST | `/api/v1/educa/school-classes/check-availability` | verificação de conflito de horário antes da enturmação 🟢 `app/Services/SchoolClass/AvailableTimeService.php` |
| GET | `/api/v1/educa/school-classes/{id}/stages` | etapas do calendário da turma 🟢 `app/Models/LegacySchoolClass.php:426-429` |
| GET | `/api/v1/educa/school-classes/{id}/disciplines` | disciplinas da turma, pelos três caminhos de resolução 🟢 `LegacySchoolClass.php:612-640` |
