# ComponenteCurricular (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de matriz curricular. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: cadastro do componente (processo 946)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Instituição | Lista obrigatória | 🟢 `ieducar/modules/ComponenteCurricular/Views/EditController.php:82-89` |
| Nome | Texto obrigatório, máximo 500 no campo, validado de 5 a 200 | 🟢 `EditController.php:92-102` e `Componente.php:60` |
| Abreviação | Texto obrigatório, máximo 25 no campo, validada de 2 a 15 | 🟢 `EditController.php:105-115` e `Componente.php:61` |
| Base curricular | Rádio com quatro opções, padrão base nacional comum | 🟢 `EditController.php:118-125` |
| Área de conhecimento | Lista com o sufixo "(agrupador)" nas áreas agrupadoras | 🟢 `EditController.php:128-145` |
| Disciplina Educacenso | Lista do enumerador INEP, entrada vazia admitida | 🟢 `EditController.php:148-155` |
| Ordenamento | Número, vazio gravado como 99999 | 🟢 `EditController.php:158-166` e `:211-217` |
| Desconsiderar na progressão | Bandeira com padrão falso | 🟢 `EditController.php:168-177` e `:223` |
| Cor | Paleta da configuração com padrão branco | 🟢 `EditController.php:179-186` |
| Redirecionamento no sucesso | Para a listagem legada | 🟢 `EditController.php:196-203` |

---

## 2. Contrato de tela: matriz de carga por série (mesmo processo)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Agrupamento | Séries agrupadas por curso com rótulo do curso | 🟢 `AnoController.php:79-102` e `:176-205` |
| Série | Caixa de seleção por série com a carga horária de até 5 caracteres | 🟢 `AnoController.php:187-201` |
| Sincronização | Apaga as séries desmarcadas, insere as novas e mantém as existentes com marcação de registro antigo | 🟢 `AnoController.php:226-252` |
| Validação | Carga mínima de um quando a série está vinculada | 🟢 `Model/AnoEscolar.php:48-53` |
| Cancelamento | Volta ao detalhe do componente | 🟢 `AnoController.php:118-127` |

---

## 3. Contrato de tela: cadastro de área (processo 945)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Nome | Texto obrigatório de 5 a 60 validado | 🟢 `EditController.php (Área):73-83` e `Area.php:19` |
| Seção | Texto opcional de até 50 | 🟢 `:86-96` |
| Ordenamento | Texto opcional, vazio gravado como 99999 | 🟢 `:99-109` e `:129-135` |
| Agrupador de descritores | Bandeira com padrão falso | 🟢 `:111-120` e `:141-145` |
| Exclusão | Travada com componentes vinculados | 🟢 `:169-181` |

---

## 4. Contrato da API da matriz da série (`/module/Api/ComponentesSerie/`)

| Operação | Método e papel | Proteções | Fonte |
|----------|----------------|-----------|-------|
| `atualiza-componentes-serie` | POST — grava a matriz com carga, horas por falta, tipo de nota e anos letivos | Turmas vinculadas, lançamentos do diário legado, iDiário, por ano removido | 🟢 `ComponentesSerieController.php:16-126` e `:497-553` |
| `remove-componentes-serie` | POST — remove um componente da série | Mesma validação, depois cascata nas escolas e turmas | 🟢 `:425-446` |
| `exclui-componentes-serie` | POST — apaga toda a matriz da série | **Sem travas** nesta rota | 🔴 `:257-295` |
| `replica-componentes-adicionados-escolas` | POST — replica na habilitação das escolas | União de anos letivos | 🟢 `:128-183` |
| `atualiza-componentes-escolas` | POST — replica em escolas escolhidas | União de anos letivos | 🟢 `:138-150` |
| `existe-dispensa` | GET — dispensas ativas por componente removido | Devolve matrícula, ano e aluno | 🟢 `:308-357` |
| `existe-dependencia` | GET — existe dependência na série e escola | Bandeira booleana | 🟢 `:297-306` |
| `get-escolas-by-serie` | GET — escolas ativas da série | Lista com nome resolvido | 🟢 `:359-373` |

