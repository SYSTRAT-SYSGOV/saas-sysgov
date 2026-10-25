# DiarioClasse (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de diário de classe e frequência. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: hub de lançamento por turma (processo 642)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Filtros | Instituição, escola, curso, série, turma, etapa, componente e matrícula opcional | 🟢 `ieducar/modules/Avaliacao/Views/DiarioController.php:14-17` |
| Regra de professor | Componente obrigatório quando o usuário é professor puro | 🟢 `DiarioController.php:12` |
| Navegação do cursor | Horizontal (padrão) ou vertical | 🟢 `DiarioController.php:19-32` |
| Botão de replicar | Visibilidade pela chave `legacy.app.faltas_notas.mostrar_botao_replicar` | 🟢 `DiarioController.php:34` |
| Permissão | Processo 642, nível 7, para alterações | 🟢 `DiarioApiController.php:1880-1887` |

## 2. Contrato AJAX: API do diário (`DiarioApiController`)

| Operação | Parâmetros | Efeito |
|----------|-----------|--------|
| `get-matriculas` | `instituicao_id`, `escola_id`, `curso_id`, `serie_id` (como `ref_cod_serie`), `turma_id`, `ano`, `etapa` e `matricula_id` ou `componente_curricular_id` | Lista de matrículas com situação por etapa (notas, faltas, pareceres, arredondamento) | 🟢 `DiarioApiController.php:313-325`, `:810-929` |
| `post-falta` | `etapa`, `matricula_id`, `att_value` (quantidade), `componente_curricular_id` (se regime por componente) | Grava e devolve situação do componente | 🟢 `:610-633` |
| `delete-falta` | `etapa`, `matricula_id`, `componente_curricular_id` (se por componente) | Remove com travas de etapas posteriores; inexistente devolve aviso | 🟢 `:733-757` |
| `post-situacao` | `matricula_id`, `new_status` | Troca de situação com bloqueio por matrícula (processo 630) | 🟢 `:1889-1908` |
| `get-frequencia` (outro controlador) | `id` da matrícula | Percentual pela função `modules.frequencia_da_matricula` | 🔴 `MatriculaController.php:497-503` |

### Validações do post-falta (em ordem)

1. Etapa e matrícula presentes; permissão de alteração (processo 642). 🟢 `:327-333`, `:1880-1887`
2. Fora do período somente com a permissão 999849. 🟢 `:287-299` e `app/Process.php:71`
3. Janela institucional do bloqueio do ano letivo: fora dela bloqueia antes de listar. 🟢 `:54-69`
4. Ano encerrado com a bandeira escolar bloqueia a grade inteira. 🟢 `:48-52`
5. Faltas de todas as etapas anteriores devem existir. 🟢 `:350-354` e `:135`
6. Quantidade negativa clampada para zero. 🟢 `:1082-1091`

### Validações do delete-falta

1. Nenhuma falta registrada em etapas posteriores. 🟢 `:252-274` e `:379-384`
2. Período de lançamento com a mesma exceção. 🟢 `:383`
3. Registro inexistente devolve aviso, não erro. 🟢 `:746-747`

---

## 3. Contrato de tela: falta individual (processo 642)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Contexto | Nome, curso, série, turma e etapa visíveis; componente mostrado no regime por componente | 🟢 `FaltaController.php:124-133` |
| Falta | Lista inteira de 0 a 100 | 🟢 `FaltaController.php:135` |
| Parecer | Campo texto obrigatório apenas na regra de parecer por etapa e componente | 🟢 `FaltaController.php:138-140`, `:167-174` |
| Gravação | Via serviço do boletim (`addFalta` + `save`), sucesso volta para o boletim | 🟢 `FaltaController.php:146-187` |
| Etapa sugerida | Registros existentes + 1 quando indefinida | 🟢 `FaltaController.php:85-93` |

---

