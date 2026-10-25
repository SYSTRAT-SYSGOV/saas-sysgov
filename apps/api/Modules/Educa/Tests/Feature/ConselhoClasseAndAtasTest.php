<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaConselhoAta;
use Modules\Educa\Models\EducaConselhoCronograma;
use Modules\Educa\Models\EducaConselhoPreConselho;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class ConselhoClasseAndAtasTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaCourse $curso;
    private EducaGrade $serie;
    private EducaCurriculumComponent $disciplinaMatematica;
    private EducaSchoolClass $turma;
    private Pessoa $aluno;
    private EducaEnrollment $matricula;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Conselho',
            'slug' => 'pref-teste-conselho',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        foreach (['educa', 'educa-pedagogico', 'educa-secretaria'] as $alias) {
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
            'code' => 'EMEF-CONSELHO',
            'name' => 'EMEF Paulo Freire',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '99887766',
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

        $area = EducaKnowledgeArea::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'MAT',
            'nome' => 'Matemática',
            'ordem' => 1,
        ]);

        $this->disciplinaMatematica = EducaCurriculumComponent::create([
            'tenant_id' => $this->tenant->id,
            'knowledge_area_id' => $area->id,
            'codigo' => 'MAT-03',
            'nome' => 'Matemática 3º Ano',
            'sigla' => 'MAT',
            'base_curricular' => 'nacional_comum',
            'horas_semanais' => 4,
            'ordem' => 1,
            'obrigatorio' => true,
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'nome' => 'Matriz Curricular 3º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 800,
            'ativo' => true,
        ]);

        $this->turma = EducaSchoolClass::create([
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
            'lotacao_efetiva' => 1,
            'tipo_atendimento' => 'regular',
            'status' => 'ativa',
        ]);

        $this->aluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'fisica',
            'nome' => 'Lucas Gabriel Silveira',
            'documento' => '11144477733',
            'status' => 'ativo',
        ]);

        $this->matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $this->curso->id,
            'grade_id' => $this->serie->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'codigo_matricula' => 'MAT-2026-CONSELHO-01',
            'data_matricula' => '2026-01-20',
            'status' => 'ativa',
            'tipo_ingresso' => 'regular',
        ]);

        EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'school_class_id' => $this->turma->id,
            'data_entrada' => '2026-02-02',
            'status' => 'ativa',
        ]);
    }

    public function test_pode_criar_cronograma_de_conselho_e_consultar_detalhes(): void
    {
        $payload = [
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'periodo' => '1_bimestre',
            'data_inicio_pre_conselho' => '2026-04-01',
            'data_fim_pre_conselho' => '2026-04-15',
            'data_reuniao_conselho' => '2026-04-20',
            'status' => 'agendado',
            'observacoes' => 'Reunião de fechamento do primeiro bimestre',
        ];

        $response = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/conselho/cronogramas', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.periodo', '1_bimestre')
            ->assertJsonPath('data.status', 'agendado');

        $cronogramaId = $response->json('data.id');

        $this->assertDatabaseHas('educa_conselho_cronogramas', [
            'id' => $cronogramaId,
            'tenant_id' => $this->tenant->id,
            'periodo' => '1_bimestre',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenant->id,
            'module' => 'educa',
            'action' => 'educa.conselho.cronograma.created',
            'resource' => "educa_conselho_cronograma:{$cronogramaId}",
        ]);

        $showResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/conselho/cronogramas/{$cronogramaId}");

        $showResponse->assertOk()
            ->assertJsonPath('data.id', $cronogramaId);
    }

    public function test_submissao_de_pre_conselho_e_sinalizacao_de_estudante_em_atencao(): void
    {
        $cronograma = EducaConselhoCronograma::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'periodo' => '1_bimestre',
            'data_inicio_pre_conselho' => '2026-04-01',
            'data_fim_pre_conselho' => '2026-04-30',
            'data_reuniao_conselho' => '2026-05-05',
            'status' => 'agendado',
        ]);

        $payload = [
            'cronograma_id' => $cronograma->id,
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->disciplinaMatematica->id,
            'periodo' => '1_bimestre',
            'desempenho_geral_turma' => 'bom',
            'objetivos_atingidos_percentual' => 85,
            'metodologias_utilizadas' => ['aula_dialogada', 'resolucao_problemas'],
            'dificuldades_detectadas' => 'Operações com frações e interpretação de enunciados',
            'acoes_intervencao_sugeridas' => 'Plantão de dúvidas e material manipulável',
        ];

        // 1. Salvar ficha de pré-conselho (usando header de data dentro da janela)
        $response = $this->actingAs($this->adminUser)
            ->withHeaders(array_merge($this->authHeaders, ['X-Data-Referencia' => '2026-04-10']))
            ->postJson('/api/educa/conselho/pre-conselhos', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.desempenho_geral_turma', 'bom')
            ->assertJsonPath('data.objetivos_atingidos_percentual', 85);

        $preConselhoId = $response->json('data.id');

        // 2. Sinalizar aluno na ficha de pré-conselho
        $alunoPayload = [
            'enrollment_id' => $this->matricula->id,
            'nivel_atencao' => 'alto',
            'motivo_atencao' => 'rendimento_baixo',
            'detalhes' => 'Dificuldade na compreensão dos conceitos de adição com reserva',
            'encaminhamentos' => 'Atendimento pedagógico individualizado às terças-feiras',
        ];

        $alunoResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/conselho/pre-conselhos/{$preConselhoId}/alunos", $alunoPayload);

        $alunoResponse->assertCreated()
            ->assertJsonPath('data.nivel_atencao', 'alto')
            ->assertJsonPath('data.motivo_atencao', 'rendimento_baixo');

        $this->assertDatabaseHas('educa_conselho_pre_conselho_alunos', [
            'pre_conselho_id' => $preConselhoId,
            'enrollment_id' => $this->matricula->id,
            'nivel_atencao' => 'alto',
        ]);
    }

    public function test_bloqueia_submissao_de_pre_conselho_fora_do_prazo_do_cronograma(): void
    {
        $cronogramaPassado = EducaConselhoCronograma::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'periodo' => '1_bimestre',
            'data_inicio_pre_conselho' => '2026-03-01',
            'data_fim_pre_conselho' => '2026-03-15',
            'data_reuniao_conselho' => '2026-03-20',
            'status' => 'agendado',
        ]);

        $payload = [
            'cronograma_id' => $cronogramaPassado->id,
            'school_class_id' => $this->turma->id,
            'curriculum_component_id' => $this->disciplinaMatematica->id,
            'periodo' => '1_bimestre',
            'desempenho_geral_turma' => 'regular',
        ];

        // Tentativa de submissão na data '2026-03-25' (após encerramento do prazo em '2026-03-15')
        // Sem a flag explicita bypass_prazo, a submissão fora do prazo é bloqueada com 422
        $response = $this->actingAs($this->adminUser)
            ->withHeaders(array_merge($this->authHeaders, ['X-Data-Referencia' => '2026-03-25']))
            ->postJson('/api/educa/conselho/pre-conselhos', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'prazo_pre_conselho_encerrado');
    }

    public function test_deliberacao_em_ata_e_trava_de_imutabilidade_apos_finalizacao(): void
    {
        $cronograma = EducaConselhoCronograma::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'periodo' => '1_bimestre',
            'data_inicio_pre_conselho' => '2026-04-01',
            'data_fim_pre_conselho' => '2026-04-15',
            'data_reuniao_conselho' => '2026-04-20',
            'status' => 'agendado',
        ]);

        // 1. Criar ata em rascunho
        $ataPayload = [
            'school_id' => $this->escola->id,
            'school_class_id' => $this->turma->id,
            'cronograma_id' => $cronograma->id,
            'periodo' => '1_bimestre',
            'data_reuniao' => '2026-04-20',
            'horario_inicio' => '08:00',
            'horario_fim' => '10:00',
            'resumo_geral' => 'Sessão plenária realizada com quórum total de docentes.',
        ];

        $ataResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/conselho/atas', $ataPayload);

        $ataResponse->assertCreated()
            ->assertJsonPath('data.status', 'rascunho');

        $ataId = $ataResponse->json('data.id');

        // 2. Registrar deliberação do aluno
        $deliberacaoPayload = [
            'enrollment_id' => $this->matricula->id,
            'resultado_deliberacao' => 'progressao_plena',
            'parecer_descritivo' => 'Estudante cumpriu com aproveitamento as metas curriculares do primeiro bimestre.',
        ];

        $delibResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/conselho/atas/{$ataId}/deliberacoes", $deliberacaoPayload);

        $delibResponse->assertCreated()
            ->assertJsonPath('data.resultado_deliberacao', 'progressao_plena');

        // 3. Finalizar a ata
        $finalizarResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/conselho/atas/{$ataId}/finalizar");

        $finalizarResponse->assertOk()
            ->assertJsonPath('data.status', 'finalizada');

        $this->assertDatabaseHas('educa_conselho_atas', [
            'id' => $ataId,
            'status' => 'finalizada',
        ]);

        // 4. Tentativa de alterar a ata finalizada (deve falhar com 422 - imutabilidade)
        $tentativaUpdate = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->putJson("/api/educa/conselho/atas/{$ataId}", [
                'resumo_geral' => 'Tentativa de alteração não permitida',
            ]);

        $tentativaUpdate->assertStatus(422)
            ->assertJsonPath('error_code', 'ata_bloqueada_para_edicao');

        // 5. Tentativa de registrar nova deliberação em ata finalizada (deve falhar com 422)
        $tentativaDelib = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/conselho/atas/{$ataId}/deliberacoes", $deliberacaoPayload);

        $tentativaDelib->assertStatus(422)
            ->assertJsonPath('error_code', 'ata_bloqueada_para_edicao');
    }

    public function test_isolamento_multi_tenant_estrito_em_conselho_e_atas(): void
    {
        $tenant2 = Tenant::create([
            'name' => 'Outra Prefeitura Conselho',
            'slug' => 'outra-pref-conselho',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        $cronogramaTenant1 = EducaConselhoCronograma::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano_letivo' => 2026,
            'periodo' => '1_bimestre',
            'data_inicio_pre_conselho' => '2026-04-01',
            'data_fim_pre_conselho' => '2026-04-15',
            'data_reuniao_conselho' => '2026-04-20',
            'status' => 'agendado',
        ]);

        $adminUser2 = User::factory()->create(['is_platform_admin' => true]);
        $tenant2->users()->attach($adminUser2->id, ['status' => 'active', 'is_primary' => true]);

        // Consulta pelo Tenant 2 não deve retornar o cronograma do Tenant 1
        $resTenant2 = $this->actingAs($adminUser2)
            ->withHeaders([
                'X-Tenant-Slug' => $tenant2->slug,
                'Accept' => 'application/json',
            ])
            ->getJson('/api/educa/conselho/cronogramas');

        $resTenant2->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
