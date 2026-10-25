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
use Modules\Educa\Models\EducaMenu;
use Modules\Educa\Models\EducaMealLog;
use Modules\Educa\Models\EducaSchool;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class AlimentacaoEscolarAndPnaeTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private Pessoa $aluno;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste PNAE',
            'slug' => 'pref-teste-pnae',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Habilita módulos necessários
        foreach (['educa', 'educa-secretaria', 'educa-merenda'] as $alias) {
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
            'code' => 'EMEF-PNAE',
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
            'codigo' => 'EF-FUND',
            'nome' => 'Ensino Fundamental',
            'nivel' => 'fundamental',
            'modalidade' => 'regular',
            'etapa' => 'anos_iniciais',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'codigo' => '4ANO',
            'nome' => '4º Ano',
            'sequencial' => 4,
        ]);

        $this->aluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Gabriel Santana Alergico',
            'tipo' => 'PF',
            'data_nascimento' => '2016-04-12',
            'status' => 'ativo',
        ]);

        EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'aluno_pessoa_id' => $this->aluno->id,
            'codigo_matricula' => '2026-EF-0089',
            'data_matricula' => '2026-01-15',
            'tipo_matricula' => 'inicial',
            'status' => EducaEnrollment::STATUS_ATIVA,
        ]);
    }

    public function test_elaboracao_e_calculo_nutricional_de_cardapio_pnae(): void
    {
        $payload = [
            'nome' => 'Cardápio Fundamental I - Semana 1',
            'descricao' => 'Cardápio balanceado conforme diretrizes FNDE',
            'etapa_ensino' => 'fundamental',
            'tipo_refeicao' => 'almoco',
            'periodo' => 'semanal',
            'vigencia_inicio' => '2026-11-02',
            'vigencia_fim' => '2026-11-06',
            'itens' => [
                [
                    'dia_semana' => 2,
                    'nome_preparacao' => 'Arroz com feijão, frango grelhado e salada crua',
                    'porcao_gramas' => 350,
                    'calorias_kcal' => 500,
                    'carboidratos_g' => 75,
                    'proteinas_g' => 16,
                    'lipidios_g' => 15,
                    'fibras_g' => 7,
                    'sodio_mg' => 380,
                    'alergenos' => [],
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/merenda/cardapios', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.nome', 'Cardápio Fundamental I - Semana 1')
            ->assertJsonPath('data.status', 'rascunho');

        $menuId = $response->json('data.id');

        // Consulta conformidade PNAE
        $confResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/merenda/cardapios/{$menuId}/conformidade");

        $confResponse->assertStatus(200)
            ->assertJsonPath('data.conforme', true)
            ->assertJsonPath('data.totais.calorias_totais', 500);
    }

    public function test_bloqueio_de_homologacao_sem_crn_valido(): void
    {
        $menu = EducaMenu::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Cardápio Sem Homologar',
            'etapa_ensino' => 'infantil',
            'tipo_refeicao' => 'lanche_manha',
            'periodo' => 'semanal',
            'vigencia_inicio' => '2026-11-09',
            'vigencia_fim' => '2026-11-13',
            'status' => 'rascunho',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/merenda/cardapios/{$menu->id}/homologar", [
                'responsavel_tecnico_nome' => '',
                'responsavel_tecnico_crn' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['responsavel_tecnico_nome', 'responsavel_tecnico_crn']);
    }

    public function test_homologacao_com_crn_e_trava_de_edicao(): void
    {
        $menu = EducaMenu::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Cardápio para Homologação',
            'etapa_ensino' => 'fundamental',
            'tipo_refeicao' => 'almoco',
            'periodo' => 'semanal',
            'vigencia_inicio' => '2026-11-16',
            'vigencia_fim' => '2026-11-20',
            'status' => 'rascunho',
            'created_by' => $this->adminUser->id,
        ]);

        $menu->items()->create([
            'tenant_id' => $this->tenant->id,
            'dia_semana' => 2,
            'nome_preparacao' => 'Arroz, lentilha e peito de frango assado',
            'porcao_gramas' => 320,
            'calorias_kcal' => 490,
            'carboidratos_g' => 70,
            'proteinas_g' => 24,
            'lipidios_g' => 10,
        ]);

        $homologarResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/merenda/cardapios/{$menu->id}/homologar", [
                'responsavel_tecnico_nome' => 'Dra. Mariana S. Alencar',
                'responsavel_tecnico_crn' => 'CRN-3/49201',
            ]);

        $homologarResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'homologado')
            ->assertJsonPath('data.responsavel_tecnico_crn', 'CRN-3/49201');

        // Tentar adicionar item após homologado deve falhar (trava técnica)
        $addItemResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson("/api/educa/merenda/cardapios/{$menu->id}/itens", [
                'dia_semana' => 3,
                'nome_preparacao' => 'Sobremesa doce',
                'porcao_gramas' => 80,
                'calorias_kcal' => 150,
                'carboidratos_g' => 35,
                'proteinas_g' => 1,
                'lipidios_g' => 1,
            ]);

        $addItemResponse->assertStatus(422)
            ->assertJsonPath('message', 'Não é permitido adicionar preparações a um cardápio já homologado.');
    }

    public function test_cadastro_de_restricao_alimentar_grave_com_crm(): void
    {
        // 1. Tentar cadastrar anafilaxia grave sem CRM do médico deve falhar
        $semCrmResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/merenda/restricoes', [
                'pessoa_id' => $this->aluno->id,
                'tipo_restricao' => 'alergia_alimentar',
                'alimento_alergeno' => 'Amendoim e derivados',
                'severidade' => 'grave_anafilaxia',
                'requer_substituicao_especial' => true,
                'laudo_medico_crm' => '',
                'laudo_medico_emissor' => '',
            ]);

        $semCrmResponse->assertStatus(422)
            ->assertJsonPath('message', 'Restrições de severidade Grave/Anafilaxia exigem obrigatoriamente o registro do CRM e nome do médico emissor do laudo.');

        // 2. Cadastrar com dados médicos válidos
        $comCrmResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/merenda/restricoes', [
                'pessoa_id' => $this->aluno->id,
                'tipo_restricao' => 'alergia_alimentar',
                'alimento_alergeno' => 'Amendoim e derivados',
                'severidade' => 'grave_anafilaxia',
                'requer_substituicao_especial' => true,
                'alimento_substituto_recomendado' => 'Fruta da época',
                'laudo_medico_crm' => 'CRM-SP 188.924',
                'laudo_medico_emissor' => 'Dr. Roberto Meireles',
                'laudo_medico_data' => '2026-09-10',
            ]);

        $comCrmResponse->assertStatus(201)
            ->assertJsonPath('data.severidade', 'grave_anafilaxia')
            ->assertJsonPath('data.laudo_medico_crm', 'CRM-SP 188.924');

        // 3. Consultar alertas da escola e verificar que o aluno está listado
        $alertasResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/merenda/restricoes/alertas/escola/{$this->escola->id}");

        $alertasResponse->assertStatus(200)
            ->assertJsonPath('data.0.alimento_alergeno', 'Amendoim e derivados');
    }

    public function test_registro_diario_de_refeicoes_calculo_de_adesao_e_desperdicio(): void
    {
        $payload = [
            'school_id' => $this->escola->id,
            'data_consumo' => '2026-10-23',
            'tipo_refeicao' => 'almoco',
            'total_previsto' => 500,
            'total_servido' => 475,
            'sobra_limpa_kg' => 4.2,
            'resto_ingesta_kg' => 5.8,
            'temperatura_servico_celsius' => 69.5,
            'observacoes' => 'Serviço pontual sem intercorrências',
        ];

        $response = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->postJson('/api/educa/merenda/refeicoes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.total_servido', 475);
        $this->assertEquals(95.0, (float) $response->json('data.taxa_adesao_percentual'));

        // Relatório de Desperdício CAE/FNDE
        $relResponse = $this->actingAs($this->adminUser)
            ->withHeaders($this->authHeaders)
            ->getJson("/api/educa/merenda/refeicoes/relatorios/desperdicio?school_id={$this->escola->id}");

        $relResponse->assertStatus(200)
            ->assertJsonPath('data.total_previsto', 500)
            ->assertJsonPath('data.total_servido', 475);
        $this->assertEquals(10.0, (float) $relResponse->json('data.desperdicio_total_kg'));
    }
}
