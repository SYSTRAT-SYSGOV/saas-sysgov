<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaAeeEnrollment;
use Modules\Educa\Models\EducaAeePei;
use Modules\Educa\Models\EducaAeeResourceRoom;
use Modules\Educa\Models\EducaAeeStudentProfile;
use Modules\Educa\Models\EducaAeeSupportAllocation;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class EducacaoEspecialAeeTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaCourse $curso;
    private EducaGrade $serie;
    private EducaSchoolClass $turmaManha;
    private Pessoa $aluno;
    private EducaEnrollment $matricula;
    private EducaEmployee $cuidador;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste AEE',
            'slug' => 'pref-teste-aee',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

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

        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-AEE',
            'name' => 'EMEF Paulo Freire',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '11223344',
            'sigla' => 'EMEF-PF',
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
            'data_inicio' => '2026-02-02',
            'data_fim' => '2026-12-18',
            'total_dias_letivos' => 200,
        ]);

        $this->curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-ANOS-INICIAIS',
            'nome' => 'Ensino Fundamental - Anos Iniciais',
            'nivel' => 'fundamental',
            'modalidade' => 'regular',
            'etapa' => 'fundamental_anos_iniciais',
        ]);

        $this->serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'codigo' => '3-ANO',
            'nome' => '3º Ano',
            'sequencial' => 3,
        ]);

        $matriz = \Modules\Educa\Models\EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'nome' => 'Matriz 3º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
            'ativo' => true,
        ]);

        $this->turmaManha = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => '3B-MANHA',
            'nome' => '3º Ano B',
            'turno' => 'matutino',
            'lotacao_maxima' => 25,
            'lotacao_efetiva' => 0,
            'tipo_atendimento' => 'regular',
            'status' => 'ativa',
        ]);

        $this->aluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Guilherme dos Santos Silva',
            'documento' => '12345678901',
            'status' => 'ativo',
        ]);

        $this->matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'codigo_matricula' => 'MAT-2026-AEE-01',
            'data_matricula' => '2026-01-15',
            'status' => 'ativa',
            'tipo_ingresso' => 'regular',
        ]);

        EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'school_class_id' => $this->turmaManha->id,
            'data_entrada' => '2026-02-02',
            'status' => 'ativa',
        ]);

        $pessoaCuidador = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Carla Silveira Dias',
            'documento' => '99988877766',
            'status' => 'ativo',
        ]);

        $this->cuidador = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $pessoaCuidador->id,
            'matricula' => 'FUNC-AEE-01',
            'cargo' => 'Cuidador Escolar',
            'status' => 'ativo',
            'tipo_vinculo' => 'efetivo',
            'carga_horaria_semanal' => 40,
        ]);
    }

    public function test_pode_criar_perfil_paee_com_laudo_medico_e_sigilo_lgpd(): void
    {
        $payload = [
            'enrollment_id' => $this->matricula->id,
            'pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'tipo_condicao' => 'tea',
            'cid10_codigo' => 'F84.0',
            'diagnostico_descricao' => 'Transtorno do Espectro Autista com necessidade de apoio em comunicação',
            'laudo_medico_url' => 'https://storage.sysgov.local/laudos/laudo_guilherme_2026.pdf',
            'laudo_medico_emitido_em' => '2025-08-15',
            'profissional_emissor' => 'Dr. Renato Alencar',
            'registro_profissional' => 'CRM/SP 98214',
            'precisa_cuidador' => true,
            'precisa_interprete_libras' => false,
            'precisa_transporte_adaptado' => false,
            'barreiras_identificadas' => ['comunicacao_verbal', 'sensorial_ruidos'],
            'recursos_acessibilidade' => ['pecs', 'protetor_auricular'],
        ];

        $response = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/aee/perfis', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.tipo_condicao', 'tea')
            ->assertJsonPath('data.cid10_codigo', 'F84.0')
            ->assertJsonPath('data.precisa_cuidador', true);

        $perfilId = $response->json('data.id');

        $this->assertDatabaseHas('educa_aee_student_profiles', [
            'id' => $perfilId,
            'tenant_id' => $this->tenant->id,
            'tipo_condicao' => 'tea',
            'cid10_codigo' => 'F84.0',
        ]);

        // Verificação de auditoria
        $this->assertDatabaseHas('audit_logs', ['tenant_id' => $this->tenant->id, 'module' => 'educa', 'action' => 'educa.aee.student_profile.created', 'resource' => "educa_aee_student_profile:{$perfilId}"]);

        // Consulta pelo endpoint show
        $showResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/aee/perfis/{$perfilId}");

        $showResponse->assertOk()
            ->assertJsonPath('data.cid10_codigo', 'F84.0')
            ->assertJsonPath('data.profissional_emissor', 'Dr. Renato Alencar');
    }

    public function test_pode_elaborar_pei_com_metas_pedagogicas_adaptadas(): void
    {
        $perfil = EducaAeeStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'tipo_condicao' => 'tea',
            'cid10_codigo' => 'F84.0',
            'status' => 'ativo',
        ]);

        // 1. Criar PEI
        $peiPayload = [
            'student_profile_id' => $perfil->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'semestre' => 1,
            'habilidades_atuais' => 'Reconhece numerais até 20 e cores primárias',
            'necessidades_especificas' => 'Mediação em atividades de escrita e rotina visual',
            'adequacoes_curriculares' => 'Tempo estendido e enunciados com suporte pictográfico',
            'status' => 'ativo',
        ];

        $peiResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/aee/peis', $peiPayload);

        $peiResponse->assertCreated()
            ->assertJsonPath('data.ano_letivo', 2026)
            ->assertJsonPath('data.semestre', 1);

        $peiId = $peiResponse->json('data.id');

        // 2. Adicionar Meta de Desenvolvimento
        $metaPayload = [
            'area_desenvolvimento' => 'comunicacao_linguagem',
            'objetivo' => 'Expressar intenção de ir ao banheiro utilizando o quadro de comunicação alternativa',
            'estrategias' => 'Pareamento de cartão PECS com a ação concreta durante 4 semanas',
            'indicadores_sucesso' => 'Autonomia em 80% das solicitações sem prompting físico',
            'status' => 'em_andamento',
        ];

        $metaResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/aee/peis/{$peiId}/metas", $metaPayload);

        $metaResponse->assertCreated()
            ->assertJsonPath('data.area_desenvolvimento', 'comunicacao_linguagem')
            ->assertJsonPath('data.status', 'em_andamento');

        $this->assertDatabaseHas('educa_aee_pei_goals', [
            'pei_id' => $peiId,
            'area_desenvolvimento' => 'comunicacao_linguagem',
            'status' => 'em_andamento',
        ]);

        // 3. Registrar Parecer Descritivo Semestral
        $parecerPayload = [
            'parecer_descritivo' => 'O estudante demonstrou evolução satisfatória na comunicação alternativa.',
            'status' => 'concluido',
        ];

        $parecerResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/aee/peis/{$peiId}/parecer", $parecerPayload);

        $parecerResponse->assertOk()
            ->assertJsonPath('data.status', 'concluido');

        $this->assertDatabaseHas('educa_aee_peis', [
            'id' => $peiId,
            'status' => 'concluido',
        ]);
    }

    public function test_enturmacao_em_srm_valida_dupla_entrada_no_contraturno(): void
    {
        // Aluno estuda de manhã (matutino)
        $perfil = EducaAeeStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'tipo_condicao' => 'tea',
            'status' => 'ativo',
        ]);

        $srm = EducaAeeResourceRoom::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'nome' => 'Sala de Recursos Multifuncionais Polo',
            'tipo_sala' => 'tipo_1_generica',
            'capacidade_atendimento' => 10,
            'is_polo' => true,
            'is_active' => true,
        ]);

        // 1. Tentativa de enturmação no MESMO turno (matutino/manha) -> Deve falhar (422)
        $payloadConflito = [
            'student_profile_id' => $perfil->id,
            'regular_enrollment_id' => $this->matricula->id,
            'turno_atendimento' => 'manha',
            'frequencia_semanal' => 2,
        ];

        $responseConflito = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/aee/salas-recursos/{$srm->id}/matriculas", $payloadConflito);

        $responseConflito->assertStatus(422)
            ->assertJsonPath('error_code', 'conflito_contraturno_ou_capacidade');

        // 2. Enturmação no contraturno (tarde) -> Deve suceder (201)
        $payloadContraturno = [
            'student_profile_id' => $perfil->id,
            'regular_enrollment_id' => $this->matricula->id,
            'turno_atendimento' => 'tarde',
            'frequencia_semanal' => 2,
            'horario_inicio' => '14:00',
            'horario_fim' => '16:00',
        ];

        $responseSucesso = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/aee/salas-recursos/{$srm->id}/matriculas", $payloadContraturno);

        $responseSucesso->assertCreated()
            ->assertJsonPath('data.turno_atendimento', 'tarde');

        $this->assertDatabaseHas('educa_aee_enrollments', [
            'resource_room_id' => $srm->id,
            'student_profile_id' => $perfil->id,
            'turno_atendimento' => 'tarde',
            'status' => 'ativo',
        ]);
    }

    public function test_alocacao_de_cuidador_aplica_trava_de_sobrecarga(): void
    {
        // Criar 3 estudantes com perfis distintos
        $perfis = [];
        for ($i = 1; $i <= 4; $i++) {
            $alunoPessoa = Pessoa::create([
                'tenant_id' => $this->tenant->id,
                'tipo' => 'fisica',
                'nome' => "Estudante Dependente {$i}",
                'documento' => "1112223330{$i}",
                'status' => 'ativo',
            ]);

            $matr = EducaEnrollment::create([
                'tenant_id' => $this->tenant->id,
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'course_id' => $this->curso->id,
                'grade_id' => $this->serie->id,
                'aluno_pessoa_id' => $alunoPessoa->id,
                'codigo_matricula' => "MAT-CUID-{$i}",
                'data_matricula' => '2026-01-15',
                'status' => 'ativa',
                'tipo_ingresso' => 'regular',
            ]);

            $perfis[] = EducaAeeStudentProfile::create([
                'tenant_id' => $this->tenant->id,
                'enrollment_id' => $matr->id,
                'pessoa_id' => $alunoPessoa->id,
                'school_id' => $this->escola->id,
                'tipo_condicao' => 'deficiencia_fisica',
                'precisa_cuidador' => true,
                'status' => 'ativo',
            ]);
        }

        // Aloca 3 alunos para a cuidadora Carla no turno da manhã (limite municipal: 3)
        for ($i = 0; $i < 3; $i++) {
            $payload = [
                'student_profile_id' => $perfis[$i]->id,
                'school_id' => $this->escola->id,
                'caregiver_employee_id' => $this->cuidador->id,
                'tipo_apoio' => 'cuidador_alimentacao_higiene',
                'turno' => 'manha',
                'carga_horaria_semanal' => 20,
                'data_inicio' => '2026-02-02',
            ];

            $res = $this->actingAs($this->adminUser)
                ->withHeaders($this->authHeaders)
                ->postJson('/api/educa/aee/profissionais-apoio/alocacoes', $payload);

            $res->assertCreated();
        }

        // Tentativa de alocar o 4º estudante dependente para o mesmo cuidador no mesmo turno
        $payloadSobrecarga = [
            'student_profile_id' => $perfis[3]->id,
            'school_id' => $this->escola->id,
            'caregiver_employee_id' => $this->cuidador->id,
            'tipo_apoio' => 'cuidador_alimentacao_higiene',
            'turno' => 'manha',
            'carga_horaria_semanal' => 20,
            'data_inicio' => '2026-02-02',
        ];

        $resSobrecarga = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/aee/profissionais-apoio/alocacoes', $payloadSobrecarga);

        $resSobrecarga->assertStatus(422)
            ->assertJsonPath('error_code', 'sobrecarga_cuidador');

        $this->assertEquals(3, EducaAeeSupportAllocation::where('caregiver_employee_id', $this->cuidador->id)->count());
    }

    public function test_isolamento_multi_tenant_estrito_em_aee(): void
    {
        $tenant2 = Tenant::create([
            'name' => 'Prefeitura Outra',
            'slug' => 'pref-outra-aee',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        $perfilTenant1 = EducaAeeStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'pessoa_id' => $this->aluno->id,
            'school_id' => $this->escola->id,
            'tipo_condicao' => 'tea',
            'cid10_codigo' => 'F84.0',
            'status' => 'ativo',
        ]);

        // Consulta autenticado no Tenant 2 não deve enxergar o perfil do Tenant 1
        $adminUser2 = User::factory()->create(['is_platform_admin' => true]);
        $tenant2->users()->attach($adminUser2->id, ['status' => 'active', 'is_primary' => true]);

        $resTenant2 = $this->actingAs($adminUser2)
            ->withHeaders([
                'X-Tenant-Slug' => $tenant2->slug,
                'Accept' => 'application/json',
            ])
            ->getJson('/api/educa/aee/perfis');

        $resTenant2->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
