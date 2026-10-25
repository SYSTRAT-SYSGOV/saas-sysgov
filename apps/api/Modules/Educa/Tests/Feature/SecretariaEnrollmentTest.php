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
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaSchoolGrade;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Educa\Models\EducaTransfer;
use Modules\Educa\Services\TransferService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class SecretariaEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaCourse $curso;
    private EducaGrade $serie;
    private EducaCurriculumMatrix $matriz;
    private Pessoa $aluno;
    private Pessoa $mae;

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

        // Habilita os módulos educa e educa-secretaria no catálogo
        foreach (['educa', 'educa-secretaria'] as $alias) {
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

        // 1. Cadastros de Pessoas no MDM
        $this->aluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'João Silva',
            'data_nascimento' => '2015-05-10',
        ]);

        $this->mae = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Maria Silva',
            'documento' => '12345678901',
        ]);

        // 2. OrgUnit e Escola
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Escola Municipal Monteiro Lobato',
            'code' => 'EMML-01',
            'acronym' => 'EMML',
            'type' => 'escola',
            'level' => 3,
            'status' => 'active',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '12345678',
            'sigla' => 'EMML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        // 3. Ano Letivo e Calendário
        $this->anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'ano' => 2026,
            'status' => 'active',
            'data_inicio' => Carbon::create(2026, 2, 2)->toDateString(),
            'data_fim' => Carbon::create(2026, 12, 18)->toDateString(),
        ]);

        // 4. Curso, Série e Matriz
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

        EducaSchoolGrade::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'grade_id' => $this->serie->id,
            'bloquear_enturmacao_sem_vaga' => true,
        ]);

        $this->matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'nome' => 'Matriz 5º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 880,
            'ativo' => true,
        ]);
    }

    public function test_realizar_matricula_inicial_gera_codigo_sequencial_e_vincula_pessoa_mdm(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
        ];

        $response = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/secretaria/matriculas', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(EducaEnrollment::STATUS_ATIVA, $data['status']);
        $this->assertEquals('2026-000001', $data['codigo_matricula']);
        $this->assertEquals($this->aluno->id, $data['aluno_pessoa_id']);
        $this->assertEquals('João Silva', $data['aluno_nome']);
        $this->assertEquals('Escola Municipal Monteiro Lobato', $data['escola_nome']);

        $this->assertDatabaseHas('educa_enrollments', [
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'codigo_matricula' => '2026-000001',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);
    }

    public function test_bloquear_matricula_duplicada_no_mesmo_ano_e_serie(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
        ];

        // 1ª Matrícula (sucesso)
        $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/secretaria/matriculas', $payload)
            ->assertStatus(201);

        // 2ª Matrícula duplicada (bloqueio 409 CONFLICT)
        $response = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/secretaria/matriculas', $payload);

        $response->assertStatus(409);
        $response->assertJson([
            'code' => 'CONFLICT',
        ]);
    }

    public function test_enturmar_estudante_com_controle_estrito_de_vagas_e_bloqueio_quando_lotada(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Turma com capacidade máxima de 1 vaga
        $turma = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5A-VAGA',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 1,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
        ]);

        $matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        // Enturma João Silva na turma
        $response = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/enturmar", [
                'school_class_id' => $turma->id,
                'data_entrada' => '2026-02-02',
            ]);

        $response->assertStatus(200);
        $turma->refresh();
        $this->assertEquals(1, $turma->lotacao_efetiva);
        $this->assertEquals(0, $turma->vagas_disponiveis);

        // Segundo aluno tenta enturmar na mesma turma lotada
        app(TenantContext::class)->set($this->tenant);
        $segundoAluno = Pessoa::create([
            'tipo' => 'fisica',
            'nome' => 'Pedro Souza',
        ]);

        $matricula2 = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $segundoAluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000002',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        $resFalha = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula2->id}/enturmar", [
                'school_class_id' => $turma->id,
                'data_entrada' => '2026-02-02',
            ]);

        $resFalha->assertStatus(422);
        $resFalha->assertJsonValidationErrors(['school_class_id']);
    }

    public function test_bloquear_enturmacao_com_choque_de_horario_regular_mas_permitir_aee_contraturno(): void
    {
        Sanctum::actingAs($this->adminUser);

        $turmaRegular1 = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5A-REG1',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
        ]);

        $turmaRegular2 = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5B-REG2',
            'nome' => '5º Ano B',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
        ]);

        $turmaAee = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-AEE-SR',
            'nome' => 'Sala de Recursos AEE',
            'turno' => 'vespertino',
            'lotacao_maxima' => 10,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'aee',
        ]);

        $matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        // Enturma na 1ª turma regular matutina
        $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/enturmar", [
                'school_class_id' => $turmaRegular1->id,
                'data_entrada' => '2026-02-02',
            ])->assertStatus(200);

        // Tenta enturmar na 2ª turma regular matutina (choque de horários)
        $resChoque = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/enturmar", [
                'school_class_id' => $turmaRegular2->id,
                'data_entrada' => '2026-02-02',
            ]);

        $resChoque->assertStatus(422);
        $resChoque->assertJsonValidationErrors(['school_class_id']);

        // Enturma na sala de recursos AEE (contraturno vespertino) -> Permitido!
        $resAee = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/enturmar", [
                'school_class_id' => $turmaAee->id,
                'data_entrada' => '2026-02-02',
            ]);

        $resAee->assertStatus(200);
    }

    public function test_remanejar_estudante_liberando_vaga_na_turma_origem_e_ocupando_destino(): void
    {
        Sanctum::actingAs($this->adminUser);

        $turmaOrigem = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5A-REM-ORIG',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 20,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
        ]);

        $turmaDestino = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5B-REM-DEST',
            'nome' => '5º Ano B',
            'turno' => 'vespertino',
            'lotacao_maxima' => 20,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
        ]);

        $matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        // Enturma na origem
        $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/enturmar", [
                'school_class_id' => $turmaOrigem->id,
                'data_entrada' => '2026-02-02',
            ])->assertStatus(200);

        $turmaOrigem->refresh();
        $this->assertEquals(1, $turmaOrigem->lotacao_efetiva);

        // Remaneja para turma destino
        $resRemanejar = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/secretaria/matriculas/{$matricula->id}/remanejar", [
                'turma_destino_id' => $turmaDestino->id,
                'data_remanejamento' => '2026-03-01',
                'motivo' => 'Mudança de turno a pedido dos responsáveis',
            ]);

        $resRemanejar->assertStatus(200);

        $turmaOrigem->refresh();
        $turmaDestino->refresh();
        $this->assertEquals(0, $turmaOrigem->lotacao_efetiva); // Vaga liberada!
        $this->assertEquals(1, $turmaDestino->lotacao_efetiva); // Vaga ocupada!

        $this->assertDatabaseHas('educa_transfers', [
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $matricula->id,
            'tipo' => EducaTransfer::TIPO_INTERNA,
            'turma_origem_id' => $turmaOrigem->id,
            'turma_destino_id' => $turmaDestino->id,
        ]);
    }

    public function test_perfil_aluno_e_responsaveis_mdm(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Consulta inicial
        $resGet = $this->withHeaders($this->authHeaders)
            ->getJson("/api/educa/secretaria/alunos/{$this->aluno->id}/perfil");

        $resGet->assertStatus(200);
        $this->assertEquals($this->aluno->id, $resGet->json('data.pessoa_id'));

        // Atualização de dados complementares
        $resPut = $this->withHeaders($this->authHeaders)
            ->putJson("/api/educa/secretaria/alunos/{$this->aluno->id}/perfil", [
                'codigo_nis' => '12345678900',
                'cartao_sus' => '898000123456789',
                'bolsa_familia' => true,
                'necessidades_especiais' => true,
                'laudo_medico_aee' => 'Transtorno do Espectro Autista (TEA)',
                'transporte_escolar_publico' => true,
                'certidao_nascimento_termo' => '12345',
                'certidao_nascimento_livro' => 'A-01',
                'certidao_nascimento_folha' => '100',
                'certidao_cartorio' => '1º Cartório de Registro Civil de Pessoas Naturais',
            ]);

        $resPut->assertStatus(200);
        $this->assertEquals('12345678900', $resPut->json('data.codigo_nis'));
        $this->assertTrue($resPut->json('data.bolsa_familia'));

        $this->assertDatabaseHas('educa_student_profiles', [
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->aluno->id,
            'codigo_nis' => '12345678900',
            'bolsa_familia' => true,
        ]);
    }

    public function test_transferencia_saida_da_rede_com_liberacao_de_vaga(): void
    {
        Sanctum::actingAs($this->adminUser);

        $turma = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $this->matriz->id,
            'codigo' => 'TURMA-5A-TRANSF',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 20,
            'lotacao_efetiva' => 1,
            'tipo_atendimento' => 'regular',
        ]);

        $matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        $enturmacao = EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $matricula->id,
            'school_class_id' => $turma->id,
            'numero_ordem' => 1,
            'data_entrada' => '2026-02-02',
            'status' => EducaClassEnrollment::STATUS_ATIVA,
        ]);

        /** @var TransferService $transferService */
        $transferService = app(TransferService::class);
        $transfer = $transferService->transferirParaForaDaRede($matricula, [
            'data_transferencia' => '2026-04-10',
            'motivo' => 'Mudança de município da família',
            'escola_destino_externa' => 'Escola Estadual Tancredo Neves',
            'municipio_destino_externo' => 'Belo Horizonte',
            'uf_destino_externo' => 'MG',
        ]);

        $matricula->refresh();
        $turma->refresh();
        $enturmacao->refresh();

        $this->assertEquals(EducaEnrollment::STATUS_TRANSFERIDA, $matricula->status);
        $this->assertEquals(0, $turma->lotacao_efetiva); // Vaga liberada
        $this->assertEquals(EducaClassEnrollment::STATUS_ENCERRADA, $enturmacao->status);
        $this->assertEquals(EducaTransfer::TIPO_SAIDA_REDE, $transfer->tipo);
    }
}
