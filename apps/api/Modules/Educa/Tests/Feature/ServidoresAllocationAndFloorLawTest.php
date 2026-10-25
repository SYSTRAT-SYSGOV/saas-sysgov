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
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaSchool;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class ServidoresAllocationAndFloorLawTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private Pessoa $pessoa;

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

        // 1. Estrutura Escolar e Ano Letivo
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-ML',
            'name' => 'EMEF Monteiro Lobato',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '12345678',
            'sigla' => 'EMEF-ML',
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

        // 2. Pessoa prévia cadastrada no MDM
        $this->pessoa = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'F',
            'nome' => 'Carlos Eduardo dos Santos',
            'documento_hash' => hash('sha256', '12345678900'),
            'ativo' => true,
        ]);
    }

    public function test_cadastrar_servidor_com_pessoa_existente(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
            'escolaridade' => 'superior_completo',
            'codigo_inep_docente' => '123456789012',
            'funcoes' => [
                [
                    'nome_funcao' => 'Professor de Educação Básica',
                    'matricula' => 'MAT-2026-001',
                    'is_docente' => true,
                ],
            ],
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/servidores/servidores', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('data.pessoa_id', $this->pessoa->id)
            ->assertJsonPath('data.codigo_inep_docente', '123456789012');
        $this->assertEquals(40.0, (float) $res->json('data.carga_horaria_semanal'));

        $this->assertDatabaseHas('educa_employees', [
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'codigo_inep_docente' => '123456789012',
        ]);

        $this->assertDatabaseHas('educa_employee_roles', [
            'tenant_id' => $this->tenant->id,
            'matricula' => 'MAT-2026-001',
            'nome_funcao' => 'Professor de Educação Básica',
        ]);
    }

    public function test_bloquear_cadastro_duplicado_para_mesma_pessoa(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Primeiro cadastro
        EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $res = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/servidores/servidores', [
                'pessoa_id' => $this->pessoa->id,
                'carga_horaria_semanal' => 20.0,
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['pessoa_id']);
    }

    public function test_atribuir_multiplas_funcoes_com_matriculas_distintas(): void
    {
        Sanctum::actingAs($this->adminUser);

        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $res1 = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/servidores/servidores/{$servidor->id}/funcoes", [
                'nome_funcao' => 'Professor de Matemática',
                'matricula' => 'MAT-PROF-01',
                'is_docente' => true,
            ]);

        $res1->assertStatus(201);

        $res2 = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/servidores/servidores/{$servidor->id}/funcoes", [
                'nome_funcao' => 'Coordenador Pedagógico',
                'matricula' => 'MAT-COORD-01',
                'is_docente' => false,
            ]);

        $res2->assertStatus(201);

        $this->assertCount(2, $servidor->fresh()->funcoes);
    }

    public function test_alocar_professor_respeitando_lei_do_piso_um_terco(): void
    {
        Sanctum::actingAs($this->adminUser);

        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $servidor->funcoes()->create([
            'tenant_id' => $this->tenant->id,
            'nome_funcao' => 'Professor',
            'matricula' => 'MAT-001',
            'is_docente' => true,
        ]);

        // Jornada de 30h com 20h regência e 10h atividade (10 >= 30/3 = 10.0) -> APROVADO
        $payload = [
            'employee_id' => $servidor->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'manha',
            'dia_semana' => 2,
            'horas_regencia' => 20.0,
            'horas_atividade' => 10.0,
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/servidores/alocacoes', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('data.status', 'ativa');

        $this->assertEquals(20.0, (float) $res->json('data.horas_regencia'));
        $this->assertEquals(10.0, (float) $res->json('data.horas_atividade'));

        $this->assertDatabaseHas('educa_employee_allocations', [
            'tenant_id' => $this->tenant->id,
            'employee_id' => $servidor->id,
            'status' => 'ativa',
        ]);
    }

    public function test_bloquear_alocacao_que_viola_lei_do_piso(): void
    {
        Sanctum::actingAs($this->adminUser);

        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $servidor->funcoes()->create([
            'tenant_id' => $this->tenant->id,
            'nome_funcao' => 'Professor',
            'matricula' => 'MAT-001',
            'is_docente' => true,
        ]);

        // Jornada de 30h com 25h regência e 5h atividade (5 < 30/3 = 10.0) -> BLOQUEADO
        $payload = [
            'employee_id' => $servidor->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'manha',
            'dia_semana' => 2,
            'horas_regencia' => 25.0,
            'horas_atividade' => 5.0,
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/servidores/alocacoes', $payload);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['horas_atividade']);
    }

    public function test_bloquear_alocacao_que_extrapola_carga_horaria_contratual(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Servidor com contrato de 40.0h semanais
        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $servidor->funcoes()->create([
            'tenant_id' => $this->tenant->id,
            'nome_funcao' => 'Professor',
            'matricula' => 'MAT-001',
            'is_docente' => true,
        ]);

        // Aloca 30h (20h regência + 10h atividade) -> OK
        EducaEmployeeAllocation::create([
            'tenant_id' => $this->tenant->id,
            'employee_id' => $servidor->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'manha',
            'horas_regencia' => 20.0,
            'horas_atividade' => 10.0,
            'status' => 'ativa',
        ]);

        // Tenta alocar mais 15h (totalizaria 45h > 40h) -> REJEITADO
        $payload = [
            'employee_id' => $servidor->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'tarde',
            'horas_regencia' => 10.0,
            'horas_atividade' => 5.0,
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson('/api/educa/servidores/alocacoes', $payload);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['carga_horaria']);
    }

    public function test_afastamento_suspende_alocacoes_ativas(): void
    {
        Sanctum::actingAs($this->adminUser);

        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $alocacao = EducaEmployeeAllocation::create([
            'tenant_id' => $this->tenant->id,
            'employee_id' => $servidor->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'manha',
            'horas_regencia' => 20.0,
            'horas_atividade' => 10.0,
            'status' => 'ativa',
        ]);

        $payload = [
            'tipo_afastamento' => 'licenca_medica',
            'data_inicio' => '2026-05-01',
            'data_fim' => '2026-05-31',
            'motivo' => 'Tratamento cirúrgico ortopédico',
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/servidores/servidores/{$servidor->id}/afastamentos", $payload);

        $res->assertStatus(201)
            ->assertJsonPath('data.tipo_afastamento', 'licenca_medica');

        // A alocação anterior deve ter seu status alterado para suspensa
        $this->assertEquals('suspensa', $alocacao->fresh()->status);
    }

    public function test_registrar_falta_funcional_com_justificativa(): void
    {
        Sanctum::actingAs($this->adminUser);

        $servidor = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoa->id,
            'carga_horaria_semanal' => 40.0,
        ]);

        $payload = [
            'school_id' => $this->escola->id,
            'data_falta' => '2026-04-15',
            'tipo' => 'falta',
            'minutos' => 240,
            'justificada' => true,
            'motivo_justificativa' => 'Atestado médico para consulta médica',
        ];

        $res = $this->withHeaders($this->authHeaders)
            ->postJson("/api/educa/servidores/servidores/{$servidor->id}/faltas", $payload);

        $res->assertStatus(201)
            ->assertJsonPath('data.justificada', true)
            ->assertJsonPath('data.minutos', 240);

        $this->assertDatabaseHas('educa_employee_absences', [
            'tenant_id' => $this->tenant->id,
            'employee_id' => $servidor->id,
            'justificada' => true,
        ]);
    }
}