Payload de componente da matriz: `id`, `carga_horaria`, `hora_falta`, `tipo_nota`, `anos_letivos` (arranjo de inteiros). 🟢 `ComponentesSerieController.php:20-28`

---

## 5. Contrato de persistência

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `modules.area_conhecimento` | `id` | instituição, nome, seção, ordenamento, agrupador | 🟢 `app/Models/LegacyKnowledgeArea.php` |
| `modules.componente_curricular` | `id` | instituição, área, nome, abreviação, base, código INEP, ordenamento, bandeira de progressão, cor | 🟢 `app/Models/LegacyDiscipline.php` |
| `modules.componente_curricular_ano_escolar` | componente + ano escolar | carga, **tipo_nota**, anos_letivos (smallint[]), **hora_falta** | 🟢 `app/Models/LegacyDisciplineAcademicYear.php:46-55` |
| `modules.componente_curricular_turma` | componente + turma | ano escolar e escola denormalizados, carga própria, docente vinculado, etapas específicas e utilizadas, `updated_at` | 🟢 `app/Models/LegacyDisciplineSchoolClass.php` |
| `pmieducar.escola_serie_disciplina` | escola + série + disciplina | ativo, anos_letivos | 🟢 `app/Models/LegacySchoolGradeDiscipline.php` |
| `migrated_disciplines` | mapa antigo → novo | disciplina antiga e nova, série, ano, autor | 🟢 `app/Models/MigratedDiscipline.php` |

Nota de contrato: `tipo_nota` e `hora_falta` pertencem à matriz da série; `hora_falta` não está no desenho do bastão. 🟡 `LegacyDisciplineAcademicYear.php:46-55` e `_reversa_sdd/ComponenteCurricular/legacy-mapping.md:63-71`

---

## 6. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/ComponenteCurricular/legacy-mapping.md`:

### Endpoints REST (prefixo `/api/v1/educa/`)

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET/POST | `/knowledge-areas` | Áreas do conhecimento 🟢 `Area.php` |
| GET/POST | `/curricular-components` | Componentes 🟢 `EditController.php (Componente)` |
| PUT | `/curricular-components/{id}/matrix` | Matriz por série 🟢 `ComponentesSerieController` |
| POST | `/curricular-components/{id}/matrix/homologate` | Homologação com validação de carga 🔴 |
| PUT | `/school-classes/{id}/disciplines` | Sincronização por turma 🟢 `TurmaDataMapper::bulkUpdate` |
| GET | `/school-classes/{id}/disciplines/removal-check` | Remoção com dispensas e dependências 🟢 `:297-357` |
| POST | `/grades/{id}/disciplines/replicate` | Replicação nas escolas 🟢 `:152-183` |

### Tipos TypeScript (`packages/sdk/src/types/educa/curriculum.ts`)

Tipos previstos: `KnowledgeArea` (com `is_descriptor_group`), `CurricularComponent` (com `base_type` e `inep_code`), `CourseMatrixDiscipline` (com `grading_type`, `academic_years`, `hour_per_absence`), `ClassDiscipline` (com `teacher_id`, `has_specific_stages`, `stages_json`). 🟢 `_reversa_sdd/ComponenteCurricular/legacy-mapping.md:28-84`

### De/para das tabelas

`modules.area_conhecimento` a `educa_knowledge_areas`; `modules.componente_curricular` a `educa_curricular_components`; `modules.componente_curricular_ano_escolar` a `educa_course_matrix_disciplines` mais `hour_per_absence`; `modules.componente_curricular_turma` a `educa_class_disciplines`; `pmieducar.escola_serie_disciplina` a uma entidade de habilitação escola e série não prevista no bastão. 🟢/🔴
