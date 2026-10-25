# Stages (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de estrutura acadêmica. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato da API de série (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Serie?series` | `instituicao_id`, `escola_id[]`, `ano`, `curso_id[]`, `ativo`, `modified` | `{ "series": [...] }` | 🟢 `ieducar/modules/Api/Views/SerieController.php:12-104` |
| GET | `/module/Api/Serie?series-curso` | `curso_id` | `{ "series": [...] }` | 🟢 `SerieController.php:196-222` |
| GET | `/module/Api/Serie?series-escola` | `escola_id`, `ano` | `{ "series": [...] }` | 🟢 `SerieController.php:136-195` |
| GET | `/module/Api/Serie?series-curso-sem-componentes` | `curso_id` | `{ "series": [...] }` | 🟢 `SerieController.php:106-134` |
| GET | `/module/Api/Serie?bloqueio-faixa-etaria` | `instituicao_id`, `serie_id`, `data_nascimento`, `ano` | `{ "bloqueado", "mensagem_bloqueio" }` | 🟢 `SerieController.php:248-280` |
| GET | `/module/Api/Serie?series-curso-grouped` | — | `{ "options": [...] }` agrupado por curso | 🟢 `SerieController.php:229-246` |
| GET | `/module/Api/Serie?etapa-educacenso` | `serie_id` | `{ "etapa_educacenso": 14 }` | 🟢 `SerieController.php:224-227` |

### Atributos da série na listagem 🟢 `ieducar/modules/Api/Views/SerieController.php:91-98`

| Campo legado | Campo de saída | Tipo | Observação |
|--------------|----------------|------|------------|
| `cod_serie` | `id` | inteiro | Identificador da série |
| `nm_serie` | `nome` | texto | Nome em maiúsculas, com a descrição entre parênteses |
| `idade_ideal` | `idade_padrao` | inteiro | Idade ideal da série |
| `ref_cod_curso` | `curso_id` | inteiro | Curso da série |
| `updated_at` | `updated_at` | data e hora | Data mais recente entre a série e a oferta |
| `data_exclusao` | `deleted_at` | data e hora | Nula quando a série está ativa |

### Formato da verificação de faixa etária 🟢 `ieducar/modules/Api/Views/SerieController.php:269-278`

```json
{
  "bloqueado": false,
  "mensagem_bloqueio": ""
}
```

| Campo | Tipo | Observação |
|-------|------|------------|
| `bloqueado` | booleano | Verdadeiro apenas quando a série define `bloquear_matricula_faixa_etaria` |
| `mensagem_bloqueio` | texto | `A idade do aluno encontra-se fora da faixa etária pré-definida para esta série.` |

### Formato do agrupamento de séries por curso 🟢 `ieducar/modules/Api/Views/SerieController.php:240-245`

```json
{
  "options": {
    "1": { "nome": "ENSINO FUNDAMENTAL", "series": { "10": "1º ANO" } }
  }
}
```

---

## 2. Contrato da API de curso (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Curso?cursos` | `instituicao_id`, filtros | Lista de cursos | 🟢 `ieducar/modules/Api/Views/CursoController.php:23-172` |
| GET | `/module/Api/Curso?cursos-multiple-search` | filtros | Busca múltipla de cursos | 🟢 `CursoController.php:173-192` |
| GET | `/module/Api/Curso?modalidade-curso` | `curso_id` | Modalidade do curso | 🟢 `CursoController.php:193-206` |
| GET | `/module/Api/Curso?cursos-da-escola` | `escola_id`, `ano` | Cursos ofertados pela escola | 🟢 `CursoController.php:207-224` |
| GET | `/module/Api/Curso?dados-do-curso` | `curso_id` | Dados do curso | 🟢 `CursoController.php:225-238` |

---

## 3. Contrato da API de recurso de curso e de série

| Método | Caminho | Entrada | Saída | Processo | Observação |
|--------|---------|---------|-------|----------|------------|
| GET | `/api/courses` | filtros de paginação | Coleção paginada de cursos | 566 | 🟢 `app/Http/Controllers/Api/CourseController.php:16-21` |
| GET | `/api/grades` | filtros de paginação | Coleção paginada de séries | 583 | 🟢 `app/Http/Controllers/Api/GradeController.php:16-21` |
| GET | `/api/resource/courses` | filtros | Coleção simples de curso | — | 🟢 `app/Http/Controllers/Api/Resource/Course/ResourceCourseController.php` |
| GET | `/api/resource/grades` | filtros | Coleção simples de série | — | 🟢 `app/Http/Controllers/Api/Resource/Grade/ResourceGradeController.php` |

### Filtros aceitos pelo builder do curso 🟢 `app/Models/Builders/LegacyCourseBuilder.php`

