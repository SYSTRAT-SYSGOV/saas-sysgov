<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaAttendanceRecord;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaClassDiary;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaEvaluationRule;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaGradeScale;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentGrade;
use Modules\Educa\Services\EvaluationService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class PedagogicoDiaryAndEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaAcademicCalendar $calendario;
    private EducaCourse $curso;
    private EducaGrade $serie;
    private EducaCurriculumComponent $componente;
    private EducaSchoolClass $turma;
    private EducaEnrollment $matricula1;
    private EducaEnrollment $matricula2;
    private EducaClassEnrollment $enturmacao1;
    private EducaClassEnrollment $enturmacao2;

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

        // Habilita módulos no catálogo do tenant
        foreach (['educa', 'educa-secretaria', 'educa-pedagogico'] as $alias) {
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

        // 1. Estrutura Escolar e Turma
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-CA',
            'name' => 'EMEF Castro Alves',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '12345678',
            'sigla' => 'EMEF-CA',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $this->anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'ano' => 2026,
            'status' => 'active',
            'data_inicio' => '2026-02-01',
            'data_fim' => '2026-12-20',
        ]);

        $this->calendario = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'ano' => 2026,
            'nome' => 'Calendário 2026 EMEF Castro Alves',
            'status' => EducaAcademicCalendar::STATUS_PUBLISHED,
        ]);

        // Dias do Calendário: 2026-03-02 é letivo, 2026-04-21 é feriado não letivo
        EducaCalendarDay::create([
            'tenant_id' => $this->tenant->id,
            'calendario_id' => $this->calendario->id,
            'data' => '2026-03-02',
            'dia_da_semana' => 2,
            'is_school_day' => true,
        ]);

        EducaCalendarDay::create([
            'tenant_id' => $this->tenant->id,
            'calendario_id' => $this->calendario->id,
            'data' => '2026-04-21',
            'dia_da_semana' => 3,
            'is_school_day' => false,
            'descricao' => 'Tiradentes',
        ]);

        $this->curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-ANOS-INICIAIS',
            'nome' => 'Ensino Fundamental - Anos Iniciais',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ]);

        $this->serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
            'sequencial' => 5,
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        $area = EducaKnowledgeArea::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'LINGUAGENS',
            'nome' => 'Linguagens',
            'ordem' => 1,
        ]);

        $this->componente = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $area->id,
            'codigo' => 'PORT',
            'nome' => 'Língua Portuguesa',
            'sigla' => 'LP',
            'base_curricular' => 'nacional_comum',
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'nome' => 'Matriz Curricular 5º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 880,
            'ativo' => true,
        ]);

        $this->turma = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => '5A-M-2026',
            'nome' => '5º Ano A - Matutino',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 2,
            'tipo_atendimento' => 'regular',
        ]);

        // 2. Estudantes e Enturmações
        $p1 = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'João Silva',
            'data_nascimento' => '2015-05-10',
        ]);

        $p2 = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Pedro Souza',
            'data_nascimento' => '2015-08-15',
        ]);

        $this->matricula1 = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $p1->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'academic_year_id' => $this->anoLetivo->id,
            'grade_id' => $this->serie->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-01',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        $this->matricula2 = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $p2->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'academic_year_id' => $this->anoLetivo->id,
            'grade_id' => $this->serie->id,
            'codigo_matricula' => '2026-000002',
            'data_matricula' => '2026-02-01',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        $this->enturmacao1 = EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula1->id,
            'school_class_id' => $this->turma->id,
            'data_entrada' => '2026-02-01',
            'status' => EducaClassEnrollment::STATUS_ATIVA,
            'numero_ordem' => 1,
        ]);

        $this->enturmacao2 = EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula2->id,
            'school_class_id' => $this->turma->id,
            'data_entrada' => '2026-02-01',
            'status' => EducaClassEnrollment::STATUS_ATIVA,
            'numero_ordem' => 2,
        ]);
    }

    public function test_deve_registrar_aula_ministrada_em_dia_letivo_valido(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->componente->id,
            'data_aula' => '2026-03-02',
            'quantidade_aulas' => 2,
            'conteudo' => 'Leitura e interpretação de texto narrativo',
            'habilidades_bncc' => 'EF15LP01, EF15LP02',
            'status' => 'publicado',
        ];

        $response = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/pedagogico/diarios', $payload);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'publicado');
        $response->assertJsonPath('data.conteudo', 'Leitura e interpretação de texto narrativo');
        $response->assertJsonPath('data.quantidade_aulas', 2);

        $this->assertDatabaseHas('educa_class_diaries', [
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->componente->id,
            'data_aula' => '2026-03-02',
            'quantidade_aulas' => 2,
        ]);
    }

    public function test_deve_bloquear_registro_de_aula_em_dia_nao_letivo_do_calendario(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->componente->id,
            'data_aula' => '2026-04-21', // Feriado Tiradentes não letivo
            'quantidade_aulas' => 2,
            'conteudo' => 'Aula em dia de feriado',
        ];

        $response = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/pedagogico/diarios', $payload);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['data_aula']);
    }

    public function test_deve_lancar_chamada_e_apurar_frequencia_dos_estudantes_enturmados(): void
    {
        Sanctum::actingAs($this->adminUser);

        $diario = EducaClassDiary::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->componente->id,
            'data_aula' => '2026-03-02',
            'quantidade_aulas' => 2,
            'conteudo' => 'Aula inaugural',
            'status' => EducaClassDiary::STATUS_PUBLICADO,
        ]);

        $payload = [
            'registros' => [
                [
                    'class_enrollment_id' => $this->enturmacao1->id,
                    'status' => 'presente',
                ],
                [
                    'class_enrollment_id' => $this->enturmacao2->id,
                    'status' => 'falta',
                ],
            ],
        ];

        $response = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/pedagogico/diarios/{$diario->id}/frequencia", $payload);

        $response->assertOk();
        $response->assertJsonPath('total_computados', 2);

        $this->assertDatabaseHas('educa_attendance_records', [
            'class_diary_id' => $diario->id,
            'class_enrollment_id' => $this->enturmacao1->id,
            'status' => 'presente',
        ]);

        $this->assertDatabaseHas('educa_attendance_records', [
            'class_diary_id' => $diario->id,
            'class_enrollment_id' => $this->enturmacao2->id,
            'status' => 'falta',
        ]);
    }

    public function test_deve_abonar_falta_mediante_apresentacao_de_justificativa_medica(): void
    {
        Sanctum::actingAs($this->adminUser);

        $diario = EducaClassDiary::create([
            'tenant_id' => $this->tenant->id,
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->componente->id,
            'data_aula' => '2026-03-02',
            'quantidade_aulas' => 2,
            'conteudo' => 'Aula regular',
            'status' => EducaClassDiary::STATUS_PUBLICADO,
        ]);

        $registro = EducaAttendanceRecord::create([
            'tenant_id' => $this->tenant->id,
            'class_diary_id' => $diario->id,
            'class_enrollment_id' => $this->enturmacao2->id,
            'status' => EducaAttendanceRecord::STATUS_FALTA,
        ]);

        $response = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/pedagogico/frequencias/{$registro->id}/abonar", [
                'justificativa' => 'Consulta médica odontológica com atestado',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'falta_justificada');
        $response->assertJsonPath('data.justificativa', 'Consulta médica odontológica com atestado');

        $this->assertDatabaseHas('educa_attendance_records', [
            'id' => $registro->id,
            'status' => 'falta_justificada',
        ]);
    }

    public function test_deve_calcular_media_anual_com_motor_declarativo_sem_eval(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Cria a regra com a fórmula oficial do Ensino Fundamental
        $regraPayload = [
            'nome' => 'Média Aritmética Anual - 4 Bimestres',
            'tipo_nota' => 'numerica',
            'nota_maxima' => 10.0,
            'nota_minima_aprovacao' => 6.0,
            'formula_media_anual' => '(E1 + E2 + E3 + E4) / 4',
            'formula_recuperacao' => 'max(E, REC)',
            'ativo' => true,
        ];

        $regraResp = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/pedagogico/regras-avaliacao', $regraPayload);

        $regraResp->assertCreated();
        $regraId = $regraResp->json('data.id');

        // Lança as 4 etapas para o aluno João Silva (7.0, 8.0, 6.5, 7.5) -> Soma = 29.0 / 4 = 7.25
        $notas = [
            1 => 7.0,
            2 => 8.0,
            3 => 6.5,
            4 => 7.5,
        ];

        foreach ($notas as $etapa => $nota) {
            $this->withHeaders($this->authHeaders)
                ->postJson("/api/educa/pedagogico/turmas/{$this->turma->id}/componentes/{$this->componente->id}/notas", [
                    'etapa_sequencial' => $etapa,
                    'evaluation_rule_id' => $regraId,
                    'notas' => [
                        [
                            'enrollment_id' => $this->matricula1->id,
                            'nota' => $nota,
                        ],
                    ],
                ])
                ->assertOk();
        }

        // Consulta o mapa de notas da turma
        $mapaResp = $this->withHeaders($this->authHeaders)
            ->getJson("/api/educa/pedagogico/turmas/{$this->turma->id}/componentes/{$this->componente->id}/notas");

        $mapaResp->assertOk();
        $mapa = $mapaResp->json('data');

        $this->assertNotEmpty($mapa);
        $alunoBoletim = collect($mapa)->firstWhere('enrollment_id', $this->matricula1->id);

        $this->assertNotNull($alunoBoletim);
        $this->assertEquals(7.25, $alunoBoletim['media_anual']);
        $this->assertEquals('aprovado', $alunoBoletim['situacao']);
    }

    public function test_deve_aplicar_regra_municipal_de_arredondamento_sobre_media_fracionaria(): void
    {
        Sanctum::actingAs($this->adminUser);

        $regra = EducaEvaluationRule::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Média com Tabela de Arredondamento',
            'tipo_nota' => 'numerica',
            'nota_maxima' => 10.0,
            'nota_minima_aprovacao' => 6.0,
            'formula_media_anual' => '(E1 + E2 + E3 + E4) / 4',
            'ativo' => true,
        ]);

        // Faixa de arredondamento: [5.75, 5.99] -> 5.80
        EducaGradeScale::create([
            'tenant_id' => $this->tenant->id,
            'evaluation_rule_id' => $regra->id,
            'limite_inferior' => 5.75,
            'limite_superior' => 5.99,
            'nota_arredondada' => 5.80,
        ]);

        /** @var EvaluationService $service */
        $service = app(EvaluationService::class);

        // Arredonda 5.76 -> deve convergir para 5.80
        $arredondada = $service->arredondarNota(5.76, $regra);
        $this->assertEquals(5.80, $arredondada);

        // Fora da faixa: 6.33 -> deve se manter 6.33
        $mantida = $service->arredondarNota(6.33, $regra);
        $this->assertEquals(6.33, $mantida);
    }

    public function test_deve_rejeitar_formulas_com_caracteres_ou_funcoes_perigosas_anti_eval(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payloadPerigoso = [
            'nome' => 'Regra com Ataque',
            'tipo_nota' => 'numerica',
            'formula_media_anual' => 'system("id") + E1',
        ];

        $response = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/pedagogico/regras-avaliacao', $payloadPerigoso);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['formula_media_anual']);
    }
}
