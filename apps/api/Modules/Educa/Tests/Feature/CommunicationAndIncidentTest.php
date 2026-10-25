<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentGuardian;
use Modules\Educa\Models\EducaStudentIncident;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class CommunicationAndIncidentTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaSchoolClass $turma;
    private Pessoa $pessoaAluno;
    private Pessoa $pessoaResponsavel;
    private EducaEnrollment $matricula;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Comunicacao',
            'slug' => 'pref-teste-comunicacao',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        foreach (['educa', 'educa-secretaria', 'educa-comunicacao'] as $alias) {
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

        // 1. Escola e Turma
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-COM',
            'name' => 'EMEF Monteiro Lobato',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '11223344',
            'sigla' => 'EMEF-ML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'ano' => 2026,
            'status' => 'active',
            'data_inicio' => '2026-02-02',
            'data_fim' => '2026-12-18',
            'total_dias_letivos' => 200,
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-COM',
            'nome' => 'Ensino Fundamental',
            'nivel' => 'fundamental',
            'modalidade' => 'regular',
            'etapa' => 'anos_iniciais',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
            'sequencial' => 5,
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz 5º Ano 2026',
            'ano_vigencia' => 2026,
            'total_horas_anuais' => 880,
            'ativo' => true,
        ]);

        $this->turma = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TURMA-5A',
            'nome' => '5º Ano A',
            'turno' => 'matutino',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 1,
            'tipo_atendimento' => 'regular',
        ]);

        // 2. Aluno, Perfil e Responsável
        $this->pessoaAluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Ana Clara da Silva',
            'cpf' => '12312312345',
            'data_nascimento' => '2015-06-15',
        ]);

        $this->pessoaResponsavel = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Maria de Fátima da Silva',
            'cpf' => '45645645678',
            'data_nascimento' => '1985-09-20',
        ]);

        EducaStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoaAluno->id,
        ]);

        EducaStudentGuardian::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->pessoaAluno->id,
            'responsavel_pessoa_id' => $this->pessoaResponsavel->id,
            'tipo_parentesco' => 'mae',
            'is_responsavel_financeiro' => true,
            'is_responsavel_pedagogico' => true,
        ]);

        $this->matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->pessoaAluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'academic_year_id' => $anoLetivo->id,
            'codigo_matricula' => '2026-000505',
            'data_matricula' => '2026-01-25',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);
    }

    public function test_publicar_comunicado_com_segmentacao_e_confirmar_leitura(): void
    {
        $payload = [
            'titulo' => 'Reunião Bimestral de Pais',
            'conteudo' => 'Convidamos todos os pais e responsáveis para a reunião no dia 15.',
            'urgencia' => 'alta',
            'school_id' => $this->escola->id,
            'data_expiracao' => Carbon::now()->addMonth()->toDateString(),
            'publicos_alvo' => [
                [
                    'tipo_alvo' => 'turma',
                    'target_id' => $this->turma->id,
                ],
            ],
        ];

        // 1. Publica comunicado
        $respPost = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/comunicacao/avisos', $payload, $this->authHeaders);

        $respPost->assertStatus(201)
            ->assertJsonPath('data.titulo', 'Reunião Bimestral de Pais')
            ->assertJsonCount(1, 'data.audiences');

        $avisoId = $respPost->json('data.id');

        // 2. Confirma leitura pelo responsável legal
        $respLeitura = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/comunicacao/avisos/{$avisoId}/leituras", [
                'pessoa_id' => $this->pessoaResponsavel->id,
            ], $this->authHeaders);

        $respLeitura->assertStatus(200);

        // 3. Consulta comunicado e confere contador de leituras
        $respGet = $this->actingAs($this->adminUser)
            ->getJson("/api/educa/comunicacao/avisos/{$avisoId}", $this->authHeaders);

        $respGet->assertStatus(200)
            ->assertJsonPath('data.total_leituras', 1);
    }

    public function test_bloquear_publicacao_de_aviso_sem_publico_alvo(): void
    {
        $payload = [
            'titulo' => 'Aviso Sem Destino',
            'conteudo' => 'Teste sem público-alvo',
            'urgencia' => 'baixa',
            'publicos_alvo' => [],
        ];

        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/comunicacao/avisos', $payload, $this->authHeaders);

        $resp->assertStatus(422);
    }

    public function test_registrar_ocorrencia_disciplinar_e_despachar_acao_com_convocacao_outbox(): void
    {
        // 1. Cadastra ocorrência
        $payloadOcorrencia = [
            'enrollment_id' => $this->matricula->id,
            'tipo' => 'disciplinar',
            'gravidade' => 'alta',
            'relato' => 'Desacato reiterado às normas escolares durante o intervalo.',
            'data_ocorrencia' => Carbon::now()->toDateString(),
        ];

        $respOcorr = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/comunicacao/ocorrencias', $payloadOcorrencia, $this->authHeaders);

        $respOcorr->assertStatus(201)
            ->assertJsonPath('data.tipo', 'disciplinar')
            ->assertJsonPath('data.status', 'aberta');

        $ocorrenciaId = $respOcorr->json('data.id');

        // 2. Adiciona ação exigindo comparecimento dos responsáveis (gatilho de Outbox)
        $respAcao = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/comunicacao/ocorrencias/{$ocorrenciaId}/acoes", [
                'tipo_acao' => 'Convocação de Pais',
                'descricao' => 'Solicitada presença imediata da mãe na coordenação pedagógica.',
                'exige_comparecimento' => true,
            ], $this->authHeaders);

        $respAcao->assertStatus(201)
            ->assertJsonPath('data.exige_comparecimento', true);

        // 3. Verifica se evento foi publicado na tabela outbox_events
        $outboxCount = OutboxEvent::query()
            ->where('event_type', 'educa.comunicacao.convocacao_responsaveis')
            ->where('tenant_id', $this->tenant->id)
            ->count();

        $this->assertGreaterThanOrEqual(1, $outboxCount);

        // 4. Verifica se status da ocorrência transicionou para em_analise
        $ocorrencia = EducaStudentIncident::findOrFail($ocorrenciaId);
        $this->assertSame('em_analise', $ocorrencia->status);
    }

    public function test_bloquear_ocorrencia_para_matricula_inativa(): void
    {
        $this->matricula->update(['status' => EducaEnrollment::STATUS_CANCELADA]);

        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/comunicacao/ocorrencias', [
                'enrollment_id' => $this->matricula->id,
                'tipo' => 'pedagogica',
                'gravidade' => 'media',
                'relato' => 'Dificuldade de acompanhamento.',
                'data_ocorrencia' => Carbon::now()->toDateString(),
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'Ocorrências disciplinares e pedagógicas somente podem ser registradas para estudantes com matrícula ativa.']);
    }

    public function test_registrar_ciencia_formal_do_responsavel_legal(): void
    {
        $ocorrencia = EducaStudentIncident::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'enrollment_id' => $this->matricula->id,
            'aluno_pessoa_id' => $this->pessoaAluno->id,
            'numero_sequencial' => 'OC-2026-999999',
            'tipo' => 'pedagogica',
            'gravidade' => 'media',
            'relato' => 'Não realização das tarefas de casa.',
            'data_ocorrencia' => Carbon::now()->toDateString(),
            'status' => 'aberta',
        ]);

        $resp = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/comunicacao/ocorrencias/{$ocorrencia->id}/ciencia", [
                'responsavel_pessoa_id' => $this->pessoaResponsavel->id,
                'observacao' => 'Mãe compareceu presencialmente e assinou termo de ciência.',
            ], $this->authHeaders);

        $resp->assertStatus(200)
            ->assertJsonPath('data.status', 'cientificada');

        $ocorrencia->refresh();
        $this->assertSame('cientificada', $ocorrencia->status);
        $this->assertSame($this->pessoaResponsavel->id, $ocorrencia->responsavel_ciencia_id);
        $this->assertNotNull($ocorrencia->data_ciencia);
    }

    public function test_disparar_alerta_de_infrequencia_escolar_no_outbox(): void
    {
        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/comunicacao/notificacoes/infrequencia', [
                'enrollment_id' => $this->matricula->id,
                'total_faltas' => 5,
                'canal' => 'todos',
            ], $this->authHeaders);

        $resp->assertStatus(202)
            ->assertJsonPath('message', 'Alerta de infrequência publicado com sucesso no Outbox.');

        $eventId = $resp->json('event_id');
        $this->assertNotNull($eventId);

        $event = OutboxEvent::find($eventId);
        $this->assertNotNull($event);
        $this->assertSame('educa.comunicacao.alerta_infrequencia', $event->event_type);
        $this->assertSame('pending', $event->status);
        $this->assertSame(5, $event->payload['total_faltas']);
    }
}
