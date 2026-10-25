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
use Modules\Educa\Database\Seeders\EducaMotivosPadraoSeeder;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCalendarDayReason;
use Modules\Educa\Models\EducaStageType;
use Tests\TestCase;

final class CoreApiHttpTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private User $unprivilegedUser;
    private array $authHeaders;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste',
            'slug' => 'pref-teste',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Garante que o módulo educa está habilitado para o tenant
        $modulo = Module::firstOrCreate(
            ['alias' => 'educa'],
            ['name' => 'Educação', 'description' => 'SYS-Educa', 'enabled' => true]
        );
        $modulo->tenants()->syncWithoutDetaching([
            $this->tenant->id => ['enabled' => true],
        ]);

        // Usuário com permissão total via platform_admin
        $this->adminUser = User::factory()->create([
            'is_platform_admin' => true,
        ]);
        $this->tenant->users()->attach($this->adminUser->id, [
            'status' => 'active',
            'is_primary' => true,
        ]);

        // Usuário sem permissões
        $this->unprivilegedUser = User::factory()->create([
            'is_platform_admin' => false,
        ]);
        $this->tenant->users()->attach($this->unprivilegedUser->id, [
            'status' => 'active',
            'is_primary' => true,
        ]);

        $this->authHeaders = [
            'X-Tenant-Slug' => $this->tenant->slug,
            'Accept' => 'application/json',
        ];
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_nao_autenticado_retorna_401(): void
    {
        $response = $this->getJson('/api/educa/core/anos-letivos', [
            'X-Tenant-Slug' => $this->tenant->slug,
        ]);

        $response->assertStatus(401);
    }

    public function test_usuario_sem_permissao_retorna_403(): void
    {
        Sanctum::actingAs($this->unprivilegedUser);

        $response = $this->getJson('/api/educa/core/anos-letivos', $this->authHeaders);

        $response->assertStatus(403);
    }

    public function test_crud_anos_letivos_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. POST /anos-letivos (criação)
        $schoolId = (string) Str::uuid();
        $createResponse = $this->postJson('/api/educa/core/anos-letivos', [
            'ano' => 2026,
            'school_id' => $schoolId,
            'observacoes' => 'Ano de teste',
        ], $this->authHeaders);

        $createResponse->assertStatus(201);
        $createResponse->assertJsonPath('data.ano', 2026);
        $createResponse->assertJsonPath('data.status', 'planning');
        $anoId = $createResponse->json('data.id');

        // 2. GET /anos-letivos (listagem)
        $listResponse = $this->getJson('/api/educa/core/anos-letivos?ano=2026', $this->authHeaders);
        $listResponse->assertStatus(200);
        $listResponse->assertJsonFragment(['id' => $anoId]);

        // 3. GET /anos-letivos/{id} (detalhe)
        $showResponse = $this->getJson("/api/educa/core/anos-letivos/{$anoId}", $this->authHeaders);
        $showResponse->assertStatus(200);
        $showResponse->assertJsonPath('data.id', $anoId);

        // 4. PUT /anos-letivos/{id} (atualização)
        $updateResponse = $this->putJson("/api/educa/core/anos-letivos/{$anoId}", [
            'observacoes' => 'Atualizado via API',
        ], $this->authHeaders);

        $updateResponse->assertStatus(200);
        $updateResponse->assertJsonPath('data.observacoes', 'Atualizado via API');

        // 5. DELETE /anos-letivos/{id} (remover em planning)
        $deleteResponse = $this->deleteJson("/api/educa/core/anos-letivos/{$anoId}", [], $this->authHeaders);
        $deleteResponse->assertStatus(204);

        // Verifica soft delete
        $this->assertSoftDeleted('educa_academic_years', ['id' => $anoId]);
    }

    public function test_duplicidade_ano_letivo_retorna_409(): void
    {
        Sanctum::actingAs($this->adminUser);

        $schoolId = (string) Str::uuid();

        $this->postJson('/api/educa/core/anos-letivos', [
            'ano' => 2026,
            'school_id' => $schoolId,
        ], $this->authHeaders)->assertStatus(201);

        $segundaTentativa = $this->postJson('/api/educa/core/anos-letivos', [
            'ano' => 2026,
            'school_id' => $schoolId,
        ], $this->authHeaders);

        $segundaTentativa->assertStatus(409);
        $segundaTentativa->assertJsonPath('code', 'DUPLICATE_ACADEMIC_YEAR');
    }

    public function test_transicao_ano_letivo_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        $ano = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => (string) Str::uuid(),
            'ano' => 2026,
            'status' => 'planning',
            'is_immutable' => false,
        ]);

        $tipoBimestre = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'BIMESTRAL',
            'nome' => 'Bimestral',
            'num_etapas' => 4,
        ]);

        // Configura etapas
        $this->putJson("/api/educa/core/anos-letivos/{$ano->id}/etapas", [
            'tipo_etapa_id' => $tipoBimestre->id,
            'etapas' => [
                ['sequencial' => 1, 'nome' => '1º Bimestre', 'data_inicio' => '2026-02-02', 'data_fim' => '2026-04-17'],
                ['sequencial' => 2, 'nome' => '2º Bimestre', 'data_inicio' => '2026-04-20', 'data_fim' => '2026-06-30'],
                ['sequencial' => 3, 'nome' => '3º Bimestre', 'data_inicio' => '2026-08-03', 'data_fim' => '2026-09-30'],
                ['sequencial' => 4, 'nome' => '4º Bimestre', 'data_inicio' => '2026-10-01', 'data_fim' => '2026-12-18'],
            ],
        ], $this->authHeaders)->assertStatus(200);

        // Transição: start
        $transResponse = $this->postJson("/api/educa/core/anos-letivos/{$ano->id}/transicoes", [
            'evento' => 'start',
        ], $this->authHeaders);

        $transResponse->assertStatus(200);
        $transResponse->assertJsonPath('data.status', 'active');

        // Transição: freeze (exige motivo)
        $freezeResponse = $this->postJson("/api/educa/core/anos-letivos/{$ano->id}/transicoes", [
            'evento' => 'freeze',
            'motivo' => 'Greve municipal dos servidores da educação',
        ], $this->authHeaders);

        $freezeResponse->assertStatus(200);
        $freezeResponse->assertJsonPath('data.status', 'frozen');

        // Transição: resume
        $resumeResponse = $this->postJson("/api/educa/core/anos-letivos/{$ano->id}/transicoes", [
            'evento' => 'resume',
        ], $this->authHeaders);

        $resumeResponse->assertStatus(200);
        $resumeResponse->assertJsonPath('data.status', 'active');
    }

    public function test_operacao_em_lote_anos_letivos_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        $schoolA = (string) Str::uuid();
        $schoolB = (string) Str::uuid();

        $response = $this->postJson('/api/educa/core/anos-letivos/lote', [
            'acao' => 'create',
            'ano' => 2027,
            'school_ids' => [$schoolA, $schoolB],
        ], $this->authHeaders);

        $response->assertStatus(200);
        $response->assertJsonPath('data.acao', 'create');
        $response->assertJsonPath('data.processados', 2);
    }

    public function test_substituir_e_listar_etapas_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        $ano = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => (string) Str::uuid(),
            'ano' => 2026,
            'status' => 'planning',
            'is_immutable' => false,
        ]);

        $tipoTrimestre = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'TRIMESTRAL',
            'nome' => 'Trimestral',
            'num_etapas' => 3,
        ]);

        $replaceResponse = $this->putJson("/api/educa/core/anos-letivos/{$ano->id}/etapas", [
            'tipo_etapa_id' => $tipoTrimestre->id,
            'etapas' => [
                ['sequencial' => 1, 'nome' => '1º Trimestre', 'data_inicio' => '2026-02-02', 'data_fim' => '2026-05-15'],
                ['sequencial' => 2, 'nome' => '2º Trimestre', 'data_inicio' => '2026-05-18', 'data_fim' => '2026-08-31'],
                ['sequencial' => 3, 'nome' => '3º Trimestre', 'data_inicio' => '2026-09-01', 'data_fim' => '2026-12-18'],
            ],
        ], $this->authHeaders);

        $replaceResponse->assertStatus(200);
        $replaceResponse->assertJsonCount(3, 'data');

        $listResponse = $this->getJson("/api/educa/core/anos-letivos/{$ano->id}/etapas", $this->authHeaders);
        $listResponse->assertStatus(200);
        $listResponse->assertJsonCount(3, 'data');
    }

    public function test_obter_conformidade_ldb_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        $ano = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => (string) Str::uuid(),
            'ano' => 2026,
            'status' => 'planning',
            'is_immutable' => false,
        ]);

        $response = $this->getJson("/api/educa/core/anos-letivos/{$ano->id}/conformidade-ldb", $this->authHeaders);

        $response->assertStatus(200);
        $response->assertJsonPath('dias_letivos_minimo', 200);
        $response->assertJsonPath('horas_minimo', 800);
        $response->assertJsonStructure([
            'dias_letivos_minimo',
            'horas_minimo',
            'dias_letivos_planejados',
            'horas_planejadas',
            'conforme_planejamento',
            'sugestoes',
        ]);
    }

    public function test_crud_calendarios_e_upsert_dias_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Criar calendário da rede (school_id = null)
        $createResponse = $this->postJson('/api/educa/core/calendarios', [
            'ano' => 2026,
            'school_id' => null,
            'nome' => 'Calendário Padrão da Rede 2026',
            'carga_horaria_diaria_minutos' => 240,
        ], $this->authHeaders);

        $createResponse->assertStatus(201);
        $calendarioId = $createResponse->json('data.id');

        // 2. Upsert de dias no calendário
        $diasResponse = $this->putJson("/api/educa/core/calendarios/{$calendarioId}/dias", [
            'dias' => [
                ['data' => '2026-02-02', 'descricao' => 'Início das aulas'],
                ['data' => '2026-02-03', 'descricao' => 'Aula regular'],
                ['data' => '2026-02-04', 'descricao' => 'Aula regular'],
            ],
        ], $this->authHeaders);

        $diasResponse->assertStatus(200);
        $diasResponse->assertJsonPath('totais.total_school_days', 3);
        self::assertEquals(12.0, (float) $diasResponse->json('totais.total_school_hours'));

        // 3. Listar dias filtrados
        $listDiasResponse = $this->getJson("/api/educa/core/calendarios/{$calendarioId}/dias?apenas_letivos=1", $this->authHeaders);
        $listDiasResponse->assertStatus(200);
        $listDiasResponse->assertJsonCount(3, 'data');
    }

    public function test_publicar_calendario_bloqueado_sem_ldb_retorna_422_com_diagnostico(): void
    {
        Sanctum::actingAs($this->adminUser);

        $calendar = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'ano' => 2026,
            'nome' => 'Calendário Incompleto 2026',
            'status' => 'draft',
            'carga_horaria_diaria_minutos' => 240,
            'total_school_days' => 50,
            'total_school_hours' => 200.0,
        ]);

        $response = $this->postJson("/api/educa/core/calendarios/{$calendar->id}/publicar", [], $this->authHeaders);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'LDB_MINIMUM_NOT_MET');
        $response->assertJsonStructure([
            'message',
            'code',
            'diagnostico' => [
                'atende_ldb',
                'faltam_dias',
                'faltam_horas',
                'sugestoes',
            ],
        ]);
    }

    public function test_publicar_calendario_com_ldb_sucesso(): void
    {
        Sanctum::actingAs($this->adminUser);

        $calendar = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'ano' => 2026,
            'nome' => 'Calendário Aprovado 2026',
            'status' => 'draft',
            'carga_horaria_diaria_minutos' => 240,
        ]);

        // Simula 200 dias úteis de 4h
        $diasInput = [];
        $data = Carbon::parse('2026-02-02');
        for ($i = 0; $i < 200; $i++) {
            $diasInput[] = ['data' => $data->toDateString(), 'carga_horaria_minutos' => 240];
            $data->addWeekday();
        }

        $this->putJson("/api/educa/core/calendarios/{$calendar->id}/dias", [
            'dias' => $diasInput,
        ], $this->authHeaders)->assertStatus(200);

        $publishResponse = $this->postJson("/api/educa/core/calendarios/{$calendar->id}/publicar", [], $this->authHeaders);

        $publishResponse->assertStatus(200);
        $publishResponse->assertJsonPath('data.status', 'published');
        $this->assertNotNull($publishResponse->json('data.published_at'));
    }

    public function test_importar_calendario_da_rede_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        $schoolId = (string) Str::uuid();

        // Cria ano letivo para a escola com etapas (pré-requisito)
        $ano = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $schoolId,
            'ano' => 2026,
            'status' => 'planning',
            'is_immutable' => false,
        ]);
        $tipo = EducaStageType::create(['tenant_id' => $this->tenant->id, 'codigo' => 'SEMESTRAL', 'nome' => 'Semestral', 'num_etapas' => 2]);
        $ano->etapas()->createMany([
            ['tenant_id' => $this->tenant->id, 'tipo_etapa_id' => $tipo->id, 'sequencial' => 1, 'nome' => '1º Sem', 'data_inicio' => '2026-02-02', 'data_fim' => '2026-06-30'],
            ['tenant_id' => $this->tenant->id, 'tipo_etapa_id' => $tipo->id, 'sequencial' => 2, 'nome' => '2º Sem', 'data_inicio' => '2026-08-01', 'data_fim' => '2026-12-18'],
        ]);

        // Calendário da rede
        $rede = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'ano' => 2026,
            'nome' => 'Rede 2026',
            'status' => 'draft',
            'carga_horaria_diaria_minutos' => 240,
        ]);
        $this->putJson("/api/educa/core/calendarios/{$rede->id}/dias", [
            'dias' => [
                ['data' => '2026-02-02', 'descricao' => 'Início da Rede'],
                ['data' => '2026-02-03', 'descricao' => 'Aula Rede'],
            ],
        ], $this->authHeaders);

        // Calendário da escola
        $escolaCal = EducaAcademicCalendar::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $schoolId,
            'ano' => 2026,
            'nome' => 'Escola Cal 2026',
            'status' => 'draft',
            'carga_horaria_diaria_minutos' => 240,
        ]);

        // Importar da rede
        $importResponse = $this->postJson("/api/educa/core/calendarios/{$escolaCal->id}/importar-rede", [
            'calendario_rede_id' => $rede->id,
            'substituir_existentes' => true,
        ], $this->authHeaders);

        $importResponse->assertStatus(200);
        $importResponse->assertJsonPath('data.total_school_days', 2);
    }

    public function test_crud_motivos_dia_via_api(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Criar motivo
        $createResponse = $this->postJson('/api/educa/core/motivos-dia', [
            'codigo' => 'CONSELHO_CLASSE',
            'nome' => 'Conselho de Classe Participativo',
            'tipo' => 'pedagogical_planning',
            'is_school_day' => false,
            'color_hex' => '#8B5CF6',
        ], $this->authHeaders);

        $createResponse->assertStatus(201);
        $motivoId = $createResponse->json('id');

        // 2. Listar motivos
        $listResponse = $this->getJson('/api/educa/core/motivos-dia', $this->authHeaders);
        $listResponse->assertStatus(200);
        $listResponse->assertJsonFragment(['codigo' => 'CONSELHO_CLASSE']);

        // 3. Atualizar motivo
        $updateResponse = $this->putJson("/api/educa/core/motivos-dia/{$motivoId}", [
            'codigo' => 'CONSELHO_CLASSE',
            'nome' => 'Conselho de Classe e Formação Docente',
            'tipo' => 'pedagogical_planning',
            'is_school_day' => false,
            'color_hex' => '#7C3AED',
        ], $this->authHeaders);

        $updateResponse->assertStatus(200);
        $updateResponse->assertJsonPath('nome', 'Conselho de Classe e Formação Docente');
    }
}
