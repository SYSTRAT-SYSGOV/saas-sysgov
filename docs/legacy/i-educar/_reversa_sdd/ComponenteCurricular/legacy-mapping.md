# Mapeamento do Legado: Componentes Curriculares e Áreas do Conhecimento (`ComponenteCurricular`)

> Módulo de gestão da matriz curricular, áreas do conhecimento (BNCC), componentes curriculares e vínculos com séries e turmas.

---

## 1. Contexto e Objetivo no SYSGOV (`SYS-Educa`)

No i-Educar legado, o módulo `ComponenteCurricular` e o pacote satélite `AreaConhecimento` operam no schema `modules` (`modules.area_conhecimento`, `modules.componente_curricular`, `modules.componente_curricular_ano_escolar`, `modules.componente_curricular_turma`).

No **SYSGOV**, este domínio é incorporado ao módulo acadêmico canônico `SYS-Educa` (`apps/api/Modules/Educa`) com suporte estrito a multi-tenancy (`tenant_id`), separação entre matriz padrão da rede (SME) e execução operacional na escola/turma, com compliance total à **BNCC** (Base Nacional Comum Curricular), **LDB 9.394/1996** (mínimo de 800 horas anuais) e **Educacenso/INEP**.

---

## 2. Entidades Legadas vs. Modelos Canônicos SYSGOV

| Tabela Legada (`modules`) | Entidade Legada (PHP) | Tabela Canônica SYSGOV (`apps/api`) | Model Eloquent SYSGOV |
| :--- | :--- | :--- | :--- |
| `modules.area_conhecimento` | `AreaConhecimento_Model_Area` | `educa_knowledge_areas` | `App\Modules\Educa\Models\KnowledgeArea` |
| `modules.componente_curricular` | `ComponenteCurricular_Model_Componente` | `educa_curricular_components` | `App\Modules\Educa\Models\CurricularComponent` |
| `modules.componente_curricular_ano_escolar` | `ComponenteCurricular_Model_AnoEscolar` | `educa_course_matrix_disciplines` | `App\Modules\Educa\Models\CourseMatrixDiscipline` |
| `modules.componente_curricular_turma` | `ComponenteCurricular_Model_Turma` | `educa_class_disciplines` | `App\Modules\Educa\Models\ClassDiscipline` |

---

## 3. Dicionário de Mapeamento de Colunas

### 3.1. Áreas do Conhecimento (`educa_knowledge_areas`)

| Coluna Legada (`modules.area_conhecimento`) | Coluna Canônica SYSGOV | Tipo SYSGOV | Regra de Migração & Transformação |
| :--- | :--- | :--- | :--- |
| `id` | `legacy_id` | `bigint unsigned nullable` | ID legado para auditoria e rastreabilidade |
| *(novo)* | `id` | `uuid` | Chave primária UUID v7 |
| `instituicao_id` | `tenant_id` | `uuid` | Resolução pelo tenant ativo |
| `nome` | `name` | `varchar(150)` | Nome da área (ex: "Linguagens", "Matemática", "Ciências da Natureza") |
| `secao` | `section` | `varchar(60) nullable` | Agrupamento ou seção temática |
| `ordenamento_ac` | `order_index` | `integer default 0` | Ordem de apresentação em boletins e diários |
| `agrupar_descritores` | `group_descriptors` | `boolean default false` | Flag para exibição de descritores nos relatórios de avaliação |
| *(novo)* | `is_active` | `boolean default true` | Status da área |
| *(novo)* | `created_at`, `updated_at`, `deleted_at` | `timestamp` | Timestamps padrão e SoftDeletes |

---

### 3.2. Componentes Curriculares (`educa_curricular_components`)

