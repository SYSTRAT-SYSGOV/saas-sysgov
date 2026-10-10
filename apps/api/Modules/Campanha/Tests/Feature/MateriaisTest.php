<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Lancamento;
use Modules\Campanha\Models\Material;
use Modules\Campanha\Services\AnexoService;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Materiais, estoque, despesa automática e remessas (Fase 2B, grupo 2). */
final class MateriaisTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private function material(Campanha $campanha, int $quantidade = 10000): Material
    {
        return $this->naCampanha($campanha, fn (): Material => Material::create(['tipo' => 'santinho', 'nome' => 'Santinho 7x10', 'quantidade_produzida' => $quantidade, 'valor_total_centavos' => 35000]));
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function remessa(Material $m, int $quantidade, array $extra = []): array
    {
        return ['material_id' => $m->id, 'codigo_ibge' => 4113700, 'quantidade' => $quantidade, 'enviada_em' => '2026-09-15', ...$extra];
    }

    public function test_estoque_apos_remessas_e_exclusao_devolve(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $m = $this->material($campanha);
        $gestao = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);

        $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 3000))->assertCreated();
        $id = $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 2500, ['transportadora' => 'Correios']))->assertCreated()->json('id');
        $gestao()->getJson('/api/campanha/materiais')->assertJsonPath('materiais.0.estoque', 4500)->assertJsonPath('materiais.0.enviado', 5500);

        $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 6000))->assertStatus(422)
            ->assertJsonPath('error', 'Estoque insuficiente: há 4500 unidades de Santinho 7x10.');
        // Editar a própria remessa considera a quantidade dela como disponível.
        $gestao()->putJson("/api/campanha/remessas/{$id}", ['quantidade' => 7000])->assertOk();
        $gestao()->getJson('/api/campanha/materiais')->assertJsonPath('materiais.0.estoque', 0);

        $gestao()->deleteJson("/api/campanha/remessas/{$id}")->assertOk();
        $gestao()->getJson('/api/campanha/materiais')->assertJsonPath('materiais.0.estoque', 7000);
        $gestao()->putJson("/api/campanha/materiais/{$m->id}", ['quantidade_produzida' => 2000])->assertStatus(422);
    }

    public function test_despesa_automatica_e_recusa_sem_financeiro(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $dados = ['tipo' => 'adesivo', 'nome' => 'Adesivo perfurado', 'fornecedor' => 'Gráfica Norte', 'quantidade_produzida' => 5000, 'valor_total_centavos' => 150000, 'lancar_despesa' => true];

        $id = $this->como($this->usuario($tenant), $tenant, $campanha)->postJson('/api/campanha/materiais', $dados)->assertCreated()->json('id');
        $lancamento = $this->naCampanha($campanha, fn () => Lancamento::query()->firstOrFail());
        $this->assertSame(150000, $lancamento->valor_centavos);
        $this->assertSame('despesa', $lancamento->tipo);
        $this->assertSame('publicidade_grafica', $lancamento->categoria);
        $this->assertSame($id, $lancamento->material_id);
        $this->assertSame('Gráfica Norte', $lancamento->contraparte_nome);

        $coord = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($campanha, $coord);
        $this->como($coord, $tenant, $campanha)->postJson('/api/campanha/materiais', [...$dados, 'nome' => 'Outro'])->assertStatus(422)
            ->assertJsonPath('error', 'Lançar a despesa no financeiro exige a permissão do financeiro.');
        $this->assertSame(1, $this->naCampanha($campanha, fn () => Material::query()->count()));
        $this->como($coord, $tenant, $campanha)->postJson('/api/campanha/materiais', [...$dados, 'nome' => 'Outro', 'lancar_despesa' => false])->assertCreated();
        $this->assertSame(1, $this->naCampanha($campanha, fn () => Lancamento::query()->count()));
    }

    public function test_remessa_com_responsavel_entrega_com_foto_e_isolamento(): void
    {
        Storage::fake(AnexoService::DISCO);
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $outra = $this->campanha($tenant, ['nome' => 'Outra']);
        $m = $this->material($campanha);
        $caboDeOutra = $this->naCampanha($outra, fn () => CaboEleitoral::create(['nome' => 'Cabo', 'codigo_ibge' => 4113700]));
        $gestao = fn (?Campanha $c = null) => $this->como($this->usuario($tenant), $tenant, $c ?? $campanha);

        $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 10, ['cabo_id' => $caboDeOutra->id]))->assertStatus(422);
        $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 10, ['codigo_ibge' => 4209102]))->assertStatus(422);
        $id = $gestao()->postJson('/api/campanha/remessas', $this->remessa($m, 1000))->assertCreated()->assertJsonPath('entregue', false)->json('id');

        $gestao()->putJson("/api/campanha/remessas/{$id}", ['entregue_em' => '2026-09-17', 'recebido_por' => 'Coord. Londrina'])->assertOk()->assertJsonPath('entregue', true);
        $gestao()->post("/api/campanha/remessas/{$id}/foto", ['arquivo' => UploadedFile::fake()->image('entrega.jpg')], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('tem_foto', true);
        $gestao()->get("/api/campanha/remessas/{$id}/foto")->assertOk();

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($campanha, $consulta);
        $this->como($consulta, $tenant, $campanha)->getJson('/api/campanha/remessas')->assertOk()->assertJsonCount(1, 'remessas');
        $this->como($consulta, $tenant, $campanha)->get("/api/campanha/remessas/{$id}/foto", ['Accept' => 'application/json'])->assertForbidden();
        $this->como($consulta, $tenant, $campanha)->postJson('/api/campanha/remessas', $this->remessa($m, 1))->assertForbidden();

        $gestao($outra)->getJson('/api/campanha/remessas')->assertJsonCount(0, 'remessas');
        $gestao($outra)->deleteJson("/api/campanha/remessas/{$id}")->assertNotFound();
    }
}
