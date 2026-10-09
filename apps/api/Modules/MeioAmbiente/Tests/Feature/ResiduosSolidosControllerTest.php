<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class ResiduosSolidosControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_gestor_cadastra_gerador_de_residuos_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Gerador Teste', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR]);

        $resposta->assertCreated();
        self::assertSame(1, GeradorResiduo::count());
    }

    public function test_analista_sem_permissao_de_residuos_e_recusado(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $this->como($analista, $this->tenant)
            ->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Gerador Teste', 'tipo' => GeradorResiduo::TIPO_DOMICILIAR])
            ->assertForbidden();

        self::assertSame(0, GeradorResiduo::count());
    }

    public function test_gestor_registra_entrega_de_logistica_reversa_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $ponto = $this->noTenant($this->tenant, fn () => PontoLogisticaReversa::create([
            'nome' => 'Ponto Praça Central', 'categoria' => PontoLogisticaReversa::CATEGORIA_PILHAS_BATERIAS,
        ]));

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson("/api/meio_ambiente/pontos-logistica-reversa/{$ponto->id}/entregas", ['quantidade_kg' => 12.5]);

        $resposta->assertCreated();
    }

    public function test_lista_geradores_registra_coleta_e_cadastra_ponto(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $geradorId = $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Mercado', 'tipo' => GeradorResiduo::TIPO_COMERCIAL])
            ->assertCreated()->json('id');

        $this->como($gestor, $this->tenant)->getJson('/api/meio_ambiente/geradores-residuo')->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $this->tenant)->postJson("/api/meio_ambiente/geradores-residuo/{$geradorId}/coletas", [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA, 'volume_kg' => 120, 'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM,
        ])->assertCreated();

        $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/pontos-logistica-reversa', ['nome' => 'Ponto Centro', 'categoria' => PontoLogisticaReversa::CATEGORIA_ELETRONICOS])
            ->assertCreated();
        $this->como($gestor, $this->tenant)->getJson('/api/meio_ambiente/pontos-logistica-reversa')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_coleta_com_volume_invalido_e_ponto_sem_categoria_retornam_422(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $geradorId = $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/geradores-residuo', ['nome' => 'Mercado', 'tipo' => GeradorResiduo::TIPO_COMERCIAL])
            ->json('id');

        $this->como($gestor, $this->tenant)->postJson("/api/meio_ambiente/geradores-residuo/{$geradorId}/coletas", [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA, 'volume_kg' => 0, 'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM,
        ])->assertUnprocessable();
        $this->como($gestor, $this->tenant)->postJson('/api/meio_ambiente/pontos-logistica-reversa', ['nome' => 'Sem categoria'])
            ->assertUnprocessable()->assertJsonValidationErrors('categoria');
    }

    public function test_usuario_sem_acesso_nao_lista_geradores_pontos_nem_registra_entrega(): void
    {
        $semPerfil = $this->usuario($this->tenant, [], 'Sem perfil');
        $ponto = $this->noTenant($this->tenant, fn () => PontoLogisticaReversa::create(['nome' => 'Ponto', 'categoria' => PontoLogisticaReversa::CATEGORIA_ELETRONICOS]));

        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/geradores-residuo')->assertForbidden();
        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/pontos-logistica-reversa')->assertForbidden();
        $this->como($semPerfil, $this->tenant)->postJson("/api/meio_ambiente/pontos-logistica-reversa/{$ponto->id}/entregas", ['quantidade_kg' => 1])->assertForbidden();
    }
}