| Coluna Legada (`modules.componente_curricular`) | Coluna Canônica SYSGOV | Tipo SYSGOV | Regra de Migração & Transformação |
| :--- | :--- | :--- | :--- |
| `id` | `legacy_id` | `bigint unsigned nullable` | ID legado para auditoria |
| *(novo)* | `id` | `uuid` | Chave primária UUID v7 |
| `instituicao_id` | `tenant_id` | `uuid` | Tenant da SME |
| `area_conhecimento_id` | `knowledge_area_id` | `uuid foreign key` | FK para `educa_knowledge_areas.id` |
| `nome` | `name` | `varchar(200)` | Nome oficial da disciplina |
| `abreviatura` | `short_name` | `varchar(20)` | Sigla para grades de horários e cabeçalhos |
| `tipo_base` | `base_type` | `enum('common', 'diversified', 'professional', 'religious')` | Enum legível (1=common, 2=diversified, 3=professional, 4=religious) |
| `codigo_educacenso` | `inep_code` | `integer nullable` | Código da tabela padronizada do INEP / Censo Escolar |
| `ordenamento` | `order_index` | `integer default 9999` | Ordenamento no boletim e histórico |
| `desconsidera_para_progressao` | `disregard_for_progression` | `boolean default false` | Se true, reprovação nesta disciplina não retém o aluno |
| `color` | `color_hex` | `varchar(7) default '#3B82F6'` | Cor visual para o quadro de horários e diário eletrônico |
| *(novo)* | `is_active` | `boolean default true` | Controle de inativação |

---

### 3.3. Matriz Curricular da Série/Ano (`educa_course_matrix_disciplines`)

| Coluna Legada (`modules.componente_curricular_ano_escolar`) | Coluna Canônica SYSGOV | Tipo SYSGOV | Regra de Migração & Transformação |
| :--- | :--- | :--- | :--- |
| `ano_escolar_id` | `grade_id` | `uuid foreign key` | FK para `educa_grades.id` (antigo `pmieducar.serie`) |
| `componente_curricular_id` | `curricular_component_id` | `uuid foreign key` | FK para `educa_curricular_components.id` |
| `carga_horaria` | `workload_hours` | `integer` | Carga horária total anual da disciplina na série |
| `tipo_nota` | `grading_type` | `enum('numeric', 'conceptual')` | 1 = numeric (0 a 10), 2 = conceptual (A, B, C / parecer) |
| `anos_letivos` | `academic_years` | `jsonb nullable` | Anos letivos em que esta regra é válida |

---

### 3.4. Vínculo de Componentes na Turma (`educa_class_disciplines`)

| Coluna Legada (`modules.componente_curricular_turma`) | Coluna Canônica SYSGOV | Tipo SYSGOV | Regra de Migração & Transformação |
| :--- | :--- | :--- | :--- |
| `turma_id` | `school_class_id` | `uuid foreign key` | FK para `educa_school_classes.id` |
| `componente_curricular_id` | `curricular_component_id` | `uuid foreign key` | FK para `educa_curricular_components.id` |
| `carga_horaria` | `workload_hours` | `integer nullable` | Carga horária específica da turma (sobrescreve a matriz se preenchida) |
| `docente_vinculado` | `teacher_id` | `uuid nullable foreign key` | FK para `educa_teachers.id` (vínculo do professor com a disciplina) |
| `etapas_especificas` | `has_specific_stages` | `boolean default false` | Flag se o componente ocorre em etapas/bimestres específicos |
| `etapas_utilizadas` | `stages_json` | `jsonb nullable` | Array dos períodos/bimestres em que a disciplina é ministrada |

---

## 4. Regras de Negócio Críticas Escavadas

### RN-CURR-01: Classificação BNCC e INEP (`base_type`)
- Os componentes curriculares são classificados estritamente conforme a norma do CNE/MEC:
  - `common` (Base Nacional Comum): Língua Portuguesa, Matemática, História, Geografia, Ciências, Artes, Educação Física, Inglês. Obrigatórios para a promoção.
  - `diversified` (Parte Diversificada): Projetos locais, Robótica, Empreendedorismo, Língua Regional.
  - `professional` (Formação Técnica/Profissional): Específico de cursos técnicos e itinerários integrados.
  - `religious` (Ensino Religioso - Art. 33 LDB): Matrícula facultativa para o aluno, sem reprovação automática.
- No cadastro de componentes, `inep_code` valida o código oficial exigido pela exportação do Educacenso.

