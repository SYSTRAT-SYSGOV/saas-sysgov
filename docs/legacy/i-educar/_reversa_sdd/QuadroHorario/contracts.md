# QuadroHorario (i-Educar legado), Contracts

> Contratos de dados, serviços e interfaces do subsistema de quadro de horários. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de dados

### 1.1 Cabeçalho do quadro

| Coluna legado (`pmieducar.quadro_horario`) | Tipo | Semântica | Alvo sugerido (bastão) | Confiança |
|---|---|---|---|---|
| `cod_quadro_horario` | serial | Chave | id (UUID) | 🟢 |
| `ref_cod_turma` | integer NOT NULL | Turma da grade | school_class_id | 🟢 |
| `ano` | integer (opcional no legado) | Ano letivo | academic_year_id (obrigatório no alvo) | 🟡 |
| `ativo` | smallint default 1 | Ativo/inativo (única situação) | status DRAFT/PUBLISHED/ARCHIVED (novo) | 🔴 |
| `ref_usuario_cad` / `ref_usuario_exc` | integer | Autores | created_by/deleted_by | 🟢 |
| `data_cadastro` / `data_exclusao` | timestamps | Ciclo de vida | created_at/deleted_at | 🟢 |

Sem `version` e sem `published_at` no legado. Fonte: migração `create_pmieducar_quadro_horario_table` contra `_reversa_sdd/QuadroHorario/legacy-mapping.md:151-158`.

### 1.2 Slots (aulas)

| Coluna legado (`pmieducar.quadro_horario_horarios`) | Tipo | Semântica | Alvo sugerido | Confiança |
|---|---|---|---|---|
| `ref_cod_quadro_horario` + `sequencial` | PK composta | Vínculo + ordinal | timetable_id + slot_sequence | 🟢 |
| `ref_cod_disciplina` | integer NOT NULL | Componente da aula | discipline_id | 🟢 |
| `ref_cod_escola` | integer NOT NULL | Escola da aula | (implicito em `timetable` e denormalizado) | 🟢 |
| `ref_cod_serie` | integer NOT NULL | Série da aula | grade_stage_id | 🟢 |
| `ref_cod_instituicao_servidor` | integer NOT NULL | Instituição do docente | tenant-aware employee/vinculated institution | 🟢 |
| `ref_servidor` | integer NOT NULL | Docente titular | teacher_id | 🟢 |
| `ref_cod_instituicao_substituto` / `ref_servidor_substituto` | integers (opcionais) | Substituto pontual por aula | substitute_teacher_id no histórico (`educa_teacher_substitutions`) | 🟡 |
| `dia_semana` | integer NOT NULL (1–7) | Dia (1 dom a 7 sáb) | day_of_week TINYINT | 🟢 |
| `hora_inicial` / `hora_final` | time NOT NULL | Intervalo | start_time/end_time | 🟢 |
| `ativo`, `data_cadastro`, `data_exclusao`, `ref_usuario_*`* | — | Ciclo de vida | is_active/created_at/... | 🟢 |

Asterisco: o insert legado das aulas não grava autor (só datas). Índice de busca por docente e intervalo (`quadro_horario_horarios_busca_horarios_idx`). Fonte: migração + FKs.

### 1.3 Rascunho (`quadro_horario_horarios_aux`) — sem par no alvo

| Coluna | Semântica | Confiança |
|---|---|---|
| Mesmo formato dos slots (quadro, sequencial, disciplina, escola, série, instituição, servidor, dia, hora) | Estado de trabalho da tela | 🟢 |
| `identificador` varchar(30) | Chave de sessão do rascunho | 🟢 |
| `data_cadastro` | TTL de 3 horas (`excluirRegistrosAntigos`) | 🟢 |

Fonte: migração `_aux` e `clsPmieducarQuadroHorarioHorariosAux.php:68`, `:399-405`.

---

## 2. Contratos de serviço

