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
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaCalendarDayReason;
use Modules\Educa\Models\EducaCalendarEvent;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class CoreCalendarEventsAndClassesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $school;
    private EducaAcademicYear $anoLetivo;
    private EducaAcademicCalendar $calendario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Eventos',
            'slug' => 'pref-eventos',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

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

        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Escola Monteiro Lobato',
            'code' => 'EMML-EV',
            'type' => 'setor',
            'level' => 1,
            'path' => '/1/',
            'order' => 1,
            'is_active' => true,
        ]);

        $this->school = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $this->anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->school->id,
            'ano' => 2026,
            'status' => 'ativo',
        ]);

        $this->calendario = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->school->id,
            'ano' => 2026,
            'nome' => 'Calendário EMML 2026',
            'status' => EducaAcademicCalendar::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($this->adminUser);
    }

    public function test_pode_criar_listar_atualizar_e_excluir_evento_no_calendario(): void
    {
        // 1. Cadastra evento
        $payload = [
            'titulo' => 'Feira de Ciências e Tecnologia',
            'descricao' => 'Apresentação dos projetos interdisciplinares do 6º ao 9º ano',
            'data' => '2026-05-15',
            'tipo_evento' => 'pedagogico',
            'horario_inicio' => '08:00',
            'horario_fim' => '12:00',
        ];

        $resCriacao = $this->postJson("/api/educa/core/calendarios/{$this->calendario->id}/eventos", $payload, $this->authHeaders);
        $resCriacao->assertStatus(201)
            ->assertJsonPath('data.titulo', 'Feira de Ciências e Tecnologia')
            ->assertJsonPath('data.tipo_evento', 'pedagogico');

        $eventoId = $resCriacao->json('data.id');

        // 2. Lista eventos filtrando por mês (maio = 5)
        $resLista = $this->getJson("/api/educa/core/calendarios/{$this->calendario->id}/eventos?mes=5", $this->authHeaders);
        $resLista->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eventoId);

        // 3. Detalha evento
        $resShow = $this->getJson("/api/educa/core/calendarios/{$this->calendario->id}/eventos/{$eventoId}", $this->authHeaders);
        $resShow->assertStatus(200)
            ->assertJsonPath('data.titulo', 'Feira de Ciências e Tecnologia');

        // 4. Atualiza evento
        $resUpdate = $this->putJson("/api/educa/core/calendarios/{$this->calendario->id}/eventos/{$eventoId}", [
            'titulo' => 'Feira de Ciências, Arte e Robótica',
        ], $this->authHeaders);
        $resUpdate->assertStatus(200)
            ->assertJsonPath('data.titulo', 'Feira de Ciências, Arte e Robótica');

        // 5. Exclui evento
        $resDelete = $this->deleteJson("/api/educa/core/calendarios/{$this->calendario->id}/eventos/{$eventoId}", [], $this->authHeaders);
        $resDelete->assertStatus(204);

        $this->assertSoftDeleted('educa_calendar_events', ['id' => $eventoId]);
    }

    public function test_pode_sincronizar_turmas_especificas_em_dia_de_reposicao_e_consultar_calendario_da_turma(): void
    {
        // 1. Cria Cursos, Séries e Matrizes
        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-REP',
            'nome' => 'Ensino Fundamental Reposição',
            'nivel' => 'fundamental_finais',
            'modalidade' => 'regular',
        ]);

        $serie9 = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 9,
            'codigo' => '9ANO',
            'nome' => '9º Ano',
        ]);

        $serie1 = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 1,
            'codigo' => '1ANO',
            'nome' => '1º Ano',
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie9->id,
            'nome' => 'Matriz Rep',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
        ]);

        // Cria as três turmas
        $turma9A = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->school->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie9->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-9A',
            'nome' => '9º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'status' => 'ativa',
        ]);

        $turma9B = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->school->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie9->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-9B',
            'nome' => '9º Ano B',
            'turno' => 'vespertino',
            'lotacao_maxima' => 30,
            'status' => 'ativa',
        ]);

        $turma1A = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->school->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie1->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TRM-1A',
            'nome' => '1º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 25,
            'status' => 'ativa',
        ]);

        // 2. Cadastra motivo de reposição e o dia sábado letivo
        $motivoExtra = EducaCalendarDayReason::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'SABADO_REPOSICAO',
            'nome' => 'Sábado Letivo de Reposição',
            'tipo' => 'extra_school_day',
            'is_school_day' => true,
        ]);

        $diaSabado = EducaCalendarDay::create([
            'tenant_id' => $this->tenant->id,
            'calendario_id' => $this->calendario->id,
            'data' => '2026-06-20',
            'dia_da_semana' => 7, // Sábado
            'motivo_id' => $motivoExtra->id,
            'is_school_day' => true,
            'descricao' => 'Reposição referente à paralisação de março',
        ]);

        // 3. Sincroniza o dia sábado exclusivamente para as turmas 9º Ano A e 9º Ano B
        $resSync = $this->putJson(
            "/api/educa/core/calendarios/{$this->calendario->id}/dias/{$diaSabado->id}/turmas",
            ['turma_ids' => [$turma9A->id, $turma9B->id]],
            $this->authHeaders
        );

        $resSync->assertStatus(200)
            ->assertJsonCount(2, 'turma_ids')
            ->assertJsonPath('turma_ids.0', $turma9A->id);

        // 4. Consulta o calendário da turma 9º Ano A (deve ter o sábado como letivo específico)
        $resCal9A = $this->getJson("/api/educa/core/turmas/{$turma9A->id}/calendario?mes=6", $this->authHeaders);
        $resCal9A->assertStatus(200)
            ->assertJsonPath('turma_id', $turma9A->id)
            ->assertJsonPath('dias.0.data', '2026-06-20')
            ->assertJsonPath('dias.0.is_school_day', true)
            ->assertJsonPath('dias.0.especifico_da_turma', true);

        // 5. Consulta o calendário da turma 1º Ano A (não foi incluída: sábado NÃO é letivo para ela)
        $resCal1A = $this->getJson("/api/educa/core/turmas/{$turma1A->id}/calendario?mes=6", $this->authHeaders);
        $resCal1A->assertStatus(200)
            ->assertJsonPath('turma_id', $turma1A->id)
            ->assertJsonPath('dias.0.data', '2026-06-20')
            ->assertJsonPath('dias.0.is_school_day', false)
            ->assertJsonPath('dias.0.especifico_da_turma', false);
    }
}