## 4. Contrato de persistência

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `modules.falta_aluno` | `id` e `UNIQUE matricula_id` | `matricula_id`, `tipo_falta` smallint (1 geral, 2 por componente) | 🟢 migração `create_modules_falta_aluno_table` |
| `modules.falta_geral` | `falta_aluno_id` + `etapa` varchar(2) | `quantidade` integer padrão 0 | 🟢 migração `create_modules_falta_geral_table` |
| `modules.falta_componente_curricular` | `falta_aluno_id` + `componente_curricular_id` + `etapa` | `quantidade` integer padrão 0 | 🟢 migração |
| funções `modules.frequencia_da_matricula` / `modules.frequencia_por_componente` | por matrícula e por matrícula+componente+turma | percentual truncado a uma casa | 🟢 funções SQL |
| `release_periods` + `release_period_schools` + `release_period_dates` | ano + tipo de etapa + etapa (+ escola) | janela `start_date`/`end_date` | 🟢 migrações `2020_06_24_1703xx/1704xx/1705xx` |
| `pmieducar.falta_atraso` (servidor — unit `Servidores`) | `cod_falta_atraso` | tipo, data, horas, minutos, `justificada`, função do servidor, ativo | 🟢 migração e tela do processo 635 |
| `pmieducar.falta_atraso_compensado` (servidor — unit `Servidores`) | `cod_compensado` | servidor, escola, `data_inicio`, `data_fim`, ativo | 🟢 migração e tela |

---

## 5. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/DiarioClasse/legacy-mapping.md`:

### Endpoints REST

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| POST | `/api/v1/classes/{classId}/lessons` (aula + chamada em lote) | Diário atômico novo 🔴 `legacy-mapping.md:394-432` |
| POST | `/api/v1/enrollments/{enrollmentId}/justifications` | Atestados de aluno novo 🔴 `:417-433` |
| GET | grade de matrículas equivalente ao `get-matriculas` | 🟢 `DiarioApiController.php:810-929` |
| POST/DELETE | falta consolidada equivalente ao `post-falta`/`delete-falta` | 🟢 `:610-633`, `:733-757` |
| GET | frequência parametrizada da matrícula | 🔴 `MatriculaController.php:497-503` (sem interpolação) |

### Tipos TypeScript (`packages/sdk/src/types/educa/diario.ts`)

`AttendanceStatus` (PRESENT, ABSENT, JUSTIFIED_ABSENT), `JustificationType` (MEDICAL, LEGAL_SUMMONS, BEREAVEMENT, RELIGIOUS, OTHER), `LessonType` (REGULAR, REPOSITION, EXTRA, RECOVERY), `AttendanceWarningLevel` (NORMAL, ATTENTION, CRITICAL_EVASION_RISK) e as interfaces `ClassLesson`, `AttendanceRecord`, `AbsenceJustification`, `StageAbsenceSummary`. 🟢 `_reversa_sdd/DiarioClasse/legacy-mapping.md:440-510`

### De/para das tabelas

`modules.falta_aluno` → mestre de consolidações (regime preservado); `modules.falta_geral`/`falta_componente_curricular` → `educa_stage_absence_summaries` com a etapa 'Rc' mapeada como recuperação; `release_period_*` → motor de bloqueios com escopo por escola/etapa/tipo; aulas, chamadas e justificativas de aluno → tabelas novas sem origem. 🔴 (inversões e decisões pendentes)

---

## 6. Gaps do contrato em relação ao bastão

| Gap | Bastão defende | Legado mostra |
|-----|----------------|---------------|
| Diário atômico | `educa_class_lessons` com BNCC | Não existe entidade de aula 🔴 |
| Chamada por aula | `educa_attendance_records` única por aula | Faltas só por etapa 🔴 |
| Atestados de aluno | Vigência, abono, CID, anexo | Só flag `justificada` do servidor 🔴 |
| Aulas geminadas | `lesson_count = 2` dobra a falta | Sem o conceito 🔴 |
| Alerta de evasão | `warning_level` na consolidação | Percentual, sem nível 🔴 |
| Períodos com exceção | Motor novo com prorrogação auditada | Janela opt-in + permissão 999849 🟢 |
| Etapa | `SMALLINT` | varchar(2) com 'Rc' 🔴 |
