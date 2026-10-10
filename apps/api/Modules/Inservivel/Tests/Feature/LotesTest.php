<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Lotes (D4, D5). */
final class LotesTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    /**
     * @param list<int> $bens
     * @return TestResponse<\Illuminate\Http\JsonResponse>
     */
    private function criarLote(User $user, Tenant $tenant, string $numero = '001', array $bens = []): TestResponse
    {
        return $this->como($user, $tenant)->postJson('/api/inservivel/lotes', [
            'numero' => $numero, 'descricao' => 'Mobiliário diverso', 'data_criacao' => '2026-10-06', 'responsavel' => 'Fulano', 'bens' => $bens,
        ]);
    }

    private function papelDe(Tenant $tenant, Bem $bem): ?string
    {
        return $this->noTenant($tenant, fn () => Bem::query()->with('situacao')->findOrFail($bem->id)->situacao->papel?->value);
    }

    public function test_cria_lote_com_numero_completado_e_bens_em_lote(): void
    {
        $tenant = $this->criarTenant();
        $b1 = $this->bem($tenant, '10');
        $b2 = $this->bem($tenant, '11', extra: ['valor_avaliado_cents' => 0, 'valor_contabil_cents' => 7000]);

        $resposta = $this->criarLote($this->usuario($tenant, ['inservivel_servidor']), $tenant, '007', [$b1->id, $b2->id])->assertCreated();
        $resposta->assertJsonPath('numero', '007/' . now()->year)->assertJsonPath('bens_count', 2)
            ->assertJsonPath('valor_cents', 5000 + 7000)->assertJsonPath('status', 'aberto');
        self::assertSame('em_lote', $this->papelDe($tenant, $b1));
    }

    public function test_bem_fora_de_inservivel_nao_entra(): void
    {
        $tenant = $this->criarTenant();
        $disponivel = $this->bem($tenant, '20', PapelSituacao::Disponivel);
        $gestor = $this->usuario($tenant);

        $this->criarLote($gestor, $tenant, '001', [$disponivel->id])->assertStatus(422)->assertJsonFragment(['error' => 'Apenas bens com a situação "Inservível" podem entrar no lote. Fora da situação: 20 (Disponível).']);
        $lote = $this->criarLote($gestor, $tenant, '002')->assertCreated()->json('id');
        $this->como($gestor, $tenant)->postJson("/api/inservivel/lotes/{$lote}/bens", ['numero_patrimonial' => '20'])->assertStatus(422);
    }

    public function test_bem_nao_entra_em_dois_lotes(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, '30');
        $gestor = $this->usuario($tenant);
        $this->criarLote($gestor, $tenant, '001', [$bem->id])->assertCreated();
        $this->criarLote($gestor, $tenant, '002', [$bem->id])->assertStatus(422);
    }

    public function test_adiciona_por_patrimonio_e_retira(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, '2026/000123');
        $gestor = $this->usuario($tenant);
        $lote = $this->criarLote($gestor, $tenant)->json('id');

        $this->como($gestor, $tenant)->postJson("/api/inservivel/lotes/{$lote}/bens", ['numero_patrimonial' => '000123'])->assertOk();
        self::assertSame('em_lote', $this->papelDe($tenant, $bem));
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/lotes/{$lote}/bens/{$bem->id}")->assertOk();
        self::assertSame('inservivel', $this->papelDe($tenant, $bem));
    }

    public function test_servidor_nao_ve_lote_alheio(): void
    {
        $tenant = $this->criarTenant();
        $dono = $this->usuario($tenant, ['inservivel_servidor']);
        $outro = $this->usuario($tenant, ['inservivel_servidor']);
        $lote = $this->criarLote($dono, $tenant)->json('id');

        $this->como($outro, $tenant)->getJson("/api/inservivel/lotes/{$lote}")->assertForbidden();
        $this->como($outro, $tenant)->putJson("/api/inservivel/lotes/{$lote}", ['descricao' => 'x'])->assertForbidden();
        $this->como($outro, $tenant)->getJson('/api/inservivel/lotes')->assertJsonCount(0, 'lotes');
        $this->como($dono, $tenant)->getJson('/api/inservivel/lotes')->assertJsonCount(1, 'lotes');
        $this->como($this->usuario($tenant), $tenant)->getJson('/api/inservivel/lotes')->assertJsonCount(1, 'lotes');
        $this->como($dono, $tenant)->postJson("/api/inservivel/lotes/{$lote}/status", ['status' => 'publicado'])->assertForbidden();
    }

    public function test_ciclo_de_status_e_bens_doados_e_baixados(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, '40');
        $gestor = $this->usuario($tenant);
        $lote = $this->criarLote($gestor, $tenant, '001', [$bem->id])->json('id');
        $status = fn (string $s) => $this->como($gestor, $tenant)->postJson("/api/inservivel/lotes/{$lote}/status", ['status' => $s]);

        $status('sorteado')->assertStatus(422);
        $status('publicado')->assertOk()->assertJsonPath('status', 'publicado');
        $this->como($gestor, $tenant)->postJson("/api/inservivel/lotes/{$lote}/bens", ['numero_patrimonial' => '40'])->assertStatus(422);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.LotePublicado']);

        // Sorteado só pelo sorteio: aqui o teste força o estado para seguir o ciclo.
        $this->noTenant($tenant, fn () => Lote::query()->whereKey($lote)->update(['status' => 'sorteado']));
        $status('entregue')->assertOk();
        self::assertSame('doado', $this->papelDe($tenant, $bem));
        $status('baixado')->assertOk();
        self::assertSame('baixado', $this->papelDe($tenant, $bem));
        $status('aberto')->assertStatus(422);
    }

    public function test_excluir_exige_senha_e_devolve_os_bens(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, '50');
        $gestor = $this->usuario($tenant);
        $lote = $this->criarLote($gestor, $tenant, '001', [$bem->id])->json('id');

        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/lotes/{$lote}", ['senha' => 'errada'])->assertStatus(422);
        $this->assertDatabaseHas('inservivel_lotes', ['id' => $lote]);
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/lotes/{$lote}", ['senha' => 'secret'])->assertOk();
        $this->assertDatabaseMissing('inservivel_lotes', ['id' => $lote]);
        self::assertSame('inservivel', $this->papelDe($tenant, $bem));
    }

    public function test_nao_exclui_lote_sorteado(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $lote = $this->criarLote($gestor, $tenant)->json('id');
        $this->noTenant($tenant, fn () => Lote::query()->whereKey($lote)->update(['status' => 'sorteado']));

        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/lotes/{$lote}", ['senha' => 'secret'])->assertStatus(422);
    }

    public function test_anexo_do_lote_e_historico_no_bem(): void
    {
        Storage::fake('local');
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, '60');
        $gestor = $this->usuario($tenant);
        $lote = $this->criarLote($gestor, $tenant, '001', [$bem->id])->json('id');

        $doc = $this->como($gestor, $tenant)->post("/api/inservivel/lotes/{$lote}/documentos", [
            'nome' => 'Laudo de avaliação', 'arquivo' => UploadedFile::fake()->create('laudo.pdf', 100, 'application/pdf'),
        ])->assertCreated()->json('id');
        $this->como($gestor, $tenant)->get("/api/inservivel/lotes/{$lote}/documentos/{$doc}")->assertOk();
        $this->como($gestor, $tenant)->getJson("/api/inservivel/lotes/{$lote}")->assertJsonPath('documentos.0.nome', 'Laudo de avaliação')
            ->assertJsonPath('permissoes.gerir', true);
        $this->como($gestor, $tenant)->getJson("/api/inservivel/bens/{$bem->id}")->assertJsonPath('lotes.0.id', $lote);
    }
}