| Filtro | Método | Observação |
|--------|--------|------------|
| `name` | `whereName` | Busca sem acento 🟢 `:25` |
| `institution` | `whereInstitution` | Instituição do curso 🟢 `:33` |
| `course` | `whereCourse` | Identificador do curso 🟢 `:49` |
| `standard_calendar` | `whereStandardCalendar` | Padrão de calendário 🟢 `:57` |
| `school` | `whereSchool` | Escola que oferta o curso, com ano opcional 🟢 `:65` |
| `year` | `whereYearEq` | Ano letivo 🟢 `:75` |
| `active` | `active` e `whereActive` | Situação do curso 🟢 `:107` e `:112` |
| `eja` | `isEja` | Curso da Educação de Jovens e Adultos 🟢 `:120` |

### Filtros aceitos pelo builder da série 🟢 `app/Models/Builders/LegacyGradeBuilder.php`

| Filtro | Método | Observação |
|--------|--------|------------|
| `name` | `whereName` | Busca sem acento 🟢 `:14-17` |
| `school` | `whereSchool` | Escola que habilita a série 🟢 `:29-34` |
| `school_exclude` | `whereSchoolExclude` | Escola que não habilita a série 🟢 `:19-24` |
| `grade_exclude` | `whereGradeExclude` | Exclui a própria série 🟢 `:40-43` |
| `course` | `whereCourse` | Curso da série 🟢 `:45-48` |
| `active` | `active` e `whereActive` | Situação da série 🟢 `:50-55` |

---

