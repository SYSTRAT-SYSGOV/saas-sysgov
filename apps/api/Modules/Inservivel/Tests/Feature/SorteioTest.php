<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Sorteio;
use Modules\Inservivel\Services\ConfiguracaoService;
use Modules\Inservivel\Services\SorteioService;
use Modules\Inservivel\Services\TermoService;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Sorteio equitativo e auditável; Termos do lote (D8, D9, D15). */
final class SorteioTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** @param list<Entidade> $inscritas */
    private function lotePublicado(Tenant $tenant, array $inscritas = [], string $numero = '1/2026'): Lote
    {
        $bem = $this->bem($tenant, 'S' . $numero);

        return $this->noTenant($tenant, function () use ($bem, $inscritas, $numero): Lote {
            $lote = Lote::query()->create(['numero' => $numero, 'descricao' => 'Cadeiras', 'data_criacao' => '2026-10-01', 'responsavel' => 'Fulano', 'status' => StatusLote::Publicado]);
            $lote->bens()->attach($bem->id, ['tenant_id' => $lote->tenant_id]);
            foreach ($inscritas as $e) {
                Interesse::query()->create(['entidade_id' => $e->id, 'lote_id' => $lote->id, 'ip' => '10.0.0.1']);
            }

            return $lote;
        });
    }

    /** @return \Illuminate\Testing\TestResponse<\Illuminate\Http\JsonResponse> */
    private function sortear(Tenant $tenant, Lote $lote): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->usuario($tenant), $tenant)->postJson("/api/inservivel/lotes/{$lote->id}/sorteio");
    }

    private function sorteioDe(Tenant $tenant, Lote $lote): Sorteio
    {
        return $this->noTenant($tenant, fn (): Sorteio => Sorteio::query()->where('lote_id', $lote->id)->firstOrFail());
    }

    public function test_sem_inscricoes_responde_422(): void
    {
        $tenant = $this->criarTenant();
        $this->sortear($tenant, $this->lotePublicado($tenant))->assertStatus(422)->assertJsonPath('error', 'Nenhuma entidade se inscreveu neste lote.');
    }

    public function test_unica_inscrita_vence_e_gera_relatorio(): void
    {
        $tenant = $this->criarTenant();
        $a = $this->entidade($tenant, base: '111111110001');
        $lote = $this->lotePublicado($tenant, [$a]);

        $this->sortear($tenant, $lote)->assertOk()->assertJsonPath('status', 'sorteado')->assertJsonPath('sorteio.regra', 'unica_inscrita')
            ->assertJsonPath('sorteio.vencedora.id', $a->id)->assertJsonPath('documentos.0.gerado_pelo_sistema', true);
        self::assertSame(1, $a->refresh()->lotes_ganhos);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.LoteSorteado']);
        $this->assertDatabaseHas('audit_logs', ['module' => 'inservivel', 'action' => 'lote.sorteado']);
    }

    public function test_prioridade_para_quem_ganhou_menos(): void
    {
        $tenant = $this->criarTenant();
        $a = $this->entidade($tenant, base: '111111110001', lotesGanhos: 2);
        $b = $this->entidade($tenant, base: '222222220001', lotesGanhos: 0);
        $lote = $this->lotePublicado($tenant, [$a, $b]);

        $this->sortear($tenant, $lote)->assertOk()->assertJsonPath('sorteio.regra', 'menos_lotes')->assertJsonPath('sorteio.vencedora.id', $b->id);
    }

    public function test_empate_e_reproduzido_pela_semente_gravada(): void
    {
        $tenant = $this->criarTenant();
        $entidades = [];
        foreach (['111111110001', '222222220001', '333333330001', '444444440001'] as $base) {
            $entidades[] = $this->entidade($tenant, base: $base);
        }
        $lote = $this->lotePublicado($tenant, $entidades);

        $this->sortear($tenant, $lote)->assertOk()->assertJsonPath('sorteio.regra', 'sorteio_semente');
        $sorteio = $this->sorteioDe($tenant, $lote);
        $empatadas = $sorteio->empatadas ?? [];
        self::assertSame(array_map(fn (Entidade $e): int => $e->id, $entidades), $empatadas);
        self::assertSame(32, strlen((string) $sorteio->semente));

        $indice = SorteioService::indiceSorteado((string) $sorteio->semente, count($empatadas));
        self::assertSame($sorteio->entidade_vencedora_id, $empatadas[$indice]);
        self::assertSame(hash('sha256', implode('|', [$lote->id, $sorteio->semente, implode(',', $empatadas), $sorteio->entidade_vencedora_id])), $sorteio->hash);
        $this->assertDatabaseHas('audit_logs', ['action' => 'lote.sorteado']);
    }

    public function test_inscrita_com_documento_vencido_fica_fora_e_aparece_no_retrato(): void
    {
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $a = $this->entidade($tenant, base: '111111110001', validades: ['certidoes_negativas' => '2026-10-05']);
        $b = $this->entidade($tenant, base: '222222220001', lotesGanhos: 3);
        $lote = $this->lotePublicado($tenant, [$a, $b]);

        $this->sortear($tenant, $lote)->assertOk()->assertJsonPath('sorteio.vencedora.id', $b->id)->assertJsonPath('sorteio.regra', 'unica_inscrita');
        $retrato = $this->sorteioDe($tenant, $lote)->participantes;
        self::assertFalse($retrato[0]['apta']);
        self::assertSame('documento_vencido', $retrato[0]['motivo_exclusao']);
        self::assertSame(['Certidões negativas'], $retrato[0]['documentos_vencidos']);

        $html = $this->noTenant($tenant, fn () => app(TermoService::class)->htmlRelatorioSorteio(Lote::query()->findOrFail($lote->id), $this->sorteioDe($tenant, $lote)));
        self::assertStringContainsString('Excluída: documento vencido (Certidões negativas)', $html);
    }

    public function test_todas_bloqueadas_responde_422_e_lote_segue_publicado(): void
    {
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $a = $this->entidade($tenant, base: '111111110001', validades: ['estatuto_social' => '2026-01-01']);
        $b = $this->entidade($tenant, StatusEntidade::Reprovada, base: '222222220001');
        $lote = $this->lotePublicado($tenant, [$a, $b]);

        $this->sortear($tenant, $lote)->assertStatus(422);
        self::assertSame(StatusLote::Publicado, $this->noTenant($tenant, fn () => Lote::query()->findOrFail($lote->id)->status));
    }

    public function test_sortear_duas_vezes_e_permissao(): void
    {
        $tenant = $this->criarTenant();
        $lote = $this->lotePublicado($tenant, [$this->entidade($tenant)]);
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->postJson("/api/inservivel/lotes/{$lote->id}/sorteio")->assertForbidden();
        $this->sortear($tenant, $lote)->assertOk();
        $this->sortear($tenant, $lote)->assertStatus(422);
    }

    public function test_falha_no_pdf_desfaz_o_sorteio(): void
    {
        $tenant = $this->criarTenant();
        $a = $this->entidade($tenant);
        $lote = $this->lotePublicado($tenant, [$a]);
        View::replaceNamespace('inservivel', [sys_get_temp_dir() . '/inservivel-sem-views']);

        try {
            $this->sortear($tenant, $lote);
        } catch (\Throwable) {
            // O erro de view sobe como 500; o que importa é o estado do banco.
        }
        $this->assertDatabaseCount('inservivel_sorteios', 0);
        self::assertSame(0, $a->refresh()->lotes_ganhos);
        self::assertSame(StatusLote::Publicado, $this->noTenant($tenant, fn () => Lote::query()->findOrFail($lote->id)->status));
    }

    public function test_termos_usam_a_configuracao_e_respeitam_quem_pode_baixar(): void
    {
        $tenant = $this->criarTenant();
        $this->noTenant($tenant, fn () => app(ConfiguracaoService::class)->atualizar([
            'doador_nome' => 'Município de Exemplo', 'doador_cnpj' => '11222333000181', 'doador_cidade' => 'Exemplópolis', 'doador_uf' => 'SP',
            'legislacao' => ['na Lei Municipal nº 100/2025'],
        ]));
        $vencedora = $this->entidade($tenant, base: '111111110001');
        $outra = $this->entidade($tenant, base: '222222220001');
        $lote = $this->lotePublicado($tenant, [$vencedora]);
        $gestor = $this->usuario($tenant);

        $this->como($gestor, $tenant)->get("/api/inservivel/lotes/{$lote->id}/termos/doacao")->assertStatus(422);
        $this->sortear($tenant, $lote)->assertOk();

        $html = $this->noTenant($tenant, fn () => app(TermoService::class)->htmlTermoLote(Lote::query()->findOrFail($lote->id), 'doacao'));
        self::assertStringContainsString('MUNICÍPIO DE EXEMPLO', $html);
        self::assertStringContainsString('na Lei Municipal nº 100/2025', $html);
        self::assertStringContainsString('Exemplópolis', $html);
        self::assertStringNotContainsString('Araucária', $html);

        foreach (array_keys(TermoService::TERMOS_LOTE) as $tipo) {
            $this->como($gestor, $tenant)->get("/api/inservivel/lotes/{$lote->id}/termos/{$tipo}")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        }
        $this->como($this->contaDa($vencedora), $tenant)->get("/api/inservivel/portal/lotes/{$lote->id}/termos/entrega")->assertOk();
        $this->como($this->contaDa($outra), $tenant)->get("/api/inservivel/portal/lotes/{$lote->id}/termos/entrega")->assertNotFound();
    }
}
