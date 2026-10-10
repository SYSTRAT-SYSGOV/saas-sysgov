<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Portal da entidade; Validade dos documentos da entidade (D7, D15). */
final class PortalTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function lote(Tenant $tenant, StatusLote $status = StatusLote::Publicado, string $numero = '1/2026'): Lote
    {
        $bem = $this->bem($tenant, 'P' . $numero);

        return $this->noTenant($tenant, function () use ($status, $numero, $bem): Lote {
            $lote = Lote::query()->create(['numero' => $numero, 'descricao' => 'Lote', 'data_criacao' => '2026-10-01', 'responsavel' => 'Fulano', 'status' => $status]);
            $lote->bens()->attach($bem->id, ['tenant_id' => $lote->tenant_id]);

            return $lote;
        });
    }

    public function test_entidade_habilitada_participa_e_desiste(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant);
        $lote = $this->lote($tenant);
        $conta = $this->contaDa($entidade);

        $this->como($conta, $tenant)->getJson('/api/inservivel/portal/lotes')->assertOk()->assertJsonPath('liberado', true)->assertJsonCount(1, 'lotes');
        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertCreated();
        $this->assertDatabaseHas('inservivel_interesses', ['entidade_id' => $entidade->id, 'lote_id' => $lote->id, 'ip' => '127.0.0.1']);
        $this->como($conta, $tenant)->getJson("/api/inservivel/portal/lotes/{$lote->id}")->assertJsonPath('inscrita', true)->assertJsonCount(1, 'bens');
        $this->como($conta, $tenant)->deleteJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertOk();
        $this->assertDatabaseMissing('inservivel_interesses', ['entidade_id' => $entidade->id]);
    }

    public function test_entidade_em_analise_nao_participa_nem_ve_lotes(): void
    {
        $tenant = $this->criarTenant();
        $conta = $this->contaDa($this->entidade($tenant, StatusEntidade::EmAnalise));
        $lote = $this->lote($tenant);

        $this->como($conta, $tenant)->getJson('/api/inservivel/portal/lotes')->assertOk()->assertJsonPath('liberado', false)->assertJsonCount(0, 'lotes');
        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertForbidden();
    }

    public function test_lote_aberto_nao_aparece_e_sorteado_nao_aceita_inscricao(): void
    {
        $tenant = $this->criarTenant();
        $conta = $this->contaDa($this->entidade($tenant));
        $aberto = $this->lote($tenant, StatusLote::Aberto, '1/2026');
        $sorteado = $this->lote($tenant, StatusLote::Sorteado, '2/2026');

        $this->como($conta, $tenant)->getJson("/api/inservivel/portal/lotes/{$aberto->id}")->assertNotFound();
        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$aberto->id}/participacao")->assertNotFound();
        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$sorteado->id}/participacao")->assertStatus(422);
    }

    public function test_documento_de_outra_entidade_responde_404(): void
    {
        $tenant = $this->criarTenant();
        $minha = $this->entidade($tenant, base: '111111110001');
        $outra = $this->entidade($tenant, base: '222222220001');
        $docOutra = $outra->documentos()->firstOrFail();

        $this->como($this->contaDa($minha), $tenant)->get("/api/inservivel/portal/documentos/{$docOutra->id}")->assertNotFound();
    }

    public function test_entidade_edita_cadastro_mas_nao_cnpj_nem_status(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, StatusEntidade::Pendente);

        $this->como($this->contaDa($entidade), $tenant)->putJson('/api/inservivel/portal/me', ['nome_fantasia' => 'Novo nome', 'cnpj' => '00000000000000', 'status' => 'habilitada'])
            ->assertOk()->assertJsonPath('nome_fantasia', 'Novo nome')->assertJsonPath('status', 'pendente')->assertJsonPath('cnpj', $entidade->cnpj);
    }

    public function test_documento_vencido_bloqueia_participacao_e_reenvio_libera(): void
    {
        Storage::fake('local');
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, validades: ['certidoes_negativas' => '2026-10-05']);
        $conta = $this->contaDa($entidade);
        $lote = $this->lote($tenant);

        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertStatus(422)
            ->assertJsonPath('error', 'Documento obrigatório vencido: Certidões negativas (venceu em 05/10/2026). Envie o documento atualizado para voltar a participar.');
        $this->como($conta, $tenant)->getJson('/api/inservivel/portal/me')->assertJsonCount(1, 'bloqueios')->assertJsonPath('alertas_documentos.0.vencido', true);

        $this->como($conta, $tenant)->post('/api/inservivel/portal/documentos', [
            'tipo' => 'certidoes_negativas', 'validade' => '2027-04-01', 'arquivo' => UploadedFile::fake()->create('cnd.pdf', 50, 'application/pdf'),
        ])->assertCreated()->assertJsonCount(0, 'bloqueios');
        $this->como($conta, $tenant)->postJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertCreated();
    }

    public function test_alerta_de_vencimento_proximo(): void
    {
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant, validades: ['estatuto_social' => '2026-10-16']);

        $this->como($this->contaDa($entidade), $tenant)->getJson('/api/inservivel/portal/me')->assertJsonCount(0, 'bloqueios')
            ->assertJsonPath('alertas_documentos.0.vencido', false)->assertJsonPath('alertas_documentos.0.validade', '2026-10-16');
        $this->como($this->usuario($tenant), $tenant)->getJson("/api/inservivel/entidades/{$entidade->id}")->assertJsonCount(1, 'alertas_documentos');
    }

    public function test_inscritas_do_lote_mostram_bloqueio(): void
    {
        Carbon::setTestNow('2026-10-06 10:00:00');
        $tenant = $this->criarTenant();
        $entidade = $this->entidade($tenant);
        $lote = $this->lote($tenant);
        $this->como($this->contaDa($entidade), $tenant)->postJson("/api/inservivel/portal/lotes/{$lote->id}/participacao")->assertCreated();
        $this->noTenant($tenant, fn () => $entidade->documentos()->where('tipo', 'estatuto_social')->update(['validade' => '2026-10-01']));

        $this->como($this->usuario($tenant), $tenant)->getJson("/api/inservivel/lotes/{$lote->id}")
            ->assertJsonCount(1, 'inscricoes')->assertJsonPath('inscricoes.0.bloqueios.0.tipo', 'estatuto_social');
    }

    public function test_servidor_nao_acessa_o_portal(): void
    {
        $tenant = $this->criarTenant();
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->getJson('/api/inservivel/portal/me')->assertForbidden();
    }
}
