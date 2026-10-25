<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Admin\Models\Module;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaSchoolGrade;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class CoreSchoolsAndClassesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private OrgUnit $orgUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Educa',
            'slug' => 'pref-educa',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Habilita módulo educa
        $modulo = Module::firstOrCreate(
            ['alias' => 'educa'],
            ['name' => 'Educação', 'description' => 'SYS-Educa', 'enabled' => true]
        );
        $modulo->tenants()->syncWithoutDetaching([
            $this->tenant->id => ['enabled' => true],
        ]);

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

        // Cria uma unidade organizacional no OrgChart
        $this->orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Escola Municipal Monteiro Lobato',
            'code' => 'EMML-01',
            'acronym' => 'EMML',
            'type' => 'setor',
            'level' => 1,
            'path' => '/1/',
            'order' => 1,
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->adminUser);
    }

    public function test_pode_cadastrar_escola_vinculada_a_org_unit_e_validar_inep_unico(): void
    {
        $payload = [
            'org_unit_id' => $this->orgUnit->id,
            'codigo_inep' => '12345678',
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ];

        // 1. Criação bem sucedida
        $response = $this->postJson('/api/educa/core/escolas', $payload, $this->authHeaders);
        $response->assertStatus(201)
            ->assertJsonPath('data.sigla', 'EMML')
            ->assertJsonPath('data.codigo_inep', '12345678')
            ->assertJsonPath('data.org_unit_id', $this->orgUnit->id);

        $schoolId = $response->json('data.id');

        // 2. Detalha a escola criada
        $show = $this->getJson("/api/educa/core/escolas/{$schoolId}", $this->authHeaders);
        $show->assertStatus(200)
            ->assertJsonPath('data.nome', 'Escola Municipal Monteiro Lobato');

        // 3. Tentar cadastrar outra escola com o mesmo código INEP deve gerar 409 Conflito
        $outraOrg = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Escola Municipal Cora Coralina',
            'code' => 'EMCC-01',
            'type' => 'setor',
            'level' => 1,
            'path' => '/2/',
            'order' => 2,
            'is_active' => true,
        ]);

        $payloadDuplicado = $payload;
        $payloadDuplicado['org_unit_id'] = $outraOrg->id;
        $payloadDuplicado['sigla'] = 'EMCC';

        $conflito = $this->postJson('/api/educa/core/escolas', $payloadDuplicado, $this->authHeaders);
        $conflito->assertStatus(409)
            ->assertJsonPath('code', 'CONFLICT');
    }

    public function test_pode_cadastrar_cursos_e_series(): void
    {
        // 1. Cadastra curso
        $resCurso = $this->postJson('/api/educa/core/cursos', [
            'codigo' => 'EF-AI',
            'nome' => 'Ensino Fundamental - Anos Iniciais',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ], $this->authHeaders);

        $resCurso->assertStatus(201)
            ->assertJsonPath('codigo', 'EF-AI');

        $cursoId = $resCurso->json('id');

        // 2. Cadastra série
        $resSerie = $this->postJson("/api/educa/core/cursos/{$cursoId}/series", [
            'sequencial' => 5,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ], $this->authHeaders);

        $resSerie->assertStatus(201)
            ->assertJsonPath('nome', '5º Ano')
            ->assertJsonPath('carga_horaria_minima_anual', 800);

        // 3. Tentar cadastrar série com mesmo sequencial resulta em 409 Conflito
        $resConflito = $this->postJson("/api/educa/core/cursos/{$cursoId}/series", [
            'sequencial' => 5,
            'codigo' => '5ANO-DUP',
            'nome' => '5º Ano Duplicado',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ], $this->authHeaders);

        $resConflito->assertStatus(409);
    }

    public function test_pode_configurar_matriz_curricular_bncc_e_recalcular_horas(): void
    {
        // 1. Cria Curso e Série
        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF',
            'nome' => 'Ensino Fundamental',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 5,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        // 2. Cria Área de Conhecimento e Componentes
        $area = EducaKnowledgeArea::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'LING',
            'nome' => 'Linguagens',
            'ordem' => 1,
        ]);

        $comp1 = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $area->id,
            'codigo' => 'PORT',
            'nome' => 'Língua Portuguesa',
            'sigla' => 'PORT',
            'base_curricular' => 'nacional_comum',
        ]);

        $comp2 = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $area->id,
            'codigo' => 'MAT',
            'nome' => 'Matemática',
            'sigla' => 'MAT',
            'base_curricular' => 'nacional_comum',
        ]);

        $comp3 = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $area->id,
            'codigo' => 'EDFIS',
            'nome' => 'Educação Física',
            'sigla' => 'EDF',
            'base_curricular' => 'diversificada',
        ]);

        // 3. Cria Matriz Curricular
        $resMatriz = $this->postJson('/api/educa/core/matrizes-curriculares', [
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz BNCC 2026 - 5º Ano',
            'ano_vigencia' => 2026,
        ], $this->authHeaders);

        $resMatriz->assertStatus(201);
        $matrizId = $resMatriz->json('id');

        // 4. Configura Componentes na Matriz somando 880h
        $resConfig = $this->putJson("/api/educa/core/matrizes-curriculares/{$matrizId}/componentes", [
            'componentes' => [
                [
                    'component_id' => $comp1->id,
                    'horas_semanais' => 5,
                    'horas_anuais' => 400,
                    'tipo_nota' => 'numerica',
                ],
                [
                    'component_id' => $comp2->id,
                    'horas_semanais' => 5,
                    'horas_anuais' => 400,
                    'tipo_nota' => 'numerica',
                ],
                [
                    'component_id' => $comp3->id,
                    'horas_semanais' => 2,
                    'horas_anuais' => 80,
                    'tipo_nota' => 'conceitual',
                ],
            ],
        ], $this->authHeaders);

        $resConfig->assertStatus(200)
            ->assertJsonPath('total_horas_anuais', 880)
            ->assertJsonCount(3, 'componentes');
    }

    public function test_pode_criar_turma_com_controle_de_vagas(): void
    {
        $school = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $this->orgUnit->id,
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'ano' => 2026,
            'status' => 'ativo',
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-AI-2',
            'nome' => 'Ensino Fundamental 1',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 5,
            'codigo' => '5ANO-2',
            'nome' => '5º Ano',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
        ]);

        // Cria turma
        $response = $this->postJson('/api/educa/core/turmas', [
            'school_id' => $school->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'nome' => '5º Ano A',
            'sigla' => '5A',
            'turno' => 'matutino',
            'sala' => 'Sala 04',
            'lotacao_maxima' => 30,
        ], $this->authHeaders);

        $response->assertStatus(201)
            ->assertJsonPath('data.nome', '5º Ano A')
            ->assertJsonPath('data.status', 'ativa')
            ->assertJsonPath('data.lotacao_maxima', 30)
            ->assertJsonPath('data.lotacao_efetiva', 0)
            ->assertJsonPath('data.vagas_disponiveis', 30);
    }

    public function test_aplica_trava_anti_ociosidade_de_turmas_se_houver_vagas_em_aberto(): void
    {
        $school = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $this->orgUnit->id,
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'ano' => 2026,
            'status' => 'ativo',
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-AI-TRAVA',
            'nome' => 'Ensino Fundamental Trava',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 5,
            'codigo' => '5ANO-TRAVA',
            'nome' => '5º Ano',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz Trava',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
        ]);

        // Ativa a trava de bloquear abertura de turma com vagas na escola/série
        EducaSchoolGrade::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'grade_id' => $serie->id,
            'bloquear_enturmacao_sem_vaga' => true,
            'bloquear_abertura_turma_com_vagas' => true,
        ]);

        // Cria turma "5º Ano A" com lotação máxima 30 e lotação efetiva 10 (20 vagas restantes)
        EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-5A',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 10,
            'status' => 'ativa',
        ]);

        // Tentar criar "5º Ano B" no mesmo turno matutino deve ser recusado com 422
        $response = $this->postJson('/api/educa/core/turmas', [
            'school_id' => $school->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'nome' => '5º Ano B',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
        ], $this->authHeaders);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['turno']);
        
        $msg = $response->json('errors.turno.0');
        $this->assertStringContainsString('5º Ano A', $msg);
        $this->assertStringContainsString('20 vagas em aberto', $msg);
    }

    public function test_calcula_capacidade_por_turno_da_escola(): void
    {
        $school = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $this->orgUnit->id,
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'ano' => 2026,
            'status' => 'ativo',
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-AI-CAP',
            'nome' => 'Ensino Fundamental Capacidade',
            'nivel' => 'fundamental_iniciais',
            'modalidade' => 'regular',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 1,
            'codigo' => '1ANO',
            'nome' => '1º Ano',
            'carga_horaria_minima_anual' => 800,
            'dias_letivos_minimos' => 200,
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz Cap',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
        ]);

        // Turma matutina (30 alunos)
        EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-M1',
            'nome' => '1º Ano M',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'status' => 'ativa',
        ]);

        // Turma vespertina (25 alunos)
        EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $school->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-V1',
            'nome' => '1º Ano V',
            'turno' => 'vespertino',
            'lotacao_maxima' => 25,
            'status' => 'ativa',
        ]);

        $res = $this->getJson("/api/educa/core/escolas/{$school->id}/capacidade-turno?ano=2026", $this->authHeaders);
        $res->assertStatus(200)
            ->assertJsonPath('ano', 2026)
            ->assertJsonPath('turnos.matutino', 30)
            ->assertJsonPath('turnos.vespertino', 25)
            ->assertJsonPath('turnos.noturno', 0)
            ->assertJsonPath('turnos.integral', 0)
            ->assertJsonPath('turnos.total_rede', 55);
    }
}