## 4. Contrato de persistência das entidades do módulo

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.nivel_ensino` | `cod_nivel_ensino` | nome, descrição, ativo | 🟢 `app/Models/LegacyEducationLevel.php:8-19` |
| `pmieducar.tipo_ensino` | `cod_tipo_ensino` | nome, atividade complementar, ativo | 🟢 `app/Models/LegacyEducationType.php:11-22` |
| `pmieducar.curso` | `cod_curso` | nome, sigla, descrição, nível, tipo, regime, número de etapas, carga horária, hora de falta, modalidade, padrão de ano escolar, multisseriado, instituição | 🟢 `app/Models/LegacyCourse.php:54-70` |
| `pmieducar.serie` | `cod_serie` | nome, descrição, curso, etapa no curso, concluinte, carga horária, intervalo, idades, dias letivos, alerta e bloqueio de faixa etária, exigir INEP, importar de pré-matrícula, etapa do Censo, regra de avaliação e regra diferenciada | 🟢 `app/Models/LegacyGrade.php:46-70` |
| `pmieducar.sequencia_serie` | origem, destino | ativo, autor de cadastro, data de exclusão | 🟢 `app/Models/LegacyGradeSequence.php:14-30` |
| `pmieducar.modulo` | `cod_modulo` | nome do tipo, número de etapas, de meses e de semanas, descrição, instituição, ativo | 🟢 `app/Models/LegacyStageType.php:18-30` |
| `pmieducar.ano_letivo_modulo` | escola, ano, módulo | sequencial, data de início, data de fim, dias letivos | 🟢 `app/Models/LegacyAcademicYearStage.php:19-29` |
| `pmieducar.turma_modulo` | `ref_cod_turma` | módulo, sequencial, data de início, data de fim, dias letivos | 🟢 `app/Models/LegacySchoolClassStage.php:15-24` |
| `modules.regra_avaliacao_serie_ano` | série, ano letivo | regra de avaliação, regra de avaliação diferenciada | 🟢 `app/Models/LegacyGrade.php:88-122` |
| `modules.etapas_educacenso` | `id` | nome | 🟢 `app/Models/LegacyEducacensoStages.php:9-18` |
| `modules.etapas_curso_educacenso` | curso, etapa | vínculo | 🟢 `app/Models/LegacyCourseEducacensoStage.php:11-21` |
| `pmieducar.dispensa_etapa` | `ref_cod_dispensa` | etapa, disciplina | 🟢 `app/Models/LegacyExemptionStage.php:10-20` |
| `pmieducar.escola_curso` | escola, curso | ativo, autorização, anos letivos | 🟢 `app/Models/LegacySchoolCourse.php:16-28` |
| `pmieducar.escola_serie` | escola, série | ativo, anos letivos, horário de início, de fim e de intervalo, travar enturmação sem vagas, travar abertura de turma | 🟢 `app/Models/LegacySchoolGrade.php:18-33` |

---

## 5. Contrato de domínio da estrutura acadêmica

| Conceito | Atributos | Observação |
|----------|-----------|------------|
| Nível de ensino | nome, descrição | Sem código canônico no legado 🟢 `app/Models/LegacyEducationLevel.php:12-17` |
| Tipo de ensino | nome, atividade complementar | 🟢 `app/Models/LegacyEducationType.php:15-19` |
| Curso | regime, número de etapas, carga horária, fração de hora da falta, padrão de calendário, multisseriado | 🟢 `app/Models/LegacyCourse.php:54-70` |
| Série | ordem no curso, carga horária, intervalo, faixa etária, concluinte, etapa do Censo | 🟢 `app/Models/LegacyGrade.php:46-70` |
| Sequência de séries | origem, destino, situação | 🟢 `app/Models/LegacyGradeSequence.php:16-21` |
| Tipo de etapa | nome, número de etapas, de meses e de semanas | 🟢 `app/Models/LegacyStageType.php:21-29` |
| Etapa do ano letivo | sequencial, data de início, data de fim, dias letivos | 🟢 `app/Models/LegacyAcademicYearStage.php:20-25` |
| Etapa da turma | módulo, sequencial, data de início, data de fim, dias letivos | 🟢 `app/Models/LegacySchoolClassStage.php:16-21` |

### Domínio de etário

| Faixa | Faixa etária da série | Faixa etária mínima | Faixa etária ideal | Alerta | Bloqueio |
|-------|------------------------|----------------------|---------------------|--------|----------|
| Educação Infantil | 0 a 5 | 0 | 3 | opcional | opcional |
| Ensino Fundamental | 6 a 10 | 6 | 7 | opcional | opcional |
| Ensino Fundamental | 11 a 14 | 11 | 12 | opcional | opcional |
| Ensino Médio | 15 a 17 | 15 | 15 | opcional | opcional |

Fonte: `app/Models/LegacyGrade.php:57-58` e `:63-64` e `:65`. Os valores acima são os esperados pela LDB e não foram lidos em dados do banco. 🟡

### Domínio de padrão de divisão do ano letivo

| Valor | Significado | Fonte |
|-------|-------------|-------|
| `padrao_ano_escolar` verdadeiro | O curso segue o calendário padrão do ano letivo da escola | 🟢 `app/Models/LegacyCourse.php:110-115` |
| `padrao_ano_escolar` falso | O curso tem calendário próprio, por turma | 🟢 `app/Models/LegacyCourse.php:110-115` |

---

## 6. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/Stages/legacy-mapping.md`, seção 4, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/education-levels` | listagem de níveis de ensino 🟢 `app/Models/LegacyEducationLevel.php` |
| POST | `/api/v1/educa/education-levels` | cadastro de nível 🟢 `app/Models/LegacyEducationLevel.php` |
| GET | `/api/v1/educa/courses` | listagem de cursos, com filtro por instituição, escola, ano e EJA 🟢 `app/Models/Builders/LegacyCourseBuilder.php` |
| POST | `/api/v1/educa/courses` | cadastro de curso, com a validação da LDB 🟢 `app/Models/LegacyCourse.php:54-70` |
| GET | `/api/v1/educa/courses/{id}/academic-structure` | árvore de estrutura acadêmica do tenant, ausente no legado como recurso 🔴 |
| GET | `/api/v1/educa/grades` | listagem de séries, por escola, curso, ano e alteração 🟢 `ieducar/modules/Api/Views/SerieController.php:12-104` |
| POST | `/api/v1/educa/grades` | cadastro de série 🟢 `app/Models/LegacyGrade.php:46-70` |
| GET | `/api/v1/educa/grades/{id}/age-range-check` | verificação de faixa etária, com alerta e bloqueio 🟢 `SerieController.php:248-280` |
| GET | `/api/v1/educa/grade-sequences` | listagem da matriz de progressão 🟢 `app/Models/Builders/LegacyGradeSequenceBuilder.php` |
| POST | `/api/v1/educa/grade-sequences` | cadastro de regra de progressão 🟢 `app/Models/LegacyGradeSequence.php` |
| PUT | `/api/v1/educa/grade-sequences/{id}` | atualização de regra de progressão 🟢 `app/Models/LegacyGradeSequence.php` |
| GET | `/api/v1/educa/stage-types` | listagem de tipos de etapa 🟢 `app/Models/LegacyStageType.php` |
| POST | `/api/v1/educa/stage-types` | cadastro de tipo de etapa 🟢 `app/Models/LegacyStageType.php` |
| GET | `/api/v1/educa/schools/{id}/academic-year-stages` | etapas do ano letivo da escola 🟢 `app/Models/LegacyAcademicYearStage.php` |
| GET | `/api/v1/educa/school-classes/{id}/stages` | etapas da turma 🟢 `app/Models/LegacySchoolClassStage.php` |
| PUT | `/api/v1/educa/school-classes/{id}/stages` | gravação das etapas da turma, com a validação de notas 🟢 `app/Services/SchoolClassStageService.php:11-42` |
| POST | `/api/v1/educa/courses/{id}/calendar-migration` | cópia das etapas da escola para as turmas 🟢 `app/Services/SchoolClassStageService.php:84-121` |
| GET | `/api/v1/educa/inep-stages` | catálogo de etapas do Censo Escolar 🟢 `app/Models/LegacyEducacensoStages.php` |
| PUT | `/api/v1/educa/courses/{id}/inep-stages` | de/para de etapas do Censo Escolar 🟢 `app/Models/LegacyCourseEducacensoStage.php` |
