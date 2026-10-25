<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaEnrollmentApplication;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolCapacity;
use Modules\Educa\Models\EducaWaitlist;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class GestaoVagasAndFilaEsperaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaCourse $curso;
    private EducaGrade $serie;
    private Pessoa $candidatoPcd;
    private Pessoa $candidatoRegular;
    private Pessoa $responsavel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Gestão de Vagas',
            'slug' => 'pref-teste-vagas',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Habilita módulos necessários
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
            'code' => 'EMEI-VAGAS',
            'name' => 'EMEI Darcy Ribeiro',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '99887766',
            'sigla' => 'EMEI-DR',
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
            'codigo' => 'EI-CRECHE',
            'nome' => 'Educação Infantil - Creche',
            'nivel' => 'infantil',
            'modalidade' => 'regular',
            'etapa' => 'creche',
        ]);

        $this->serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'codigo' => 'BERCARIO',
            'nome' => 'Berçário',
            'sequencial' => 1,
        ]);

        $this->responsavel = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Mariana de Souza Santos',
            'tipo' => 'PF',
            'status' => 'ativo',
        ]);

        $this->candidatoPcd = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Arthur Henrique Santos',
            'tipo' => 'PF',
            'data_nascimento' => '2025-05-10',
            'status' => 'ativo',
        ]);

        $this->candidatoRegular = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Bernardo Silva Oliveira',
            'tipo' => 'PF',
            'data_nascimento' => '2025-06-15',
            'status' => 'ativo',
        ]);
    }

    public function test_cadastrar_capacidade_de_vagas_e_calcular_remanescentes(): void
    {
        $payload = [
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'turno' => 'integral',
            'etapa_ensino' => 'creche_bercario',
            'vagas_totais' => 25,
            'vagas_reservadas' => 0,
            'vagas_ocupadas' => 0,
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/vagas/capacidades', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.vagas_totais', 25);
        $response->assertJsonPath('data.vagas_remanescentes', 25);

        $this->assertDatabaseHas('educa_school_capacities', [
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'capacidade_maxima_alunos' => 25,
        ]);

    }

    public function test_submeter_pre_matricula_gerando_protocolo_anual_e_pontuacao(): void
    {
        $payload = [
            'academic_year_id' => $this->anoLetivo->id,
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'criterio_pcd' => true,
            'criterio_bolsa_familia' => true,
            'criterio_mae_trabalhadora' => true,
            'criterio_irmao_escola' => false,
            'criterio_zoneamento' => true,
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/vagas/inscricoes', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.criterio_pcd', true);
        $response->assertJsonPath('data.pontuacao_total', 1170); // PcD (1000) + Bolsa Família (100) + Mãe Trabalhadora (50) + Zoneamento (20)
        $response->assertJsonPath('data.status', 'inscrito');


        $protocolo = $response->json('data.numero_protocolo');
        $this->assertMatchesRegularExpression('/^VAGA-2026-\d{5}$/', $protocolo);
    }

    public function test_analisar_inscricao_deferida_e_enfileirar_com_prioridade_pcd(): void
    {
        // Cria uma inscrição
        $inscricao = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00001',
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'inscrito',
            'criterio_pcd' => true,
            'criterio_bolsa_familia' => true,
            'criterio_mae_trabalhadora' => true,
            'criterio_irmao_escola' => false,
            'criterio_zoneamento' => true,
            'pontuacao_total' => 100,
        ]);

        $payload = [
            'status' => 'deferida',
            'criterios_confirmados' => ['pcd' => true, 'bolsa_familia' => true],
        ];

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/vagas/inscricoes/{$inscricao->id}/analisar", $payload);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'deferida');

        // Verifica inclusão na fila de espera
        $this->assertDatabaseHas('educa_waitlists', [
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricao->id,
            'school_id' => $this->escola->id,
            'prioridade_legal' => true,
            'status' => 'aguardando',
        ]);
    }

    public function test_reclassificacao_dinamica_da_fila_prioriza_pcd_sobre_candidato_sem_prioridade(): void
    {
        // Cria inscrição A (sem PcD, pontuação 80)
        $inscricaoA = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00001',
            'candidato_pessoa_id' => $this->candidatoRegular->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'deferida',
            'criterio_pcd' => false,
            'criterio_bolsa_familia' => true,
            'criterio_mae_trabalhadora' => true,
            'criterio_irmao_escola' => true,
            'criterio_zoneamento' => true,
            'pontuacao_total' => 80,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        $waitlistA = EducaWaitlist::create([
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricaoA->id,
            'school_id' => $this->escola->id,
            'etapa_ensino' => 'creche_bercario',
            'turno' => 'integral',
            'posicao' => 1,
            'prioridade_legal' => false,
            'pontuacao' => 80,
            'status' => 'aguardando',
            'created_at' => Carbon::now()->subDays(2),
        ]);

        // Cria inscrição B (com PcD, pontuação 100, inscrita depois)
        $inscricaoB = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00002',
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'deferida',
            'criterio_pcd' => true,
            'criterio_bolsa_familia' => false,
            'criterio_mae_trabalhadora' => false,
            'criterio_irmao_escola' => false,
            'criterio_zoneamento' => true,
            'pontuacao_total' => 100,
            'created_at' => Carbon::now(),
        ]);

        $waitlistB = EducaWaitlist::create([
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricaoB->id,
            'school_id' => $this->escola->id,
            'etapa_ensino' => 'creche_bercario',
            'turno' => 'integral',
            'posicao' => 2,
            'prioridade_legal' => true,
            'pontuacao' => 100,
            'status' => 'aguardando',
            'created_at' => Carbon::now(),
        ]);

        // Dispara reclassificação da fila
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/vagas/fila-espera/reclassificar', [
                'school_id' => $this->escola->id,
                'etapa_ensino' => 'creche_bercario',
            ]);

        $response->assertStatus(200);

        // Verifica que o candidato B (PcD) assumiu a 1ª posição e o candidato A foi para a 2ª
        $this->assertEquals(1, $waitlistB->fresh()->posicao);
        $this->assertEquals(2, $waitlistA->fresh()->posicao);
    }

    public function test_convocar_candidato_nominalmente_com_reserva_de_vaga_e_sla(): void
    {
        // Capacidade com 10 vagas
        $capacidade = EducaSchoolCapacity::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'turno' => 'integral',
            'etapa_ensino' => 'creche_bercario',
            'capacidade_maxima_alunos' => 10,
            'quantidade_salas' => 1,
            'vagas_reservadas' => 0,
            'vagas_ocupadas' => 0,
        ]);

        $inscricao = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00001',
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'deferida',
            'pontuacao_total' => 100,
        ]);

        $waitlist = EducaWaitlist::create([
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricao->id,
            'school_id' => $this->escola->id,
            'etapa_ensino' => 'creche_bercario',
            'turno' => 'integral',
            'posicao' => 1,
            'prioridade_legal' => true,
            'pontuacao' => 100,
            'status' => 'aguardando',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/vagas/fila-espera/{$waitlist->id}/convocar", [
                'dias_sla' => 5,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.status', 'convocado');

        // Capacidade deve ter 1 vaga reservada
        $this->assertEquals(1, $capacidade->fresh()->vagas_reservadas);
    }

    public function test_efetivar_matricula_a_partir_de_candidato_convocado(): void
    {
        $capacidade = EducaSchoolCapacity::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'turno' => 'integral',
            'etapa_ensino' => 'creche_bercario',
            'capacidade_maxima_alunos' => 10,
            'quantidade_salas' => 1,
            'vagas_reservadas' => 1,
            'vagas_ocupadas' => 0,
        ]);


        $inscricao = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00001',
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'convocada',
            'pontuacao_total' => 100,
        ]);

        $waitlist = EducaWaitlist::create([
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricao->id,
            'school_id' => $this->escola->id,
            'etapa_ensino' => 'creche_bercario',
            'turno' => 'integral',
            'posicao' => 1,
            'prioridade_legal' => true,
            'pontuacao' => 100,
            'status' => 'convocado',
            'convocado_em' => Carbon::now(),
            'limite_comparecimento_em' => Carbon::now()->addDays(5),
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/vagas/fila-espera/{$waitlist->id}/converter-matricula", [
                'codigo_matricula' => 'MAT-2026-0001',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status', EducaEnrollment::STATUS_ATIVA);

        // Fila deve marcar matriculado
        $this->assertEquals('matriculado', $waitlist->fresh()->status);

        // Capacidade deve atualizar vagas ocupadas
        $this->assertEquals(1, $capacidade->fresh()->vagas_ocupadas);
        $this->assertEquals(0, $capacidade->fresh()->vagas_reservadas);
    }

    public function test_consulta_publica_da_fila_de_espera_com_anonimizacao_lgpd(): void
    {
        $inscricao = EducaEnrollmentApplication::create([
            'tenant_id' => $this->tenant->id,
            'academic_year_id' => $this->anoLetivo->id,
            'numero_protocolo' => 'VAGA-2026-00099',
            'candidato_pessoa_id' => $this->candidatoPcd->id,
            'responsavel_pessoa_id' => $this->responsavel->id,
            'etapa_ensino' => 'creche_bercario',
            'turno_preferencial' => 'integral',
            'escola_preferencia_1_id' => $this->escola->id,
            'status' => 'deferida',
            'pontuacao_total' => 100,
        ]);

        EducaWaitlist::create([
            'tenant_id' => $this->tenant->id,
            'application_id' => $inscricao->id,
            'school_id' => $this->escola->id,
            'etapa_ensino' => 'creche_bercario',
            'turno' => 'integral',
            'posicao' => 1,
            'prioridade_legal' => true,
            'pontuacao' => 100,
            'status' => 'aguardando',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/vagas/fila-espera/consulta-publica?school_id={$this->escola->id}&etapa_ensino=creche_bercario");

        $response->assertStatus(200);


        // Verifica que o nome do candidato está mascarado no padrão "A*** H*** S***"
        $candidatoAnonimizado = $response->json('data.0.candidato_anonimizado');
        $this->assertNotEmpty($candidatoAnonimizado);
        $this->assertStringContainsString('***', $candidatoAnonimizado);
        $this->assertStringNotContainsString('Arthur Henrique Santos', $candidatoAnonimizado);
    }
}
