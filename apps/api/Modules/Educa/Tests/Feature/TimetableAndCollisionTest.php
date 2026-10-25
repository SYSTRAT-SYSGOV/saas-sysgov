<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaMatrixComponent;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaTimetable;
use Modules\Educa\Models\EducaTimetableLesson;
use Modules\Educa\Models\EducaTimetableSlot;
use Modules\Educa\Services\ClassDiaryService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class TimetableAndCollisionTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola1;
    private EducaSchool $escola2;
    private EducaAcademicYear $anoLetivo;
    private EducaSchoolClass $turmaA;
    private EducaSchoolClass $turmaB;
    private EducaSchoolClass $turmaC;
    private EducaCurriculumMatrix $matriz1;
    private EducaCurriculumMatrix $matriz2;
    private EducaCurriculumComponent $compMatematica;
    private EducaCurriculumComponent $compPortugues;
    private EducaEmployee $docente1;
    private EducaEmployee $docente2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Educação',
            'slug' => 'pref-teste-educa',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        foreach (['educa', 'educa-secretaria', 'educa-pedagogico', 'educa-servidores'] as $alias) {
            $modulo = Module::firstOrCreate(
                ['alias' => $alias],
                ['name' => "SYS-Educa: {$alias}", 'description' => 'Test', 'enabled' => true]
            );
            $modulo->tenants()->syncWithoutDetaching([
                $this->tenant->id => ['enabled' => true],
            ]);
        }

        $this->seed(EducaRbacSeeder::class);

        $this->adminUser = User::factory()->create([
            'is_platform_admin' => true,
        ]);
        $this->tenant->users()->attach($this->adminUser->id, [
            'status' => 'active',
            'is_primary' => true,
        ]);

        $this->authHeaders = [
            'X-Tenant-Slug' => $this->tenant->slug,
            'Accept' => 'application/json',
        ];

        // 1. Unidades Organizacionais e Escolas
        $orgUnit1 = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-1',
            'name' => 'EMEF Monteiro Lobato',
            'type' => 'secretaria',
        ]);

        $this->escola1 = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit1->id,
            'codigo_inep' => '11111111',
            'sigla' => 'EMEF-1',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $orgUnit2 = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-2',
            'name' => 'EMEF Cecília Meireles',
            'type' => 'secretaria',
        ]);

        $this->escola2 = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit2->id,
            'codigo_inep' => '22222222',
            'sigla' => 'EMEF-2',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        // 2. Ano Letivo, Cursos, Séries e Matrizes
        $this->anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola1->id,
            'ano' => 2026,
            'data_inicio' => '2026-02-02',
            'data_fim' => '2026-12-18',
            'status' => 'active',
        ]);

        $anoLetivoEscola2 = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola2->id,
            'ano' => 2026,
            'data_inicio' => '2026-02-02',
            'data_fim' => '2026-12-18',
            'status' => 'active',
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-AF',
            'nome' => 'Ensino Fundamental - Anos Finais',
            'nivel' => 'fundamental_finais',
            'modalidade' => 'regular',
        ]);

        $serie6 = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'codigo' => '6ANO',
            'nome' => '6º Ano',
            'sequencial' => 6,
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        $this->matriz1 = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie6->id,
            'nome' => 'Matriz Curricular 6º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
            'ativo' => true,
        ]);

        $this->turmaA = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola1->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie6->id,
            'matrix_id' => $this->matriz1->id,
            'nome' => '6º Ano A',
            'codigo' => 'TURMA-6A',
            'turno' => 'matutino',
            'lotacao_maxima' => 35,
            'tipo_atendimento' => 'regular',
            'status' => 'ativa',
        ]);

        $this->turmaB = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola1->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie6->id,
            'matrix_id' => $this->matriz1->id,
            'nome' => '7º Ano B',
            'codigo' => 'TURMA-7B',
            'turno' => 'matutino',
            'lotacao_maxima' => 35,
            'tipo_atendimento' => 'regular',
            'status' => 'ativa',
        ]);

        $this->turmaC = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola2->id,
            'academic_year_id' => $anoLetivoEscola2->id,
            'course_id' => $curso->id,
            'grade_id' => $serie6->id,
            'matrix_id' => $this->matriz1->id,
            'nome' => '8º Ano C (Escola 2)',
            'codigo' => 'TURMA-8C',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'tipo_atendimento' => 'regular',
            'status' => 'ativa',
        ]);

        // 3. Componentes Curriculares
        $areaMat = EducaKnowledgeArea::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'MAT',
            'nome' => 'Matemática',
            'ordem' => 1,
        ]);

        $areaLing = EducaKnowledgeArea::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'LING',
            'nome' => 'Linguagens',
            'ordem' => 2,
        ]);

        $this->compMatematica = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $areaMat->id,
            'codigo' => 'MAT-01',
            'nome' => 'Matemática',
            'sigla' => 'MAT',
            'base_curricular' => 'nacional_comum',
        ]);

        $this->compPortugues = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $areaLing->id,
            'codigo' => 'POR-01',
            'nome' => 'Língua Portuguesa',
            'sigla' => 'LP',
            'base_curricular' => 'nacional_comum',
        ]);

        // Vincula Matemática à Matriz Curricular
        EducaMatrixComponent::create([
            'tenant_id' => $this->tenant->id,
            'matrix_id' => $this->matriz1->id,
            'component_id' => $this->compMatematica->id,
            'horas_semanais' => 4,
            'horas_anuais' => 160,
        ]);

        // 4. Servidores Docentes (Pessoas + Employees)
        $pessoa1 = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Prof. João da Silva Santos',
            'tipo' => 'F',
            'documento_hash' => hash('sha256', '11122233344'),
            'ativo' => true,
        ]);

        $this->docente1 = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $pessoa1->id,
            'matricula' => 'DOC-001',
            'tipo_vinculo' => 'efetivo',
            'cargo_funcao' => 'Professor PEB II',
            'carga_horaria_semanal' => 40,
            'data_admissao' => '2020-02-01',
            'situacao' => 'ativo',
            'formacao_adequada_ldb' => true,
        ]);

        $pessoa2 = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Profa. Maria Oliveira Ramos',
            'tipo' => 'F',
            'documento_hash' => hash('sha256', '22233344455'),
            'ativo' => true,
        ]);

        $this->docente2 = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $pessoa2->id,
            'matricula' => 'DOC-002',
            'tipo_vinculo' => 'contrato_temporario',
            'cargo_funcao' => 'Professora Substituta',
            'carga_horaria_semanal' => 20,
            'data_admissao' => '2023-03-01',
            'situacao' => 'ativo',
            'formacao_adequada_ldb' => true,
        ]);
    }

    public function test_pode_obter_ou_criar_quadro_de_horario_para_turma(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Cria quadro de horários para a turma
        $payload = [
            'nome' => 'Grade Matutina 2026',
            'turno' => 'matutino',
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ];

        $responsePost = $this->withHeaders($this->authHeaders)->postJson(
            "/api/educa/core/turmas/{$this->turmaA->id}/quadro-horario",
            $payload
        );

        $responsePost->assertStatus(201)
            ->assertJsonPath('data.nome', 'Grade Matutina 2026')
            ->assertJsonPath('data.turno', 'matutino')
            ->assertJsonPath('data.ativo', true);

        // 2. Consulta o quadro via GET
        $responseGet = $this->withHeaders($this->authHeaders)->getJson(
            "/api/educa/core/turmas/{$this->turmaA->id}/quadro-horario"
        );

        $responseGet->assertStatus(200)
            ->assertJsonPath('data.nome', 'Grade Matutina 2026')
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'school_class_id',
                    'academic_year_id',
                    'nome',
                    'turno',
                    'ativo',
                    'slots',
                    'aulas',
                ],
            ]);

        $this->assertDatabaseHas('educa_timetables', [
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'nome' => 'Grade Matutina 2026',
            'ativo' => true,
        ]);
    }

    public function test_pode_sincronizar_matriz_de_tempos_e_slots(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Cria o quadro
        EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Matutina 2026',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slotsPayload = [
            'slots' => [
                [
                    'numero_tempo' => 1,
                    'hora_inicio' => '07:30',
                    'hora_fim' => '08:20',
                    'tipo' => 'aula',
                    'descricao' => '1º Tempo',
                ],
                [
                    'numero_tempo' => 2,
                    'hora_inicio' => '08:20',
                    'hora_fim' => '09:10',
                    'tipo' => 'aula',
                    'descricao' => '2º Tempo',
                ],
                [
                    'numero_tempo' => 3,
                    'hora_inicio' => '09:10',
                    'hora_fim' => '09:30',
                    'tipo' => 'intervalo',
                    'descricao' => 'Recreio',
                ],
                [
                    'numero_tempo' => 4,
                    'hora_inicio' => '09:30',
                    'hora_fim' => '10:20',
                    'tipo' => 'aula',
                    'descricao' => '3º Tempo',
                ],
            ],
        ];

        $response = $this->withHeaders($this->authHeaders)->putJson(
            "/api/educa/core/turmas/{$this->turmaA->id}/quadro-horario/slots",
            $slotsPayload
        );

        $response->assertStatus(200)
            ->assertJsonCount(4, 'data');

        $this->assertDatabaseCount('educa_timetable_slots', 4);
        $this->assertDatabaseHas('educa_timetable_slots', [
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);
        $this->assertDatabaseHas('educa_timetable_slots', [
            'numero_tempo' => 3,
            'tipo' => 'intervalo',
        ]);
    }

    public function test_pode_alocar_aula_com_componente_e_docente_em_slot_disponivel(): void
    {
        Sanctum::actingAs($this->adminUser);

        $timetable = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Matutina 2026',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slot = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetable->id,
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);

        $payload = [
            'timetable_slot_id' => $slot->id,
            'dia_semana' => 2, // Segunda-feira
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ];

        $response = $this->withHeaders($this->authHeaders)->postJson(
            "/api/educa/core/turmas/{$this->turmaA->id}/quadro-horario/aulas",
            $payload
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.dia_semana', 2)
            ->assertJsonPath('data.curriculum_component_id', $this->compMatematica->id)
            ->assertJsonPath('data.teacher_employee_id', $this->docente1->id);

        $this->assertDatabaseHas('educa_timetable_lessons', [
            'timetable_slot_id' => $slot->id,
            'dia_semana' => 2,
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ]);
    }

    public function test_impede_alocacao_com_choque_de_horario_na_mesma_escola(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Aloca o Docente 1 na Turma A (07:30 às 08:20 de Segunda)
        $timetableA = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Turma A',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slotA = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetableA->id,
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);

        EducaTimetableLesson::create([
            'tenant_id' => $this->tenant->id,
            'timetable_slot_id' => $slotA->id,
            'dia_semana' => 2,
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ]);

        // 2. Configura a Turma B com slot no mesmo horário
        $timetableB = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaB->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Turma B',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slotB = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetableB->id,
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);

        // 3. Tenta alocar o mesmo Docente 1 na Turma B no mesmo horário
        $response = $this->withHeaders($this->authHeaders)->postJson(
            "/api/educa/core/turmas/{$this->turmaB->id}/quadro-horario/aulas",
            [
                'timetable_slot_id' => $slotB->id,
                'dia_semana' => 2,
                'curriculum_component_id' => $this->compMatematica->id,
                'teacher_employee_id' => $this->docente1->id,
            ]
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['teacher_employee_id']);

        $this->assertDatabaseMissing('educa_timetable_lessons', [
            'timetable_slot_id' => $slotB->id,
        ]);
    }

    public function test_impede_alocacao_com_choque_de_horario_entre_escolas_distintas_do_mesmo_tenant(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Aloca o Docente 1 na Turma A da Escola 1 (08:20 às 09:10 de Terça)
        $timetableA = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Turma A',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slotA = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetableA->id,
            'numero_tempo' => 2,
            'hora_inicio' => '08:20:00',
            'hora_fim' => '09:10:00',
            'tipo' => 'aula',
        ]);

        EducaTimetableLesson::create([
            'tenant_id' => $this->tenant->id,
            'timetable_slot_id' => $slotA->id,
            'dia_semana' => 3, // Terça-feira
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ]);

        // 2. Configura a Turma C da Escola 2 com slot sobreposto (08:40 às 09:30 de Terça)
        $timetableC = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaC->id,
            'academic_year_id' => $this->turmaC->academic_year_id,
            'nome' => 'Grade Turma C (Escola 2)',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slotC = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetableC->id,
            'numero_tempo' => 2,
            'hora_inicio' => '08:40:00',
            'hora_fim' => '09:30:00',
            'tipo' => 'aula',
        ]);

        // 3. Tenta alocar o mesmo Docente 1 na Turma C da outra escola
        $response = $this->withHeaders($this->authHeaders)->postJson(
            "/api/educa/core/turmas/{$this->turmaC->id}/quadro-horario/aulas",
            [
                'timetable_slot_id' => $slotC->id,
                'dia_semana' => 3,
                'curriculum_component_id' => $this->compMatematica->id,
                'teacher_employee_id' => $this->docente1->id,
            ]
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['teacher_employee_id']);

        // Valida que o conflito detectou o nome da Escola 1 concorrente
        $msg = $response->json('errors.teacher_employee_id.0');
        $this->assertStringContainsString('EMEF Monteiro Lobato', $msg);
    }

    public function test_permite_atribuir_professor_substituto_com_vigencia(): void
    {
        Sanctum::actingAs($this->adminUser);

        $timetable = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Matutina',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slot = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetable->id,
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);

        $lesson = EducaTimetableLesson::create([
            'tenant_id' => $this->tenant->id,
            'timetable_slot_id' => $slot->id,
            'dia_semana' => 4, // Quarta-feira
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ]);

        $response = $this->withHeaders($this->authHeaders)->postJson(
            "/api/educa/core/turmas/{$this->turmaA->id}/quadro-horario/aulas/{$lesson->id}/substituto",
            [
                'substitute_employee_id' => $this->docente2->id,
                'substituicao_inicio' => '2026-05-01',
                'substituicao_fim' => '2026-05-15',
                'substituicao_motivo' => 'Licença médica do titular',
            ]
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.substitute_employee_id', $this->docente2->id)
            ->assertJsonPath('data.substituicao_motivo', 'Licença médica do titular');

        $this->assertDatabaseHas('educa_timetable_lessons', [
            'id' => $lesson->id,
            'substitute_employee_id' => $this->docente2->id,
            'substituicao_motivo' => 'Licença médica do titular',
        ]);
    }

    public function test_sugestao_de_aula_do_dia_no_diario_de_classe(): void
    {
        // 1. Cria quadro ativo com aula na Quarta-feira (dia_semana = 4)
        $timetable = EducaTimetable::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turmaA->id,
            'academic_year_id' => $this->anoLetivo->id,
            'nome' => 'Grade Ativa 2026',
            'turno' => 'matutino',
            'ativo' => true,
            'data_inicio_vigencia' => '2026-02-02',
            'data_fim_vigencia' => '2026-12-18',
        ]);

        $slot = EducaTimetableSlot::create([
            'tenant_id' => $this->tenant->id,
            'timetable_id' => $timetable->id,
            'numero_tempo' => 1,
            'hora_inicio' => '07:30:00',
            'hora_fim' => '08:20:00',
            'tipo' => 'aula',
        ]);

        $lesson = EducaTimetableLesson::create([
            'tenant_id' => $this->tenant->id,
            'timetable_slot_id' => $slot->id,
            'dia_semana' => 4, // Quarta-feira
            'curriculum_component_id' => $this->compMatematica->id,
            'teacher_employee_id' => $this->docente1->id,
        ]);

        // 2. Chama ClassDiaryService para obter sugestões para uma quarta-feira (2026-05-06)
        $diaryService = app(ClassDiaryService::class);
        $sugestoes = $diaryService->obterSugestoesAulasDoDia($this->turmaA->id, '2026-05-06');

        $this->assertCount(1, $sugestoes);
        $this->assertEquals($lesson->id, $sugestoes[0]['timetable_lesson_id']);
        $this->assertEquals($this->compMatematica->id, $sugestoes[0]['curriculum_component_id']);
        $this->assertEquals('Matemática', $sugestoes[0]['componente_nome']);
        $this->assertEquals('07:30:00', $sugestoes[0]['hora_inicio']);
        $this->assertEquals('08:20:00', $sugestoes[0]['hora_fim']);
    }
}