| Serviço/operação | Entradas | Efeito | Confiança |
|---|---|---|---|
| `clsPmieducarQuadroHorario->cadastra()` | turma, ano, usuário | Cria cabeçalho ativo | 🟢 |
| `clsPmieducarQuadroHorario->excluir()` | quadro, usuário | Inativa com autor | 🟢 |
| `clsPmieducarQuadroHorarioHorarios->cadastra()/edita()/exclui()/excluirTodos()` | slot + flags de ativo | Insert/update/inativação de aulas | 🟢 |
| `retornaHorario()` | instituição, escola, série, turma, dia | Slots ordenados por hora para a matriz | 🟢 |
| `clsPmieducarQuadroHorarioHorariosAux->cadastra()/excluiRegistro()/excluirTodos()/excluirRegistrosAntigos()` | rascunho | Estado de trabalho + limpeza TTL 3 h | 🟢 |
| `Portabilis_Business_Professor::isProfessor()/isOnlyProfessor()` | usuário | Papel docente (função professor) | 🟢 `:5-49` |
| `...::escolasAlocado()/cursosAlocado()/seriesAlocado()/turmasAlocado()/componentesCurricularesAlocado()` | usuário + contexto | Filtros por quadro (flag) ou por alocação | 🟢 `:51-345` |
| Validador de capacidade (pesquisa de servidor) | servidor, escola, período, horas/dia | Carga de alocação ≥ soma dos horários (rascunho também somado) | 🟢 `educar_pesquisa_servidor_lst.php:415-470` |
| `necessarioVinculoTurma()` | instituição | Leitura da bandeira | 🟢 `:370-374` |

---

## 3. Contratos de interface (telas)

| Tela | Processo | Nível | Papel | Confiança |
|------|----------|-------|-------|-----------|
| `educar_quadro_horario_lst.php` | menu Servidores | ≤7 | Listagem + matriz semanal da turma | 🟢 |
| `educar_quadro_horario_cad.php` | 641 | 7 | Cabeçalho do quadro | 🟢 |
| `educar_quadro_horario_horarios_cad.php` | 641 | 7 | Aulas por slot (rascunho + gravação) | 🟢 |
| `educar_pesquisa_servidor_lst.php` | — | — | Pesquisa de servidor com validação de capacidade | 🟢 |
| Dropdowns dinâmicos (`DynamicInput`) | — | — | Filtros docente by quadro/alocação | 🟢 |

---

## 4. Contratos cruzados com outras units

| Unit | Contrato | Direção | Confiança |
|------|----------|---------|-----------|
| `Servidores` | Servidor, função professor, alocação (carga, hora-atividade, excedentes), disciplina habilitada, afastamento com substituto | Entradas/fonte | 🟢 |
| `Configuracao` | Bandeira `exigir_vinculo_turma_professor` (tabela `instituicao`) | Entrada | 🟢 |
| `ComponenteCurricular` | Componentes por série/turma | Entrada | 🟢 |
| `SchoolClass`/`Stages`/`School`/`AcademicYear` | Turma, série, escola, ano | Entradas | 🟢 |
| `DiarioClasse`/`Avaliacao` | Consumidores dos filtros docente derivados | Consumidor | 🟢 |
| `People` | Nome do servidor | Entrada | 🟢 |

---

## 5. Lacunas de contrato

- Detector de choque sobreposto (turma/professor) e validação prévia: obra nova no alvo; sem paridade legada. 🔴
- Versionamento de grade (situação, versão, publicação): novo; legado tem só `ativo`. 🔴
- Histórico de substituição (motivo, período, turma, disciplina): novo; legado só sobrepõe o campo. 🟡
- Unidade de medidas de carga (carga horária semanal, hora-atividade, excedentes) pertence à alocação, detalhada na unit `Servidores`. 🟢
- A validação de capacidade e a operação de rascunho convivem num mesmo fluxo sem transação; alvos precisam decidir como portar o rascunho (sessão backend ou autosave). 🟡