### RN-CURR-02: Conformidade com a Carga Horária Mínima da LDB (800 Horas)
- Ao homologar uma matriz curricular em `educa_course_matrix_disciplines`, o sistema valida:
  $$\sum \text{workload\_hours} \ge 800\text{ horas}$$
- Se a soma for inferior a 800 horas para os 200 dias letivos, um alerta com nível `warning` ou bloqueio de homologação é disparado para a Secretaria de Educação.

### RN-CURR-03: Regra de Progressão e Retenção (`disregard_for_progression`)
- Se `disregard_for_progression = true`, a nota final ou insuficiência no componente **nunca reprova o aluno** de ano.
- Utilizado primordialmente para:
  - Ensino Religioso (`base_type = 'religious'`).
  - Atividades complementares ou eletivas extracurriculares.

### RN-CURR-04: Bloqueio de Desvinculação com Dados no Diário de Classe (`HasDataInDiario`)
- Descoberto em `ComponenteCurricular_Model_TurmaDataMapper::bulkUpdate`:
  - Se um operador tentar remover uma disciplina de uma turma (`school_class_id`) que já possua notas, faltas, aulas registradas ou pareceres descritivos lançados no diário eletrônico, a operação é **estritamente rejeitada**:
  > *"Não é possível desvincular o componente pois já existem notas, faltas e/ou pareceres lançados para este componente nesta turma no Diário de Classe."*

---

## 5. Implementação no SYSGOV

### 5.1. DTO de Sincronização de Disciplinas da Turma

```php
namespace App\Modules\Educa\DTOs;

readonly class SyncClassDisciplinesDTO
{
    /**
     * @param string $schoolClassId
     * @param array<ClassDisciplineItemDTO> $disciplines
     */
    public function __construct(
        public string $schoolClassId,
        public array $disciplines
    ) {}
}
```

### 5.2. Action de Validação e Bloqueio (`SyncClassDisciplinesAction`)

```php
namespace App\Modules\Educa\Actions;

use App\Modules\Educa\Exceptions\ClassDisciplineHasDiarioDataException;
use App\Modules\Educa\Models\ClassDiscipline;
use App\Modules\Educa\Models\GradeEntry;
use App\Modules\Educa\Models\AttendanceEntry;
use Illuminate\Support\Facades\DB;

class SyncClassDisciplinesAction
{
    public function execute(string $tenantId, string $schoolClassId, array $items): void
    {
        DB::transaction(function () use ($tenantId, $schoolClassId, $items) {
            $existing = ClassDiscipline::where('tenant_id', $tenantId)
                ->where('school_class_id', $schoolClassId)
                ->get()
                ->keyBy('curricular_component_id');

            $newComponentIds = collect($items)->pluck('curricular_component_id')->toArray();
            $removedComponents = $existing->except($newComponentIds);

            // Validação de trava com diário de classe
            foreach ($removedComponents as $removed) {
                $hasGrades = GradeEntry::where('tenant_id', $tenantId)
                    ->where('school_class_id', $schoolClassId)
                    ->where('curricular_component_id', $removed->curricular_component_id)
                    ->exists();

                $hasAttendance = AttendanceEntry::where('tenant_id', $tenantId)
                    ->where('school_class_id', $schoolClassId)
                    ->where('curricular_component_id', $removed->curricular_component_id)
                    ->exists();

                if ($hasGrades || $hasAttendance) {
                    throw new ClassDisciplineHasDiarioDataException(
                        "Não é possível remover a disciplina {$removed->component->name} pois já existem registros lançados no Diário de Classe."
                    );
                }

                $removed->delete();
            }

            // Atualização ou inserção das disciplinas mantidas
            foreach ($items as $item) {
                ClassDiscipline::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'school_class_id' => $schoolClassId,
                        'curricular_component_id' => $item['curricular_component_id'],
                    ],
                    [
                        'teacher_id' => $item['teacher_id'] ?? null,
                        'workload_hours' => $item['workload_hours'] ?? null,
                        'stages_json' => $item['stages_json'] ?? null,
                    ]
                );
            }
        });
    }
}
```
