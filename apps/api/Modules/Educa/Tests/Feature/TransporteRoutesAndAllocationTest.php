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
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Educa\Models\EducaTransportDriver;
use Modules\Educa\Models\EducaTransportInspection;
use Modules\Educa\Models\EducaTransportRoute;
use Modules\Educa\Models\EducaTransportStop;
use Modules\Educa\Models\EducaTransportStudentAllocation;
use Modules\Educa\Models\EducaTransportVehicle;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class TransporteRoutesAndAllocationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaGrade $serie;
    private Pessoa $pessoaAluno;
    private Pessoa $pessoaMotorista;
    private EducaEnrollment $matricula;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Transporte',
            'slug' => 'pref-teste-transporte',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Habilita módulos necessários
        foreach (['educa', 'educa-secretaria', 'educa-transporte'] as $alias) {
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

        // 1. Escola e Ano Letivo
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-TRANSP',
            'name' => 'EMEF Cecília Meireles',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '99887766',
            'sigla' => 'EMEF-CM',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'rural',
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

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-FUNDAMENTAL',
            'nome' => 'Ensino Fundamental',
            'nivel' => 'fundamental',
            'modalidade' => 'regular',
            'etapa' => 'anos_iniciais',
        ]);

        $this->serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
            'sequencial' => 5,
        ]);

        // 2. Estudante e Matrícula
        $this->pessoaAluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Lucas Pereira dos Santos',
            'cpf' => '11122233344',
            'data_nascimento' => '2015-04-12',
        ]);

        EducaStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoaAluno->id,
            'transporte_escolar_publico' => true,
        ]);

        $this->matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->pessoaAluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $curso->id,
            'grade_id' => $this->serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000101',
            'data_matricula' => '2026-01-20',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);

        // 3. Pessoa Condutor
        $this->pessoaMotorista = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Sebastião Trânsito da Silva',
            'cpf' => '55566677788',
            'data_nascimento' => '1975-08-20',
        ]);
    }

    public function test_cadastrar_rota_com_sucesso_e_ordenar_paradas(): void
    {
        // 1. Cria Rota
        $payloadRota = [
            'codigo' => 'ROTA-RURAL-01',
            'nome' => 'Linha Assentamento - EMEF Cecília',
            'turno' => 'matutino',
            'tipo_rota' => 'rural',
            'quilometragem_estimada' => 35.80,
            'horario_saida' => '06:15',
            'horario_chegada' => '07:30',
        ];

        $respRota = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/rotas', $payloadRota, $this->authHeaders);

        $respRota->assertStatus(201)
            ->assertJsonPath('data.codigo', 'ROTA-RURAL-01');

        $rotaId = $respRota->json('data.id');

        // 2. Adiciona 3 Paradas Sequenciais
        $respP1 = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/transporte/rotas/{$rotaId}/paradas", [
                'nome' => 'Ponto 1 - Entrada do Assentamento',
                'ordem' => 1,
                'horario_estimado' => '06:20',
            ], $this->authHeaders);
        $respP1->assertStatus(201);

        $respP2 = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/transporte/rotas/{$rotaId}/paradas", [
                'nome' => 'Ponto 2 - Ponte do Rio Claro',
                'ordem' => 2,
                'horario_estimado' => '06:45',
            ], $this->authHeaders);
        $respP2->assertStatus(201);

        // 3. Vincula Escola à Rota
        $respEscolas = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/transporte/rotas/{$rotaId}/escolas", [
                'school_ids' => [$this->escola->id],
            ], $this->authHeaders);
        $respEscolas->assertStatus(200);

        // 4. Consulta a Rota
        $respGet = $this->actingAs($this->adminUser)
            ->getJson("/api/educa/transporte/rotas/{$rotaId}", $this->authHeaders);

        $respGet->assertStatus(200)
            ->assertJsonCount(2, 'data.stops')
            ->assertJsonCount(1, 'data.schools');
    }

    public function test_bloquear_rota_com_codigo_duplicado_no_mesmo_tenant(): void
    {
        EducaTransportRoute::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'ROTA-DUPLICADA',
            'nome' => 'Linha Urbana 01',
            'turno' => 'vespertino',
            'tipo_rota' => 'urbana',
            'ativo' => true,
        ]);

        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/rotas', [
                'codigo' => 'ROTA-DUPLICADA',
                'nome' => 'Tentativa de duplicidade',
                'turno' => 'vespertino',
                'tipo_rota' => 'urbana',
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'Já existe uma rota com o código ROTA-DUPLICADA para este município.']);
    }

    public function test_cadastrar_veiculo_e_registrar_vistoria_detran(): void
    {
        $payloadVeiculo = [
            'placa' => 'BRA2E19',
            'marca_modelo' => 'Mercedes-Benz OF-1519 Escolar',
            'ano_fabricacao' => 2022,
            'tipologia' => 'onibus',
            'tipo_propriedade' => 'proprio',
            'capacidade_passageiros' => 44,
        ];

        $respVeiculo = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/veiculos', $payloadVeiculo, $this->authHeaders);

        $respVeiculo->assertStatus(201)
            ->assertJsonPath('data.placa', 'BRA2E19');

        $veiculoId = $respVeiculo->json('data.id');

        // Registra Laudo DETRAN Aprovado com validade de 6 meses
        $respVistoria = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/transporte/veiculos/{$veiculoId}/vistorias", [
                'numero_laudo' => 'LAUDO-DETRAN-2026-001',
                'orgao_emissor' => 'DETRAN/SP',
                'data_vistoria' => Carbon::now()->subDays(10)->toDateString(),
                'data_validade' => Carbon::now()->addDays(170)->toDateString(),
                'resultado' => 'aprovado',
            ], $this->authHeaders);

        $respVistoria->assertStatus(201);

        $veiculo = EducaTransportVehicle::findOrFail($veiculoId);
        $this->assertTrue($veiculo->temVistoriaValida());
        $this->assertSame(44, $veiculo->assentosDisponiveis());
    }

    public function test_bloquear_credenciamento_de_motorista_sem_cnh_categoria_d_ou_e(): void
    {
        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/condutores', [
                'pessoa_id' => $this->pessoaMotorista->id,
                'tipo_funcao' => 'motorista',
                'cnh_numero' => '12345678900',
                'cnh_categoria' => 'B', // Categoria incompatível com transporte coletivo
                'cnh_validade' => Carbon::now()->addYear()->toDateString(),
                'curso_transporte_escolar' => true,
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'Motoristas de transporte escolar exigem CNH categoria D ou E, conforme o Código de Trânsito Brasileiro.']);
    }

    public function test_bloquear_credenciamento_de_motorista_com_cnh_vencida(): void
    {
        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/condutores', [
                'pessoa_id' => $this->pessoaMotorista->id,
                'tipo_funcao' => 'motorista',
                'cnh_numero' => '98765432100',
                'cnh_categoria' => 'D',
                'cnh_validade' => Carbon::now()->subDays(5)->toDateString(), // Vencida
                'curso_transporte_escolar' => true,
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'Não é permitido cadastrar condutor com CNH vencida.']);
    }

    public function test_credenciar_motorista_com_sucesso(): void
    {
        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/condutores', [
                'pessoa_id' => $this->pessoaMotorista->id,
                'tipo_funcao' => 'motorista',
                'cnh_numero' => '11223344556',
                'cnh_categoria' => 'D',
                'cnh_validade' => Carbon::now()->addYears(3)->toDateString(),
                'curso_transporte_escolar' => true,
                'validade_curso' => Carbon::now()->addYears(2)->toDateString(),
            ], $this->authHeaders);

        $resp->assertStatus(201)
            ->assertJsonPath('data.tipo_funcao', 'motorista');
    }

    public function test_bloquear_alocacao_em_veiculo_sem_vistoria_valida_do_detran(): void
    {
        $rota = EducaTransportRoute::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'ROTA-VISTORIA-01',
            'nome' => 'Linha Sem Vistoria',
            'turno' => 'matutino',
            'tipo_rota' => 'urbana',
            'ativo' => true,
        ]);

        $parada = EducaTransportStop::create([
            'tenant_id' => $this->tenant->id,
            'route_id' => $rota->id,
            'ordem' => 1,
            'nome' => 'Parada Teste',
        ]);

        $veiculo = EducaTransportVehicle::create([
            'tenant_id' => $this->tenant->id,
            'placa' => 'VNC9999',
            'marca_modelo' => 'Van Escolar',
            'ano_fabricacao' => 2020,
            'tipologia' => 'van',
            'tipo_propriedade' => 'proprio',
            'capacidade_passageiros' => 15,
            'ocupacao_efetiva' => 0,
            'status' => 'regular',
        ]);

        // Cria laudo vencido há 30 dias
        EducaTransportInspection::create([
            'tenant_id' => $this->tenant->id,
            'vehicle_id' => $veiculo->id,
            'numero_laudo' => 'LAUDO-ANTIGO',
            'orgao_emissor' => 'DETRAN',
            'data_vistoria' => Carbon::now()->subMonths(8)->toDateString(),
            'data_validade' => Carbon::now()->subMonths(2)->toDateString(),
            'resultado' => 'aprovado',
        ]);

        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/alocacoes', [
                'route_id' => $rota->id,
                'vehicle_id' => $veiculo->id,
                'stop_id' => $parada->id,
                'enrollment_id' => $this->matricula->id,
                'data_inicio' => Carbon::now()->toDateString(),
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'O veículo VNC9999 não possui laudo de vistoria semestral válido do DETRAN.']);
    }

    public function test_bloquear_alocacao_quando_atingir_capacidade_maxima_de_assentos(): void
    {
        $rota = EducaTransportRoute::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'ROTA-LOTADA',
            'nome' => 'Linha Capacidade Esgotada',
            'turno' => 'matutino',
            'tipo_rota' => 'urbana',
            'ativo' => true,
        ]);

        $parada = EducaTransportStop::create([
            'tenant_id' => $this->tenant->id,
            'route_id' => $rota->id,
            'ordem' => 1,
            'nome' => 'Parada Única',
        ]);

        $veiculo = EducaTransportVehicle::create([
            'tenant_id' => $this->tenant->id,
            'placa' => 'LOT1000',
            'marca_modelo' => 'Micro-ônibus Escolar',
            'ano_fabricacao' => 2021,
            'tipologia' => 'microonibus',
            'tipo_propriedade' => 'proprio',
            'capacidade_passageiros' => 1, // Capacidade de apenas 1 assento
            'ocupacao_efetiva' => 1,       // Já totalmente ocupado
            'status' => 'regular',
        ]);

        EducaTransportInspection::create([
            'tenant_id' => $this->tenant->id,
            'vehicle_id' => $veiculo->id,
            'numero_laudo' => 'LAUDO-LOT-OK',
            'orgao_emissor' => 'DETRAN',
            'data_vistoria' => Carbon::now()->subDays(10)->toDateString(),
            'data_validade' => Carbon::now()->addMonths(5)->toDateString(),
            'resultado' => 'aprovado',
        ]);

        $resp = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/alocacoes', [
                'route_id' => $rota->id,
                'vehicle_id' => $veiculo->id,
                'stop_id' => $parada->id,
                'enrollment_id' => $this->matricula->id,
                'data_inicio' => Carbon::now()->toDateString(),
            ], $this->authHeaders);

        $resp->assertStatus(422)
            ->assertJsonFragment(['message' => 'A capacidade máxima do veículo (1 assentos) já foi atingida.']);
    }

    public function test_alocar_estudante_com_sucesso_e_encerrar_liberando_vaga(): void
    {
        $rota = EducaTransportRoute::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'ROTA-NORMAL',
            'nome' => 'Linha Normal Bairro-Escola',
            'turno' => 'matutino',
            'tipo_rota' => 'urbana',
            'ativo' => true,
        ]);

        $parada = EducaTransportStop::create([
            'tenant_id' => $this->tenant->id,
            'route_id' => $rota->id,
            'ordem' => 1,
            'nome' => 'Parada Perto de Casa',
        ]);

        $veiculo = EducaTransportVehicle::create([
            'tenant_id' => $this->tenant->id,
            'placa' => 'NOR2026',
            'marca_modelo' => 'Ônibus Amarelinho',
            'ano_fabricacao' => 2023,
            'tipologia' => 'onibus',
            'tipo_propriedade' => 'proprio',
            'capacidade_passageiros' => 30,
            'ocupacao_efetiva' => 0,
            'status' => 'regular',
        ]);

        EducaTransportInspection::create([
            'tenant_id' => $this->tenant->id,
            'vehicle_id' => $veiculo->id,
            'numero_laudo' => 'LAUDO-NOR-OK',
            'orgao_emissor' => 'DETRAN',
            'data_vistoria' => Carbon::now()->subDays(5)->toDateString(),
            'data_validade' => Carbon::now()->addMonths(5)->toDateString(),
            'resultado' => 'aprovado',
        ]);

        // 1. Aloca Estudante
        $respAloca = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/alocacoes', [
                'route_id' => $rota->id,
                'vehicle_id' => $veiculo->id,
                'stop_id' => $parada->id,
                'enrollment_id' => $this->matricula->id,
                'data_inicio' => Carbon::now()->toDateString(),
            ], $this->authHeaders);

        $respAloca->assertStatus(201)
            ->assertJsonPath('data.status', 'ativa');

        $alocacaoId = $respAloca->json('data.id');

        // Confere ocupação incrementada
        $veiculo->refresh();
        $this->assertSame(1, $veiculo->ocupacao_efetiva);

        // 2. Trava de Duplicidade: tenta alocar o mesmo aluno na mesma rota
        $respDup = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/transporte/alocacoes', [
                'route_id' => $rota->id,
                'vehicle_id' => $veiculo->id,
                'stop_id' => $parada->id,
                'enrollment_id' => $this->matricula->id,
                'data_inicio' => Carbon::now()->toDateString(),
            ], $this->authHeaders);

        $respDup->assertStatus(422)
            ->assertJsonFragment(['message' => 'O estudante já possui uma alocação ativa nesta rota.']);

        // 3. Encerra Alocação
        $respEncerrar = $this->actingAs($this->adminUser)
            ->postJson("/api/educa/transporte/alocacoes/{$alocacaoId}/encerrar", [], $this->authHeaders);

        $respEncerrar->assertStatus(200)
            ->assertJsonPath('data.status', 'encerrada');

        // Confere assento liberado
        $veiculo->refresh();
        $this->assertSame(0, $veiculo->ocupacao_efetiva);
    }
}
